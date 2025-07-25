// server/models/Pasta.ts
import mongoose, { Schema } from 'mongoose';
console.log("--- [server/models/Pasta.ts] Definindo Modelo Pasta (Referência Corrigida) ---");
const pastaSchema = new Schema({
    nome: {
        type: String,
        required: [true, 'O nome da pasta é obrigatório.'],
        trim: true,
        minlength: [1, 'O nome da pasta não pode estar vazio.'],
        maxlength: [100, 'O nome da pasta não pode exceder 100 caracteres.'],
    },
    criadorId: {
        type: Schema.Types.ObjectId,
        ref: 'PersonalTrainer', // <<< CORREÇÃO APLICADA AQUI
        required: true,
    },
    ordem: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});
// Index para otimizar buscas por criadorId e nome
pastaSchema.index({ criadorId: 1, nome: 1 });
pastaSchema.index({ criadorId: 1, ordem: 1 });
export default mongoose.model('PastaTreino', pastaSchema);
