// server/index.ts

// --- BLOCO DE IMPORTAÇÕES ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Router } from 'express';
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
import activityLogsRoutes from './src/routes/activityLogsRoutes.js'; // <-- 1. IMPORTAÇÃO ADICIONADA
import adminPlanosRoutes from './src/routes/adminPlanosRoutes.js';
import personalPlanosRoutes from './src/routes/personalPlanosRoutes.js';
import studentLimitRoutes from './src/routes/studentLimitRoutes.js';
import { authenticateToken } from './middlewares/authenticateToken.js';
import { authorizeAdmin } from './middlewares/authorizeAdmin.js';
import { errorHandler } from './middlewares/errorHandler.js';
import dbConnect from './lib/dbConnect.js';


// --- CONFIGURAÇÃO DE AMBIENTE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const apiRouter = Router();

// --- CONFIGURAÇÃO DE CORS E MIDDLEWARES GLOBAIS ---
const allowedOrigins = [
  'http://localhost:5173', 'http://localhost:4173', process.env.FRONTEND_URL, 
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.gitpod.io') || origin.endsWith('.vercel.app')) {
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

// --- ESTRUTURA DE ROTAS ---
app.use('/api', apiRouter);

// --- 1. Rotas Públicas ---
apiRouter.use('/public/convites', convitePublicRoutes);
apiRouter.use('/public/convite-aluno', conviteAlunoPublicRoutes);
apiRouter.use('/auth', authRoutes);

// --- 2. Rotas Protegidas ---
// A autenticação é aplicada diretamente ou dentro de cada arquivo de rota.
apiRouter.use('/admin', authenticateToken, authorizeAdmin, adminRoutes);
apiRouter.use('/admin', adminPlanosRoutes); // Plan management routes (auth applied inside)
apiRouter.use('/personal', personalPlanosRoutes); // Personal trainer plan routes (auth applied inside)
apiRouter.use('/student-limit', authenticateToken, studentLimitRoutes); // Student limit validation routes
apiRouter.use('/dashboard/geral', authenticateToken, dashboardRoutes);
apiRouter.use('/treinos', authenticateToken, treinoRoutes);
apiRouter.use('/exercicios', authenticateToken, exercicioRoutes);
apiRouter.use('/pastas/treinos', authenticateToken, pastaRoutes);
apiRouter.use('/activity-logs', authenticateToken, activityLogsRoutes); // <-- 2. REGISTRO DA ROTA ADICIONADO

apiRouter.use('/aluno', alunoApiRoutes);
apiRouter.use('/alunos', alunoApiRoutes); // Add alias for consistency with client expectations
apiRouter.use('/sessions', sessionsRoutes);

// --- 3. Tratamento de Erros ---
app.use(errorHandler);

// --- EXPORTAÇÃO E INICIALIZAÇÃO ---
export default app;

const startServer = async () => {
  try {
    await dbConnect();
    console.log('Banco de dados conectado com sucesso!');
    
    if (process.env.NODE_ENV === 'development') {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`[DEV] Servidor Express de desenvolvimento rodando em http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('Falha ao conectar ao banco de dados:', error);
    process.exit(1); // Encerra o processo se a conexão com o DB falhar
  }
};

startServer();