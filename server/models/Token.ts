// server/models/Token.ts
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IToken extends Document {
    id: string;
    tipo: 'plano' | 'avulso';
    personalTrainerId: mongoose.Types.ObjectId;
    alunoId?: mongoose.Types.ObjectId;
    planoId?: mongoose.Types.ObjectId;
    dataExpiracao: Date;
    ativo: boolean;
    quantidade: number;
    dateAssigned?: Date;
    adicionadoPorAdmin: mongoose.Types.ObjectId;
    motivoAdicao?: string;
    createdAt: Date;
    updatedAt: Date;
}

const tokenSchema: Schema<IToken> = new Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            default: () => `TOK-${uuidv4().substring(0, 8)}`
        },
        tipo: {
            type: String,
            required: true,
            enum: ['plano', 'avulso'],
        },
        personalTrainerId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: true,
        },
        alunoId: {
            type: Schema.Types.ObjectId,
            ref: 'Aluno',
            default: null,
        },
        planoId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalPlano',
            default: null,
        },
        dataExpiracao: {
            type: Date,
            required: true,
        },
        ativo: {
            type: Boolean,
            default: true,
        },
        quantidade: {
            type: Number,
            required: true,
            default: 1
        },
        dateAssigned: {
            type: Date,
            default: null,
        },
        adicionadoPorAdmin: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: true,
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

// Índices para otimizar buscas
tokenSchema.index({ personalTrainerId: 1, alunoId: 1 });
tokenSchema.index({ alunoId: 1 });

const Token = mongoose.model<IToken>('Token', tokenSchema);

export default Token;