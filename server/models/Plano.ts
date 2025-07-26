// server/models/Plano.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPlano extends Document {
    nome: string;
    descricao?: string;
    limiteAlunos: number;
    preco: number;
    duracao: number; // Duration in days
    tipo: 'free' | 'paid';
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const planoSchema: Schema<IPlano> = new Schema(
    {
        nome: {
            type: String,
            required: [true, 'O nome do plano é obrigatório.'],
            trim: true,
            unique: true,
        },
        descricao: {
            type: String,
            trim: true,
        },
        limiteAlunos: {
            type: Number,
            required: [true, 'O limite de alunos é obrigatório.'],
            min: [0, 'O limite de alunos não pode ser negativo.'],
        },
        preco: {
            type: Number,
            required: [true, 'O preço é obrigatório.'],
            min: [0, 'O preço não pode ser negativo.'],
        },
        duracao: {
            type: Number,
            required: [true, 'A duração é obrigatória.'],
            min: [1, 'A duração deve ser de pelo menos 1 dia.'],
        },
        tipo: {
            type: String,
            required: true,
            enum: ['free', 'paid'],
            default: 'paid',
        },
        ativo: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Plano = mongoose.model<IPlano>('Plano', planoSchema);

export default Plano;