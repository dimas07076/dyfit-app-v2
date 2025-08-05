// server/models/Sessao.ts
import mongoose, { Schema } from 'mongoose';
export const TIPOS_COMPROMISSO = ['avaliacao', 'checkin', 'treino_acompanhado', 'outro', 'treino_rotina', 'treino'];
export const OPCOES_PSE = [
    'Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'
];
const SessaoSchema = new Schema({
    personalId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true, index: true },
    alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno', required: true, index: true },
    rotinaId: { type: Schema.Types.ObjectId, ref: 'Treino', required: false, default: null, index: true },
    diaDeTreinoId: { type: Schema.Types.ObjectId, required: false, default: null },
    diaDeTreinoIdentificador: { type: String, trim: true, default: null },
    nomeSubFichaDia: { type: String, trim: true, default: null },
    sessionDate: { type: Date, required: true },
    tipoCompromisso: {
        type: String,
        enum: { values: TIPOS_COMPROMISSO, message: 'Tipo de compromisso inválido: {VALUE}' },
        required: true,
    },
    notes: { type: String, trim: true },
    status: {
        type: String,
        enum: { values: ['pending', 'confirmed', 'completed', 'cancelled', 'skipped'], message: 'Status inválido: {VALUE}' },
        default: 'pending',
        required: true,
    },
    concluidaEm: { type: Date, required: false, default: null },
    pseAluno: {
        type: String,
        enum: { values: [...OPCOES_PSE, null], message: 'PSE inválido: {VALUE}' },
        required: false,
        default: null,
    },
    comentarioAluno: {
        type: String,
        trim: true,
        required: false,
        default: null,
    },
    duracaoSegundos: {
        type: Number,
        required: false,
        default: 0
    },
    cargasExecutadas: {
        type: Map,
        of: String,
        required: false,
        default: {}
    },
    aumentouCarga: {
        type: Boolean,
        required: false,
        default: false
    },
    detalhesAumentoCarga: {
        type: [{
                exercicioId: { type: String, required: true },
                nomeExercicio: { type: String, required: false },
                cargaAnterior: { type: String, required: true },
                cargaAtual: { type: String, required: true }
            }],
        required: false,
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
});
SessaoSchema.index({ personalId: 1, sessionDate: 1 });
SessaoSchema.index({ alunoId: 1, status: 1, sessionDate: 1 });
SessaoSchema.index({ rotinaId: 1, diaDeTreinoId: 1 });
export default mongoose.model('Sessao', SessaoSchema);
