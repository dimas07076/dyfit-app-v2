// server/src/routes/workoutExercises.ts
import express, { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import WorkoutExercise from "../../models/WorkoutExercise.js";
import WorkoutPlan from "../../models/WorkoutPlan.js";
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// GET exercises for a workout plan
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    const { workoutPlanId } = req.query;

    if (!trainerId) return res.status(401).json({ message: "User not authenticated." });
    if (!workoutPlanId || !mongoose.Types.ObjectId.isValid(workoutPlanId as string)) {
      return res.status(400).json({ message: "Valid workoutPlanId is required." });
    }

    // Verify that the workout plan belongs to the trainer
    const workoutPlan = await WorkoutPlan.findOne({
      _id: workoutPlanId,
      trainerId: new Types.ObjectId(trainerId)
    });

    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found or no permission." });
    }

    const exercises = await WorkoutExercise.find({ 
      workoutPlanId: new Types.ObjectId(workoutPlanId as string) 
    })
    .populate('exerciseId', 'name muscleGroup category description')
    .sort({ order: 1 });

    res.status(200).json(exercises);
  } catch (error) {
    next(error);
  }
});

// GET exercises for a specific workout plan (alternative route)
router.get("/workout-plan/:workoutPlanId", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    const { workoutPlanId } = req.params;

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

// POST add a new exercise to a workout plan
router.post("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ message: "User not authenticated." });

    const { workoutPlanId } = req.body;
    if (!workoutPlanId || !mongoose.Types.ObjectId.isValid(workoutPlanId)) {
      return res.status(400).json({ message: "Valid workoutPlanId is required." });
    }

    // Verify that the workout plan belongs to the trainer
    const workoutPlan = await WorkoutPlan.findOne({
      _id: workoutPlanId,
      trainerId: new Types.ObjectId(trainerId)
    });

    if (!workoutPlan) {
      return res.status(404).json({ message: "Workout plan not found or no permission." });
    }

    const workoutExercise = new WorkoutExercise(req.body);
    await workoutExercise.save();

    const populatedExercise = await WorkoutExercise.findById(workoutExercise._id)
      .populate('exerciseId', 'name muscleGroup category description');

    res.status(201).json(populatedExercise);
  } catch (error) {
    next(error);
  }
});

// PUT update a workout exercise
router.put("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    const trainerId = req.user?.id;
    
    if (!mongoose.Types.ObjectId.isValid(id) || !trainerId) {
      return res.status(400).json({ message: "Invalid request." });
    }

    // Find the exercise and verify ownership through workout plan
    const existingExercise = await WorkoutExercise.findById(id).populate('workoutPlanId');
    if (!existingExercise) {
      return res.status(404).json({ message: "Workout exercise not found." });
    }

    const workoutPlan = await WorkoutPlan.findOne({
      _id: existingExercise.workoutPlanId,
      trainerId: new Types.ObjectId(trainerId)
    });

    if (!workoutPlan) {
      return res.status(404).json({ message: "No permission to modify this exercise." });
    }

    const updatedExercise = await WorkoutExercise.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('exerciseId', 'name muscleGroup category description');

    res.status(200).json(updatedExercise);
  } catch (error) {
    next(error);
  }
});

// DELETE remove an exercise from a workout plan
router.delete("/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    const trainerId = req.user?.id;
    
    if (!mongoose.Types.ObjectId.isValid(id) || !trainerId) {
      return res.status(400).json({ message: "Invalid request." });
    }

    // Find the exercise and verify ownership through workout plan
    const existingExercise = await WorkoutExercise.findById(id);
    if (!existingExercise) {
      return res.status(404).json({ message: "Workout exercise not found." });
    }

    const workoutPlan = await WorkoutPlan.findOne({
      _id: existingExercise.workoutPlanId,
      trainerId: new Types.ObjectId(trainerId)
    });

    if (!workoutPlan) {
      return res.status(404).json({ message: "No permission to delete this exercise." });
    }

    await WorkoutExercise.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Workout exercise deleted successfully." });
  } catch (error) {
    next(error);
  }
});

// PUT update combined group for multiple exercises
router.put("/combine", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const trainerId = req.user?.id;
    const { exerciseIds, grupoCombinado } = req.body;
    
    if (!trainerId) return res.status(401).json({ message: "User not authenticated." });
    if (!exerciseIds || !Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return res.status(400).json({ message: "Valid exerciseIds array is required." });
    }

    // Verify all exercises belong to workout plans owned by the trainer
    const exercises = await WorkoutExercise.find({ 
      _id: { $in: exerciseIds.map(id => new Types.ObjectId(id)) } 
    });

    if (exercises.length !== exerciseIds.length) {
      return res.status(404).json({ message: "Some exercises not found." });
    }

    // Get all workout plan IDs and verify ownership
    const workoutPlanIds = exercises.map(ex => ex.workoutPlanId);
    const workoutPlans = await WorkoutPlan.find({
      _id: { $in: workoutPlanIds },
      trainerId: new Types.ObjectId(trainerId)
    });

    if (workoutPlans.length !== new Set(workoutPlanIds.map(id => id.toString())).size) {
      return res.status(403).json({ message: "No permission to modify some exercises." });
    }

    // Update the exercises with the combined group
    await WorkoutExercise.updateMany(
      { _id: { $in: exerciseIds.map(id => new Types.ObjectId(id)) } },
      { $set: { grupoCombinado } }
    );

    const updatedExercises = await WorkoutExercise.find({ 
      _id: { $in: exerciseIds.map(id => new Types.ObjectId(id)) } 
    }).populate('exerciseId', 'name muscleGroup category description');

    res.status(200).json(updatedExercises);
  } catch (error) {
    next(error);
  }
});

export default router;