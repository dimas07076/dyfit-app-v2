import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenAssignment extends Document {
    tokenId: string; // ID do token consumido (TokenAvulso ou token de plano)
    studentId: mongoose.Types.ObjectId;
    personalTrainerId: mongoose.Types.ObjectId;
    type: 'plano' | 'avulso';
    validUntil: Date;
    assignedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const tokenAssignmentSchema: Schema<ITokenAssignment> = new Schema(
    {
        tokenId: { type: String, required: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'Aluno', required: true, unique: true },
        personalTrainerId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
        type: { type: String, enum: ['plano', 'avulso'], required: true },
        validUntil: { type: Date, required: true },
        assignedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

tokenAssignmentSchema.index({ personalTrainerId: 1 });

const TokenAssignment = mongoose.model<ITokenAssignment>('TokenAssignment', tokenAssignmentSchema);

export default TokenAssignment;
