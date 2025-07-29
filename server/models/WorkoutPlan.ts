// server/models/WorkoutPlan.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWorkoutPlan extends Document {
  name: string;
  description?: string;
  trainerId: Types.ObjectId;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  trainerId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
  status: { type: String, required: true, enum: ['active', 'draft', 'archived'], default: 'active' },
}, {
  timestamps: true
});

WorkoutPlanSchema.index({ trainerId: 1, status: 1 });

export default mongoose.model<IWorkoutPlan>("WorkoutPlan", WorkoutPlanSchema);