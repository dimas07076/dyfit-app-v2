import mongoose from 'mongoose';
import type { GridFSBucket } from 'mongodb';

let bucket: GridFSBucket | null = null;

export function getPaymentProofBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB não conectado.');
  // @ts-ignore - tipos do mongo via mongoose
  const { GridFSBucket } = mongoose.mongo;
  if (!bucket) bucket = new GridFSBucket(db, { bucketName: 'paymentProofs' });
  return bucket!;
}