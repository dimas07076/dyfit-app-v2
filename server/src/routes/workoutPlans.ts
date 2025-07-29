// server/src/routes/workoutPlans.ts
import express, { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import WorkoutPlan from "../../models/WorkoutPlan.js";
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// GET all workout plans for a trainer
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ message: "User not authenticated." });

    const query: any = { trainerId: new Types.ObjectId(trainerId) };
    
    if (req.query.trainerId) {
      query.trainerId = new Types.ObjectId(req.query.trainerId as string);
    }

    const workoutPlans = await WorkoutPlan.find(query)
      .sort({ updatedAt: -1 });

    res.status(200).json(workoutPlans);
  } catch (error) {
    next(error);
  }
});

// GET a single workout plan by ID
router.get("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    const trainerId = req.user?.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid workout plan ID." });
    }
    if (!trainerId) {
      return res.status(401).json({ message: "User not authenticated." });
    }

    const workoutPlan = await WorkoutPlan.findOne({ 
      _id: id, 
      trainerId: new Types.ObjectId(trainerId) 
    });

    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found or no permission." });
    }

    res.status(200).json(workoutPlan);
  } catch (error) {
    next(error);
  }
});

// POST create a new workout plan
router.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ message: "User not authenticated." });

    const workoutPlanData = { 
      ...req.body, 
      trainerId: new Types.ObjectId(trainerId) 
    };
    
    const newWorkoutPlan = new WorkoutPlan(workoutPlanData);
    await newWorkoutPlan.save();

    res.status(201).json(newWorkoutPlan);
  } catch (error) {
    next(error);
  }
});

// PUT update a workout plan
router.put("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    const trainerId = req.user?.id;
    
    if (!mongoose.Types.ObjectId.isValid(id) || !trainerId) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const workoutPlan = await WorkoutPlan.findOneAndUpdate(
      { _id: id, trainerId: new Types.ObjectId(trainerId) },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found or no permission." });
    }
    
    res.status(200).json(workoutPlan);
  } catch (error) {
    next(error);
  }
});

// GET exercises for a workout plan
router.get("/:id/exercises", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    const { id: workoutPlanId } = req.params;

    if (!trainerId) return res.status(401).json({ message: "User not authenticated." });
    if (!mongoose.Types.ObjectId.isValid(workoutPlanId)) {
      return res.status(400).json({ message: "Invalid workout plan ID." });
    }

    // Verify that the workout plan belongs to the trainer
    const workoutPlan = await WorkoutPlan.findOne({
      _id: workoutPlanId,
      trainerId: new Types.ObjectId(trainerId)
    });

    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found or no permission." });
    }

    // Import WorkoutExercise model
    const { default: WorkoutExercise } = await import("../../models/WorkoutExercise.js");
    
    const exercises = await WorkoutExercise.find({ 
      workoutPlanId: new Types.ObjectId(workoutPlanId) 
    })
    .populate('exerciseId', 'name muscleGroup category description')
    .sort({ order: 1 });

    res.status(200).json(exercises);
  } catch (error) {
    next(error);
  }
});

// DELETE a workout plan
router.delete("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    const trainerId = req.user?.id;
    
    if (!mongoose.Types.ObjectId.isValid(id) || !trainerId) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const result = await WorkoutPlan.findOneAndDelete({ 
      _id: id, 
      trainerId: new Types.ObjectId(trainerId) 
    });
    
    if (!result) {
      return res.status(404).json({ message: "Workout plan not found or no permission." });
    }
    
    res.status(200).json({ message: "Workout plan deleted successfully." });
  } catch (error) {
    next(error);
  }
});

export default router;