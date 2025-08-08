// server/models/Token.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IToken extends Document {
    id: string;
    type: 'Plano' | 'Avulso';
    personalId: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId | null;
    expirationDate: Date;
    status: 'Ativo' | 'Expirado';
    createdAt: Date;
    updatedAt: Date;
}

const tokenSchema: Schema<IToken> = new Schema(
    {
        type: {
            type: String,
            required: [true, 'O tipo do token é obrigatório.'],
            enum: ['Plano', 'Avulso'],
            index: true
        },
        personalId: {
            type: Schema.Types.ObjectId,
            ref: 'PersonalTrainer',
            required: [true, 'O ID do Personal Trainer é obrigatório.'],
            index: true
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Aluno',
            default: null,
            index: true
        },
        expirationDate: {
            type: Date,
            required: [true, 'A data de expiração é obrigatória.'],
            index: true
        },
        status: {
            type: String,
            required: [true, 'O status é obrigatório.'],
            enum: ['Ativo', 'Expirado'],
            default: 'Ativo',
            index: true
        }
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
        toJSON: {
            transform: function(_doc: any, ret: any) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

// Compound indexes for efficient queries as specified in requirements
tokenSchema.index({ personalId: 1, status: 1, type: 1 });
tokenSchema.index({ personalId: 1, studentId: 1 });
tokenSchema.index({ expirationDate: 1 });

// Virtual to ensure ID is always a string as specified
tokenSchema.virtual('id').get(function(this: any) {
    return this._id.toHexString();
});

// Middleware to automatically update status based on expiration date
tokenSchema.pre('save', function(next) {
    const now = new Date();
    
    if (this.expirationDate <= now) {
        this.status = 'Expirado';
    } else {
        this.status = 'Ativo';
    }
    
    next();
});

// Static method to update expired tokens (can be called periodically)
tokenSchema.statics.updateExpiredTokens = async function() {
    const now = new Date();
    
    const result = await this.updateMany(
        { 
            expirationDate: { $lte: now },
            status: 'Ativo'
        },
        { 
            status: 'Expirado'
        }
    );
    
    return result.modifiedCount;
};

// Instance method to check if token is valid
tokenSchema.methods.isValid = function(): boolean {
    const now = new Date();
    return this.status === 'Ativo' && this.expirationDate > now;
};

// Instance method to check if token is available (not assigned)
tokenSchema.methods.isAvailable = function(): boolean {
    return this.isValid() && !this.studentId;
};

// Instance method to assign token to student (idempotent)
tokenSchema.methods.assignToStudent = function(studentId: string): boolean {
    if (!this.isAvailable() && this.studentId?.toString() !== studentId) {
        return false; // Token is not available or already assigned to different student
    }
    
    this.studentId = new mongoose.Types.ObjectId(studentId);
    return true;
};

const Token = mongoose.model<IToken>('Token', tokenSchema);

export default Token;