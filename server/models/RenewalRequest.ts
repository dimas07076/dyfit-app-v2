import mongoose, { Schema, Document } from 'mongoose';

export interface IRenewalRequest extends Document {
  personalTrainerId: mongoose.Types.ObjectId;
  planIdRequested?: mongoose.Types.ObjectId;
  status: 'pending' | 'payment_link_sent' | 'payment_proof_uploaded' | 'approved' | 'rejected';
  paymentLink?: string;
  paymentProofUrl?: string;
  requestedAt: Date;
  processedAt?: Date;
  adminId?: mongoose.Types.ObjectId;
}

const RenewalRequestSchema = new Schema<IRenewalRequest>({
  personalTrainerId: { type: Schema.Types.ObjectId, ref: 'PersonalTrainer', required: true },
  planIdRequested: { type: Schema.Types.ObjectId, ref: 'Plano' },
  status: { 
    type: String, 
    enum: ['pending','payment_link_sent','payment_proof_uploaded','approved','rejected'], 
    default: 'pending' 
  },
  paymentLink: { type: String },
  paymentProofUrl: { type: String },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

export default mongoose.model<IRenewalRequest>('RenewalRequest', RenewalRequestSchema);
