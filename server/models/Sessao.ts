// server/models/Sessao.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export const TIPOS_COMPROMISSO = ['avaliacao', 'checkin', 'treino_acompanhado', 'outro', 'treino_rotina', 'treino'] as const;
export type TipoCompromisso = typeof TIPOS_COMPROMISSO[number];

export const OPCOES_PSE = [
    'Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'
] as const;
export type OpcaoPSE = typeof OPCOES_PSE[number];

interface IPopulatedAlunoLean { _id: string; nome: string; }
interface IPopulatedRotinaLean { _id: string; titulo: string; }

// <<< INÍCIO DA ALTERAÇÃO >>>
// Interface para o mapa de cargas executadas
interface CargasExecutadasMap {
  [exercicioDoDiaId: string]: string;
}
// <<< FIM DA ALTERAÇÃO >>>


export interface ISessaoLean {
  _id: string; 
  personalId: string; 
  alunoId: IPopulatedAlunoLean | string; 
  rotinaId: IPopulatedRotinaLean | string | null; 
  diaDeTreinoId: string | null; 
  diaDeTreinoIdentificador?: string | null;
  nomeSubFichaDia?: string | null;
  sessionDate: string; 
  tipoCompromisso: TipoCompromisso;
  notes?: string; 
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'skipped';
  concluidaEm?: string | null; 
  pseAluno?: OpcaoPSE | null;
  comentarioAluno?: string | null;
  // <<< INÍCIO DA ALTERAÇÃO >>>
  duracaoSegundos?: number;
  cargasExecutadas?: CargasExecutadasMap;
  // <<< FIM DA ALTERAÇÃO >>>
  createdAt?: string;
  updatedAt?: string;
}

export interface ISessaoDocument extends Document {
  personalId: Types.ObjectId; 
  alunoId: Types.ObjectId; 
  rotinaId?: Types.ObjectId | null; 
  diaDeTreinoId?: Types.ObjectId | null; 
  diaDeTreinoIdentificador?: string | null;
  nomeSubFichaDia?: string | null;
  sessionDate: Date; 
  tipoCompromisso: TipoCompromisso;
  notes?: string; 
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'skipped';
  concluidaEm?: Date | null;
  pseAluno?: OpcaoPSE | null;
  comentarioAluno?: string | null;
  // <<< INÍCIO DA ALTERAÇÃO >>>
  duracaoSegundos?: number;
  cargasExecutadas?: CargasExecutadasMap;
  // <<< FIM DA ALTERAÇÃO >>>
}

const SessaoSchema = new Schema<ISessaoDocument>(
  {
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
      enum: { values: ['pending', 'confirmed', 'completed', 'cancelled', 'skipped'], message: 'Status inválido: {VALUE}'},
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
    // <<< INÍCIO DA ALTERAÇÃO >>>
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
    }
    // <<< FIM DA ALTERAÇÃO >>>
  },
  {
    timestamps: true, 
    toJSON: { virtuals: true, getters: true }, 
    toObject: { virtuals: true, getters: true },
  }
);

SessaoSchema.index({ personalId: 1, sessionDate: 1 });
SessaoSchema.index({ alunoId: 1, status: 1, sessionDate: 1 });
SessaoSchema.index({ rotinaId: 1, diaDeTreinoId: 1 });

export default mongoose.model<ISessaoDocument>('Sessao', SessaoSchema);