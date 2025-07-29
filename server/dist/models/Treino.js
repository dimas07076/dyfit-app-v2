// server/models/Treino.ts
import mongoose, { Schema } from "mongoose";
export const TIPOS_ORGANIZACAO_ROTINA = ['diasDaSemana', 'numerico', 'livre'];
// --- Schemas ---
const ExercicioEmDiaDeTreinoSchema = new Schema({
    exercicioId: { type: Schema.Types.ObjectId, ref: 'Exercicio', required: true },
    series: { type: String, trim: true },
    repeticoes: { type: String, trim: true },
    carga: { type: String, trim: true },
    descanso: { type: String, trim: true },
    observacoes: { type: String, trim: true },
    ordemNoDia: { type: Number, required: true },
    concluido: { type: Boolean, default: false },
    grupoCombinado: { type: String, default: null },
}, { _id: true });
const DiaDeTreinoSchema = new Schema({
    identificadorDia: { type: String, required: true, trim: true },
    nomeSubFicha: { type: String, trim: true, default: null },
    ordemNaRotina: { type: Number, required: true },
    exerciciosDoDia: [ExercicioEmDiaDeTreinoSchema],
}, { _id: true });
const TreinoSchema = new Schema({
    titulo: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    tipo: { type: String, required: true, enum: ['modelo', 'individual'] },
    criadorId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
    alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno', default: null, sparse: true, index: true },
    tipoOrganizacaoRotina: { type: String, required: true, enum: TIPOS_ORGANIZACAO_ROTINA },
    diasDeTreino: [DiaDeTreinoSchema],
    pastaId: { type: Schema.Types.ObjectId, ref: 'PastaTreino', default: null, sparse: true },
    statusModelo: { type: String, enum: ['ativo', 'rascunho', 'arquivado'], default: 'ativo' },
    ordemNaPasta: { type: Number },
    dataValidade: { type: Date, default: null },
    totalSessoesRotinaPlanejadas: { type: Number, default: 0 },
    sessoesRotinaConcluidas: { type: Number, default: 0 },
    criadoEm: { type: Date, default: Date.now },
    atualizadoEm: { type: Date, default: Date.now },
    isCopied: { type: Boolean, default: false }, // <<< NOVO CAMPO NO SCHEMA >>>
});
TreinoSchema.pre('save', function (next) {
    this.atualizadoEm = new Date();
    next();
});
TreinoSchema.pre('findOneAndUpdate', function (next) {
    this.set({ atualizadoEm: new Date() });
    next();
});
// ... Virtuais e Índices permanecem os mesmos ...
TreinoSchema.virtual('isConcluida').get(function () {
    if (this.tipo !== 'individual')
        return false;
    const totalPlanejado = this.totalSessoesRotinaPlanejadas ?? 0;
    const sessoesConcluidas = this.sessoesRotinaConcluidas ?? 0;
    if (totalPlanejado === 0 && sessoesConcluidas > 0)
        return true;
    if (totalPlanejado > 0 && sessoesConcluidas >= totalPlanejado)
        return true;
    return false;
});
TreinoSchema.virtual('progressoRotina').get(function () {
    if (this.tipo !== 'individual')
        return null;
    const totalPlanejado = this.totalSessoesRotinaPlanejadas ?? 0;
    const sessoesConcluidas = this.sessoesRotinaConcluidas ?? 0;
    if (totalPlanejado > 0)
        return `${sessoesConcluidas}/${totalPlanejado}`;
    if (totalPlanejado === 0)
        return `0/0`;
    return null;
});
TreinoSchema.index({ criadorId: 1, tipo: 1 });
TreinoSchema.index({ criadorId: 1, tipo: 1, pastaId: 1 }, { sparse: true });
TreinoSchema.index({ criadorId: 1, tipo: 1, statusModelo: 1 }, { partialFilterExpression: { tipo: 'modelo' } });
export default mongoose.model("Treino", TreinoSchema);
