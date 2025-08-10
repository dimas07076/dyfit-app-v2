// server/models/Token.ts
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IToken extends Document {
    id: string; // Unique token ID (e.g., TOK-84f1-73b)
    tipo: 'plano' | 'avulso'; // Token type: plan-based or standalone
    personalTrainerId: mongoose.Types.ObjectId;
    alunoId?: mongoose.Types.ObjectId; // Student assigned to this token
    planoId?: mongoose.Types.ObjectId; // Plan this token belongs to (for plan tokens)
    dataExpiracao: Date; // Expiration date
    ativo: boolean; // Active status
    quantidade: number; // Token quantity (kept for backward compatibility)
    
    // Assignment tracking
    dateAssigned?: Date; // When token was assigned to student
    
    // Plan renewal tracking
    renovado?: boolean; // Whether this token was renewed in last renewal cycle
    dataUltimaRenovacao?: Date; // Last renewal date
    
    // Admin tracking
    adicionadoPorAdmin: mongoose.Types.ObjectId;
    motivoAdicao?: string;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    
    // Virtual fields
    status: string; // Virtual field for status
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
            required: [true, 'O ID do Personal Trainer é obrigatório.'],
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
            required: [true, 'A data de expiração é obrigatória.'],
        },
        ativo: {
            type: Boolean,
            default: true,
        },
        quantidade: {
            type: Number,
            required: [true, 'A quantidade de tokens é obrigatória.'],
            min: [1, 'A quantidade deve ser pelo menos 1.'],
            default: 1
        },
        dateAssigned: {
            type: Date,
            default: null,
        },
        renovado: {
            type: Boolean,
            default: false,
        },
        dataUltimaRenovacao: {
            type: Date,
            default: null,
        },
        adicionadoPorAdmin: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
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

// Indexes for efficient queries
tokenSchema.index({ personalTrainerId: 1, ativo: 1 });
tokenSchema.index({ dataExpiracao: 1 });
tokenSchema.index({ alunoId: 1 });
tokenSchema.index({ personalTrainerId: 1, alunoId: 1 });
tokenSchema.index({ planoId: 1 });
tokenSchema.index({ id: 1 }, { unique: true });
tokenSchema.index({ tipo: 1 });

// CRITICAL: Unique index to ensure idempotency - only 1 plan token per student
// This prevents duplicate plan tokens during retries/concurrent requests
tokenSchema.index(
    { alunoId: 1, tipo: 1 }, 
    { 
        unique: true, 
        sparse: true, 
        partialFilterExpression: { 
            tipo: 'plano', 
            alunoId: { $ne: null },
            ativo: true 
        },
        name: 'unique_plan_token_per_student'
    }
);

// Virtual to get status
tokenSchema.virtual('status').get(function(this: IToken) {
    const now = new Date();
    const isExpired = this.dataExpiracao <= now;
    
    if (!this.ativo) return 'Inativo';
    if (isExpired) return 'Expirado';
    if (this.alunoId) return 'Ativo';
    return 'Disponível';
});

// Ensure virtual fields are included in JSON
tokenSchema.set('toJSON', { virtuals: true });

const Token = mongoose.model<IToken>('Token', tokenSchema);

export default Token;