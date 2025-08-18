// server/models/RenewalRequest.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// Objeto de status para evitar strings mágicas e garantir consistência
export const RStatus = {
  REQUESTED: 'requested',
  LINK_SENT: 'link_sent',
  PROOF_SUBMITTED: 'proof_submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FULFILLED: 'fulfilled',
  CYCLE_ASSIGNMENT_PENDING: 'cycle_assignment_pending',
  // Status legados para compatibilidade, se necessário
  PENDING: 'pending',
  PAYMENT_LINK_SENT: 'payment_link_sent',
  PAYMENT_PROOF_UPLOADED: 'payment_proof_uploaded',
} as const;

export type RenewalStatus = typeof RStatus[keyof typeof RStatus];

export interface IRenewalProof {
  kind: 'link' | 'file';
  url?: string;
  fileId?: Types.ObjectId;
  filename?: string;
  contentType?: string;
  size?: number;
  uploadedAt?: Date;
}

export interface IRenewalRequest extends Document {
  personalTrainerId: Types.ObjectId;
  planIdRequested?: Types.ObjectId;
  status: RenewalStatus;
  notes?: string;
  proof?: IRenewalProof;
  
  // Timestamps do fluxo
  requestedAt: Date;
  linkSentAt?: Date;
  proofUploadedAt?: Date;
  paymentDecisionAt?: Date;
  cycleFinalizedAt?: Date;
  
  // Campos de controle do Admin e legados
  paymentLink?: string;
  paymentProofUrl?: string; // Mantido para compatibilidade com a rota existente
  paymentDecisionNote?: string;
  adminId?: Types.ObjectId;
  
  // Timestamps automáticos do Mongoose
  createdAt: Date;
  updatedAt: Date;
}

const ProofSchema = new Schema<IRenewalProof>({
  kind: { type: String, enum: ['link', 'file'], required: true },
  url: { type: String },
  fileId: { type: Schema.Types.ObjectId },
  filename: { type: String },
  contentType: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const RenewalRequestSchema = new Schema<IRenewalRequest>({
  personalTrainerId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true, index: true },
  planIdRequested: { type: Schema.Types.ObjectId, ref: 'Plano' },
  status: { 
    type: String, 
    enum: Object.values(RStatus), 
    default: RStatus.REQUESTED 
  },
  notes: { type: String, trim: true },
  proof: { type: ProofSchema },
  
  // Timestamps
  requestedAt: { type: Date, default: Date.now },
  linkSentAt: { type: Date },
  proofUploadedAt: { type: Date },
  paymentDecisionAt: { type: Date },
  cycleFinalizedAt: { type: Date },
  
  // Campos do admin e legados
  paymentLink: { type: String, trim: true },
  paymentProofUrl: { type: String, trim: true },
  paymentDecisionNote: { type: String, trim: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer' },
}, { timestamps: true }); // Habilita createdAt e updatedAt

export default mongoose.model<IRenewalRequest>('RenewalRequest', RenewalRequestSchema);