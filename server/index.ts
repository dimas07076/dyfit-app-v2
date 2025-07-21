// server/index.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Router } from 'express';
import cors, { CorsOptions } from 'cors';
// <<< INÍCIO DA ALTERAÇÃO: Extensões .js reintroduzidas para compatibilidade com Vercel >>>
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
// <<< FIM DA ALTERAÇÃO >>>
import { authenticateToken } from './middlewares/authenticateToken.js';
import { authorizeAdmin } from './middlewares/authorizeAdmin.js';
import { errorHandler } from './middlewares/errorHandler.js';
import dbConnect from './lib/dbConnect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const apiRouter = Router();

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

// ESTRUTURA DE ROTAS
app.use('/api', apiRouter);

apiRouter.use('/public/convites', convitePublicRoutes);
apiRouter.use('/public/convite-aluno', conviteAlunoPublicRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', authenticateToken, authorizeAdmin, adminRoutes);
apiRouter.use('/dashboard/geral', authenticateToken, dashboardRoutes);
apiRouter.use('/treinos', authenticateToken, treinoRoutes);
apiRouter.use('/exercicios', authenticateToken, exercicioRoutes);
apiRouter.use('/pastas/treinos', authenticateToken, pastaRoutes);
apiRouter.use('/aluno', alunoApiRoutes);
apiRouter.use('/sessions', sessionsRoutes);
app.use(errorHandler);

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
    process.exit(1);
  }
};
startServer();