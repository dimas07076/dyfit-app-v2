// server/models/WorkoutExercise.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWorkoutExercise extends Document {
  workoutPlanId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  sets: number;
  reps: number;
  rest: number;
  notes?: string;
  order: number;
  grupoCombinado?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutExerciseSchema = new Schema<IWorkoutExercise>({
  workoutPlanId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan', required: true },
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercicio', required: true },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  rest: { type: Number, required: true },
  notes: { type: String, trim: true },
  order: { type: Number, required: true, default: 0 },
  grupoCombinado: { type: String, trim: true, default: null },
}, {
  timestamps: true
});

WorkoutExerciseSchema.index({ workoutPlanId: 1, order: 1 });
WorkoutExerciseSchema.index({ grupoCombinado: 1 });

export default mongoose.model<IWorkoutExercise>("WorkoutExercise", WorkoutExerciseSchema);