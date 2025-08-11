// server/models/TokenAvulso.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenAvulso extends Document {
    personalTrainerId: mongoose.Types.ObjectId;
    quantidade: number;
    dataVencimento: Date;
    ativo: boolean;
    motivoAdicao?: string;
    adicionadoPorAdmin: mongoose.Types.ObjectId;
    assignedToStudentId?: mongoose.Types.ObjectId; // <-- CAMPO ADICIONADO
    dateAssigned?: Date;                           // <-- CAMPO ADICIONADO
    createdAt: Date;
    updatedAt: Date;
}

const tokenAvulsoSchema: Schema<ITokenAvulso> = new Schema(
    {
        personalTrainerId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'O ID do Personal Trainer é obrigatório.'],
        },
        quantidade: {
            type: Number,
            required: [true, 'A quantidade de tokens é obrigatória.'],
            min: [1, 'A quantidade deve ser pelo menos 1.'],
        },
        dataVencimento: {
            type: Date,
            required: [true, 'A data de vencimento é obrigatória.'],
        },
        ativo: {
            type: Boolean,
            default: true,
        },
        motivoAdicao: {
            type: String,
            trim: true,
        },
        adicionadoPorAdmin: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'O ID do admin é obrigatório.'],
        },
        assignedToStudentId: { // <-- CAMPO ADICIONADO
            type: Schema.Types.ObjectId,
            ref: 'Aluno',
            default: null,
        },
        dateAssigned: { // <-- CAMPO ADICIONADO
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Índices
tokenAvulsoSchema.index({ personalTrainerId: 1, ativo: 1 });
tokenAvulsoSchema.index({ dataVencimento: 1 });
tokenAvulsoSchema.index({ assignedToStudentId: 1 }); // <-- ÍNDICE ADICIONADO

const TokenAvulso = mongoose.model<ITokenAvulso>('TokenAvulso', tokenAvulsoSchema);

export default TokenAvulso;