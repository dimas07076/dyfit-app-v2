import mongoose, { Schema, Document, Types } from 'mongoose';

export type RenewalStatus = 'pending' | 'payment_link_sent' | 'payment_proof_uploaded' | 'approved' | 'rejected' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export interface IRenewalProof {
  kind: 'link' | 'file';
  url?: string;                  // quando kind = link
  fileId?: Types.ObjectId;       // quando kind = file (GridFS _id)
  filename?: string;
  contentType?: string;
  size?: number;
  uploadedAt?: Date;
}

export interface IRenewalRequest extends Document {
  personalId?: Types.ObjectId;
  planId?: Types.ObjectId;
  studentId?: Types.ObjectId;    // se você vincular a aluno específico
  status: RenewalStatus;
  notes?: string;
  proof?: IRenewalProof;
  createdAt: Date;
  updatedAt: Date;
  
  // Campos legados para compatibilidade
  personalTrainerId: mongoose.Types.ObjectId;
  planIdRequested?: mongoose.Types.ObjectId;
  paymentLink?: string;
  paymentProofUrl?: string;
  requestedAt: Date;
  processedAt?: Date;
  adminId?: mongoose.Types.ObjectId;
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
  // Campos novos
  personalId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer' },
  planId: { type: Schema.Types.ObjectId, ref: 'Plano' },
  studentId: { type: Schema.Types.ObjectId, ref: 'Aluno' },
  status: { 
    type: String, 
    enum: ['pending', 'payment_link_sent', 'payment_proof_uploaded', 'approved', 'rejected', 'PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'], 
    default: 'pending' 
  },
  notes: { type: String },
  proof: { type: ProofSchema },
  
  // Campos legados para compatibilidade
  personalTrainerId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
  planIdRequested: { type: Schema.Types.ObjectId, ref: 'Plano' },
  paymentLink: { type: String },
  paymentProofUrl: { type: String },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

export default mongoose.model<IRenewalRequest>('RenewalRequest', RenewalRequestSchema);
