// server/index.ts

// --- BLOCO DE IMPORTAÇÕES (sem alterações) ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import mongoose from 'mongoose';
import cors, { CorsOptions } from 'cors';
import authRoutes from './src/routes/auth';
import convitePublicRoutes from './src/routes/convitePublicRoutes';
import conviteAlunoPublicRoutes from './src/routes/conviteAlunoPublicRoutes';
import dashboardRoutes from './src/routes/dashboardGeralRoutes';
import treinoRoutes from './src/routes/treinos';
import exercicioRoutes from './src/routes/exercicios';
import sessionsRoutes from './src/routes/sessionsRoutes';
import pastaRoutes from './src/routes/pastasTreinos';
import alunoApiRoutes from './src/routes/alunoApiRoutes';
import adminRoutes from './src/routes/adminRoutes';
import { authenticateToken } from './middlewares/authenticateToken';
import { authorizeAdmin } from './middlewares/authorizeAdmin';
import { errorHandler } from './middlewares/errorHandler';

// --- CONFIGURAÇÃO DE AMBIENTE (sem alterações) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// --- CONFIGURAÇÃO DE CORS (sem alterações) ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL, 
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin) || origin.endsWith('.gitpod.io')) {
      callback(null, true);
    } else {
      console.warn(`CORS: Requisição bloqueada da origem: ${origin}`);
      callback(new Error('Não permitido pela política de CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// --- CONEXÃO COM O BANCO (sem alterações) ---
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('FATAL_ERROR: MONGODB_URI não está definida.');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Falha ao conectar com o MongoDB:', err));

// --- ROTAS (sem alterações) ---
app.use('/api/public/convites', convitePublicRoutes);
app.use('/api/public/convite-aluno', conviteAlunoPublicRoutes);
app.use('/api/auth', authRoutes);
app.use(authenticateToken);
app.use('/api/admin', authorizeAdmin, adminRoutes);
app.use('/api/dashboard/geral', dashboardRoutes);
app.use('/api/treinos', treinoRoutes);
app.use('/api/exercicios', exercicioRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/pastas/treinos', pastaRoutes);
app.use('/api/aluno', alunoApiRoutes);
app.use(errorHandler);

// --- EXPORTAÇÃO PARA VERCEL (PRODUÇÃO) ---
export default app;

// --- INICIALIZAÇÃO PARA GITPOD (DESENVOLVIMENTO) ---
// Este bloco só será executado se a variável de ambiente NODE_ENV for 'development'.
// O build da Vercel não define essa variável, então este código não rodará em produção.
if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[DEV] Servidor Express de desenvolvimento rodando em http://localhost:${PORT}`);
  });
}