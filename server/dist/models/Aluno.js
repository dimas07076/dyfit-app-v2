// server/models/Aluno.ts
import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcryptjs';
const alunoSchema = new Schema({
    nome: { type: String, required: [true, 'O nome completo é obrigatório'], trim: true },
    email: {
        type: String,
        required: [true, 'O email é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: [true, 'A senha é obrigatória'],
        select: false,
    },
    phone: { type: String, trim: true },
    // <<< CORREÇÃO: Removida a obrigatoriedade (required: true) dos campos abaixo >>>
    birthDate: { type: String },
    gender: { type: String },
    goal: { type: String },
    weight: { type: Number },
    height: { type: Number },
    startDate: { type: String },
    status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String },
    trainerId: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalTrainer',
        required: [true, 'O ID do treinador é obrigatório']
    },
    // New fields for slot consumption tracking
    consumoFonte: {
        type: String,
        enum: ['plano', 'token'],
        required: false
    },
    consumidoDoPlanoId: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalPlano',
        required: false
    },
    consumidoDoTokenId: {
        type: Schema.Types.ObjectId,
        ref: 'TokenAvulso',
        required: false
    },
    validadeAcesso: {
        type: Date,
        required: false
    },
    dataAssociacao: {
        type: Date,
        required: false
    },
}, {
    timestamps: true
});
alunoSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }
    try {
        const saltRounds = 10;
        if (this.passwordHash) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
alunoSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.passwordHash);
};
export default mongoose.model("Aluno", alunoSchema);
