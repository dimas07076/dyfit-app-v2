// Caminho: ./server/models/Exercicio.ts
import mongoose, { Schema } from "mongoose";
const ExercicioSchema = new Schema({
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    categoria: { type: String, trim: true },
    grupoMuscular: { type: String, trim: true, index: true }, // Principal grupo muscular trabalhado - MANTÉM ESTE
    tipo: { type: String, trim: true },
    urlVideo: { type: String, trim: true },
    isCustom: { type: Boolean, required: true, default: false },
    creatorId: {
        type: Schema.Types.ObjectId,
        ref: "PersonalTrainer",
        required: function () { return this.isCustom; }
    },
    favoritedBy: [{
            type: Schema.Types.ObjectId,
            ref: "PersonalTrainer"
        }],
}, {
    timestamps: true
});
// Índice para busca por nome (case-insensitive)
ExercicioSchema.index({ nome: 'text' });
// ExercicioSchema.index({ grupoMuscular: 1 }); // <<< REMOVER ESTA LINHA
ExercicioSchema.index({ categoria: 1 });
ExercicioSchema.index({ isCustom: 1, creatorId: 1 });
export default mongoose.model("Exercicio", ExercicioSchema);
