// server/index.ts

// --- BLOCO DE IMPORTAÇÕES ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Router } from 'express';
// mongoose é importado nos próprios modelos agora, não é mais necessário aqui.
import cors, { CorsOptions } from 'cors';
import authRoutes from './src/routes/auth.js';
import convitePublicRoutes from './src/routes/convitePublicRoutes.js';
import conviteAlunoPublicRoutes from './src/routes/conviteAlunoPublicRoutes.js';
import dashboardRoutes from './src/routes/dashboardGeralRoutes.js';
import treinoRoutes from './src/routes/treinos.js';
import exercicioRoutes from './src/routes/exercicios.js';
import sessionsRoutes from './src/routes/sessionsRoutes.js';
import pastaRoutes from './src/routes/pastasTreinos.js';
import alunoApiRoutes from './src/routes/alunoApiRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import { authenticateToken } from './middlewares/authenticateToken.js';
import { authorizeAdmin } from './middlewares/authorizeAdmin.js';
import { errorHandler } from './middlewares/errorHandler.js';

// --- CONFIGURAÇÃO DE AMBIENTE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const apiRouter = Router();

// --- CONFIGURAÇÃO DE CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL, 
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) { return callback(null, true); }
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

// --- BLOCO DE CONEXÃO COM O BANCO REMOVIDO DAQUI ---

// --- ESTRUTURA DE ROTAS ---
app.use('/api', apiRouter);
apiRouter.use('/public/convites', convitePublicRoutes);
apiRouter.use('/public/convite-aluno', conviteAlunoPublicRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use(authenticateToken);
apiRouter.use('/admin', authorizeAdmin, adminRoutes);
apiRouter.use('/dashboard/geral', dashboardRoutes);
apiRouter.use('/treinos', treinoRoutes);
apiRouter.use('/exercicios', exercicioRoutes);
apiRouter.use('/sessions', sessionsRoutes);
apiRouter.use('/pastas/treinos', pastaRoutes);
apiRouter.use('/aluno', alunoApiRoutes);
app.use(errorHandler);

// --- EXPORTAÇÃO E INICIALIZAÇÃO ---
export default app;

if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[DEV] Servidor Express de desenvolvimento rodando em http://localhost:${PORT}`);
  });
}