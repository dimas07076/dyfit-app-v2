// server/models/ConvitePersonal.ts
import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
const ConvitePersonalSchema = new Schema({
    token: {
        type: String,
        unique: true,
        required: true,
    },
    emailConvidado: {
        type: String,
        lowercase: true,
        trim: true,
        // Não é obrigatório, convite pode ser genérico
    },
    roleConvidado: {
        type: String,
        required: true,
        enum: ['Personal Trainer', 'Admin'],
        default: 'Personal Trainer',
    },
    status: {
        type: String,
        required: true,
        enum: ['pendente', 'utilizado', 'expirado'],
        default: 'pendente',
    },
    dataExpiracao: {
        type: Date,
        // Pode ser definido para expirar, por exemplo, em 7 dias
    },
    criadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalTrainer', // Referencia o modelo de quem pode criar convites (Admin)
        required: true,
    },
    usadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalTrainer', // Referencia o modelo do usuário que se registrou com este convite
    },
    dataUtilizacao: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Hook pre-save para gerar o token automaticamente se não fornecido
// (embora geralmente o token seja gerado na lógica da rota e passado para o modelo)
ConvitePersonalSchema.pre('validate', function (next) {
    if (!this.token) {
        this.token = crypto.randomBytes(20).toString('hex');
    }
    // Se não houver data de expiração, define para 7 dias a partir de agora, por exemplo
    if (!this.dataExpiracao) {
        const umaSemanaEmMs = 7 * 24 * 60 * 60 * 1000;
        this.dataExpiracao = new Date(Date.now() + umaSemanaEmMs);
    }
    next();
});
const ConvitePersonal = mongoose.model('ConvitePersonal', ConvitePersonalSchema);
export default ConvitePersonal;
