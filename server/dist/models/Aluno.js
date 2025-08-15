// server/models/Aluno.ts
import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcryptjs';
const alunoSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome completo é obrigatório'],
        trim: true
    },
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
    status: {
        type: String,
        required: true,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    notes: { type: String },
    trainerId: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalTrainer',
        required: [true, 'O ID do treinador é obrigatório']
    },
    // Novos campos para armazenar a vaga (slot) do aluno
    slotType: { type: String, enum: ['plan', 'token'] },
    slotId: { type: Schema.Types.ObjectId },
    slotStartDate: { type: Date },
    slotEndDate: { type: Date },
}, {
    timestamps: true
});
// Hash de senha antes de salvar
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
// Método para comparar senha
alunoSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) {
        return false;
    }
    return bcrypt.compare(candidatePassword, this.passwordHash);
};
export default mongoose.model("Aluno", alunoSchema);
