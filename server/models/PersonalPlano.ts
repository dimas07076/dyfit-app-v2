// server/models/PersonalPlano.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPersonalPlano extends Document {
    personalTrainerId: mongoose.Types.ObjectId;
    planoId: mongoose.Types.ObjectId;
    dataInicio: Date;
    dataVencimento: Date;
    ativo: boolean;
    atribuidoPorAdmin?: mongoose.Types.ObjectId; // ID do admin que atribuiu (optional for automatic activations)
    motivoAtribuicao?: string;
    createdAt: Date;
    updatedAt: Date;
}

const personalPlanoSchema: Schema<IPersonalPlano> = new Schema(
    {
        personalTrainerId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'O ID do Personal Trainer é obrigatório.'],
        },
        planoId: {
            type: Schema.Types.ObjectId,
            ref: 'Plano',
            required: [true, 'O ID do plano é obrigatório.'],
        },
        dataInicio: {
            type: Date,
            required: [true, 'A data de início é obrigatória.'],
            default: Date.now,
        },
        dataVencimento: {
            type: Date,
            required: [true, 'A data de vencimento é obrigatória.'],
        },
        ativo: {
            type: Boolean,
            default: true,
        },
        atribuidoPorAdmin: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer', // Assuming admin is also a PersonalTrainer with role 'Admin'
            required: false, // Optional to allow automatic activations (like Free plan)
        },
        motivoAtribuicao: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
personalPlanoSchema.index({ personalTrainerId: 1, ativo: 1 });
personalPlanoSchema.index({ dataVencimento: 1 });
personalPlanoSchema.index({ personalTrainerId: 1, dataVencimento: 1 });

const PersonalPlano = mongoose.model<IPersonalPlano>('PersonalPlano', personalPlanoSchema);

export default PersonalPlano;