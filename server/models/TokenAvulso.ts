// server/models/TokenAvulso.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenAvulso extends Document {
    personalTrainerId: mongoose.Types.ObjectId;
    quantidade: number;
    dataVencimento: Date;
    ativo: boolean;
    motivoAdicao?: string;
    adicionadoPorAdmin: mongoose.Types.ObjectId; // ID do admin que adicionou
    assignedToStudentId?: mongoose.Types.ObjectId; // ID do aluno ao qual este token foi atribuído
    dateAssigned?: Date; // Data em que o token foi atribuído ao aluno
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
            ref: 'PersonalTrainer', // Assuming admin is also a PersonalTrainer with role 'Admin'
            required: [true, 'O ID do admin é obrigatório.'],
        },
        assignedToStudentId: {
            type: Schema.Types.ObjectId,
            ref: 'Aluno',
            default: null,
        },
        dateAssigned: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
tokenAvulsoSchema.index({ personalTrainerId: 1, ativo: 1 });
tokenAvulsoSchema.index({ dataVencimento: 1 });
tokenAvulsoSchema.index({ assignedToStudentId: 1 });
tokenAvulsoSchema.index({ personalTrainerId: 1, assignedToStudentId: 1 });

const TokenAvulso = mongoose.model<ITokenAvulso>('TokenAvulso', tokenAvulsoSchema);

export default TokenAvulso;