// server/models/TokenAvulso.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenAvulso extends Document {
    personalId: mongoose.Types.ObjectId;
    alunoId?: mongoose.Types.ObjectId;
    status: 'disponivel' | 'utilizado' | 'expirado';
    dataEmissao: Date;
    dataExpiracao: Date;
    preco?: number;
    // Admin tracking fields
    adicionadoPorAdmin: mongoose.Types.ObjectId;
    motivoAdicao?: string;
    createdAt: Date;
    updatedAt: Date;
}

const tokenAvulsoSchema: Schema<ITokenAvulso> = new Schema(
    {
        personalId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'O ID do Personal Trainer é obrigatório.'],
        },
        alunoId: {
            type: Schema.Types.ObjectId,
            ref: 'Aluno',
            required: false,
        },
        status: {
            type: String,
            required: true,
            enum: ['disponivel', 'utilizado', 'expirado'],
            default: 'disponivel',
        },
        dataEmissao: {
            type: Date,
            required: true,
            default: Date.now,
        },
        dataExpiracao: {
            type: Date,
            required: [true, 'A data de expiração é obrigatória.'],
        },
        preco: {
            type: Number,
            required: false,
            min: [0, 'O preço não pode ser negativo.'],
        },
        adicionadoPorAdmin: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer', // Assuming admin is also a PersonalTrainer with role 'Admin'
            required: [true, 'O ID do admin é obrigatório.'],
        },
        motivoAdicao: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
tokenAvulsoSchema.index({ personalId: 1, status: 1 });
tokenAvulsoSchema.index({ dataExpiracao: 1 });
tokenAvulsoSchema.index({ personalId: 1, status: 1, dataExpiracao: 1 });

const TokenAvulso = mongoose.model<ITokenAvulso>('TokenAvulso', tokenAvulsoSchema);

export default TokenAvulso;