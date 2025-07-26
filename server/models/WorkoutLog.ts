// server/models/WorkoutLog.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface para o documento do log de treino
export interface IWorkoutLog extends Document {
  treinoId: Types.ObjectId;
  treinoTitulo: string;
  alunoId: Types.ObjectId;
  personalId: Types.ObjectId;
  dataInicio: Date;
  dataFim: Date;
  duracaoTotalMinutos: number;
  nivelTreino: 'muito_facil' | 'facil' | 'moderado' | 'dificil' | 'muito_dificil';
  comentarioAluno?: string;
  aumentoCarga?: boolean;
  cargaAnterior?: number;
  cargaAtual?: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

const WorkoutLogSchema: Schema = new Schema<IWorkoutLog>({
  treinoId: { type: Schema.Types.ObjectId, ref: 'Treino', required: true },
  treinoTitulo: { type: String, required: true },
  alunoId: { type: Schema.Types.ObjectId, ref: 'Aluno', required: true },
  personalId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
  dataInicio: { type: Date, required: true },
  dataFim: { type: Date, required: true },
  duracaoTotalMinutos: { type: Number, required: true },
  nivelTreino: {
    type: String,
    enum: ['muito_facil', 'facil', 'moderado', 'dificil', 'muito_dificil'],
    required: true
  },
  comentarioAluno: { type: String },
  aumentoCarga: { type: Boolean },
  cargaAnterior: { type: Number },
  cargaAtual: { type: Number },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now }
});

export default mongoose.models.WorkoutLog || mongoose.model<IWorkoutLog>('WorkoutLog', WorkoutLogSchema);
