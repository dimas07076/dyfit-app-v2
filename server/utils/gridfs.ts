// server/utils/gridfs.ts
import mongoose from 'mongoose';
import type { GridFSBucket } from 'mongodb';
import dbConnect from '../lib/dbConnect.js';

// A variável 'bucket' global foi removida para evitar o uso de conexões de DB antigas.

export async function getPaymentProofBucket(): Promise<GridFSBucket> {
  // 1. Garante que a conexão com o banco de dados esteja estabelecida e ativa.
  await dbConnect();
  const db = mongoose.connection.db;

  // 2. Verificação robusta para garantir que a instância do DB foi obtida com sucesso.
  if (!db) {
    console.error('❌ FATAL: Conexão com o DB não estabelecida mesmo após dbConnect()');
    throw new Error('Falha na obtenção da instância do banco de dados.');
  }

  // @ts-ignore - tipos do mongo via mongoose são injetados em tempo de execução
  const { GridFSBucket } = mongoose.mongo;

  // 3. Cria e retorna uma NOVA instância do GridFSBucket a cada chamada.
  // Isso garante que a instância sempre use a conexão de banco de dados mais recente e ativa.
  console.log('✅ Criando nova instância do GridFSBucket para "paymentProofs"');
  const bucket = new GridFSBucket(db, { bucketName: 'paymentProofs' });

  return bucket;
}