// server/models/PersonalPlano.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPersonalPlano extends Document {
    personalId: mongoose.Types.ObjectId;
    planoTipo: 'Free' | 'Start' | 'Pro' | 'Elite' | 'Master';
    limiteAlunos: number;
    dataInicio: Date;
    dataFim: Date;
    status: 'ativo' | 'inativo' | 'expirado';
    preco?: number;
    // Legacy fields for compatibility  
    personalTrainerId?: mongoose.Types.ObjectId; // Alias for personalId
    planoId?: mongoose.Types.ObjectId; // Reference to Plano document
    dataVencimento?: Date; // Alias for dataFim
    ativo?: boolean; // Computed from status
    atribuidoPorAdmin?: mongoose.Types.ObjectId;
    motivoAtribuicao?: string;
    createdAt: Date;
    updatedAt: Date;
}

const personalPlanoSchema: Schema<IPersonalPlano> = new Schema(
    {
        personalId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'O ID do Personal Trainer é obrigatório.'],
        },
        planoTipo: {
            type: String,
            required: [true, 'O tipo do plano é obrigatório.'],
            enum: ['Free', 'Start', 'Pro', 'Elite', 'Master'],
        },
        limiteAlunos: {
            type: Number,
            required: [true, 'O limite de alunos é obrigatório.'],
            min: [0, 'O limite de alunos não pode ser negativo.'],
        },
        dataInicio: {
            type: Date,
            required: [true, 'A data de início é obrigatória.'],
            default: Date.now,
        },
        dataFim: {
            type: Date,
            required: [true, 'A data de fim é obrigatória.'],
        },
        status: {
            type: String,
            required: true,
            enum: ['ativo', 'inativo', 'expirado'],
            default: 'ativo',
        },
        preco: {
            type: Number,
            required: false,
            min: [0, 'O preço não pode ser negativo.'],
        },
        // Legacy compatibility fields
        personalTrainerId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: false,
        },
        planoId: {
            type: Schema.Types.ObjectId,
            ref: 'Plano',
            required: false,
        },
        dataVencimento: {
            type: Date,
            required: false,
        },
        ativo: {
            type: Boolean,
            default: true,
        },
        atribuidoPorAdmin: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: false,
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

// Sync legacy fields with new ones
personalPlanoSchema.pre('save', function() {
    // Sync personalTrainerId with personalId
    if (this.personalId && !this.personalTrainerId) {
        this.personalTrainerId = this.personalId;
    } else if (this.personalTrainerId && !this.personalId) {
        this.personalId = this.personalTrainerId;
    }
    
    // Sync dataVencimento with dataFim
    if (this.dataFim && !this.dataVencimento) {
        this.dataVencimento = this.dataFim;
    } else if (this.dataVencimento && !this.dataFim) {
        this.dataFim = this.dataVencimento;
    }
    
    // Sync status with ativo
    if (this.status === 'ativo') {
        this.ativo = true;
    } else {
        this.ativo = false;
    }
});

// Index for efficient queries
personalPlanoSchema.index({ personalId: 1, status: 1 });
personalPlanoSchema.index({ personalTrainerId: 1, ativo: 1 }); // Legacy compatibility
personalPlanoSchema.index({ dataFim: 1 });
personalPlanoSchema.index({ dataVencimento: 1 }); // Legacy compatibility

const PersonalPlano = mongoose.model<IPersonalPlano>('PersonalPlano', personalPlanoSchema);

export default PersonalPlano;