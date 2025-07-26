// server/models/ConviteAluno.ts
import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
const ConviteAlunoSchema = new Schema({
    token: {
        type: String,
        unique: true,
        required: true,
        default: () => crypto.randomBytes(20).toString('hex'),
    },
    emailConvidado: {
        type: String,
        required: false, // Alterado para opcional
        lowercase: true,
        trim: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['pendente', 'utilizado', 'expirado'],
        default: 'pendente',
    },
    dataExpiracao: {
        type: Date,
        required: true,
        // Expira em 7 dias por padrão
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    criadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalTrainer',
        required: true,
    },
    usadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'Aluno',
    },
}, {
    timestamps: true,
});
const ConviteAluno = mongoose.model('ConviteAluno', ConviteAlunoSchema);
export default ConviteAluno;
