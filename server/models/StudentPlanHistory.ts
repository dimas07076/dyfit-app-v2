// server/models/StudentPlanHistory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentPlanHistory extends Document {
    personalTrainerId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    previousPlanId: mongoose.Types.ObjectId;
    tokenId?: mongoose.Types.ObjectId; // The token that was assigned to this student
    dateActivated: Date; // When the student was first activated with this plan
    dateDeactivated: Date; // When the student became inactive (plan expiration or manual deactivation)
    reason: 'plan_expired' | 'manual_deactivation' | 'plan_changed' | 'token_expired';
    wasActive: boolean; // True if student was active when plan transitioned
    canBeReactivated: boolean; // Whether this student is eligible for automatic reactivation
    createdAt: Date;
    updatedAt: Date;
}

const studentPlanHistorySchema: Schema<IStudentPlanHistory> = new Schema(
    {
        personalTrainerId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'Personal trainer ID é obrigatório'],
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Aluno',
            required: [true, 'Student ID é obrigatório'],
        },
        previousPlanId: {
            type: Schema.Types.ObjectId,
            ref: 'Plano',
            required: [true, 'Previous plan ID é obrigatório'],
        },
        tokenId: {
            type: Schema.Types.ObjectId,
            ref: 'TokenAvulso',
            default: null,
        },
        dateActivated: {
            type: Date,
            required: [true, 'Date activated é obrigatório'],
        },
        dateDeactivated: {
            type: Date,
            required: [true, 'Date deactivated é obrigatório'],
        },
        reason: {
            type: String,
            required: [true, 'Reason é obrigatório'],
            enum: ['plan_expired', 'manual_deactivation', 'plan_changed', 'token_expired'],
        },
        wasActive: {
            type: Boolean,
            required: [true, 'Was active flag é obrigatório'],
        },
        canBeReactivated: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient queries
studentPlanHistorySchema.index({ personalTrainerId: 1, dateDeactivated: -1 });
studentPlanHistorySchema.index({ studentId: 1, dateDeactivated: -1 });
studentPlanHistorySchema.index({ personalTrainerId: 1, previousPlanId: 1 });
studentPlanHistorySchema.index({ personalTrainerId: 1, wasActive: 1, canBeReactivated: 1 });

const StudentPlanHistory = mongoose.model<IStudentPlanHistory>('StudentPlanHistory', studentPlanHistorySchema);

export default StudentPlanHistory;