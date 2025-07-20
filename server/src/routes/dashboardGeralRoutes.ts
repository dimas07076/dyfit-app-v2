// server/src/routes/dashboardGeralRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import Aluno from '../../models/Aluno.js';
import Treino from '../../models/Treino.js';
import Sessao from '../../models/Sessao.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;

    if (!trainerId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    try {
        const trainerObjectId = new mongoose.Types.ObjectId(trainerId);

        // --- MÉTRICAS COM A NOVA REGRA DE NEGÓCIO ---

        // 1. Total de Alunos (sem alteração)
        const totalAlunos = await Aluno.countDocuments({ trainerId: trainerObjectId });

        // <<< ALTERAÇÃO: "Alunos Ativos" agora conta pelo status do cadastro do aluno >>>
        const treinosAtivos = await Aluno.countDocuments({
            trainerId: trainerObjectId,
            status: 'active' // A nova regra de negócio
        });
        
        // 3. Total de Fichas Modelo (sem alteração)
        const totalTreinosModelo = await Treino.countDocuments({
            criadorId: trainerObjectId,
            tipo: 'modelo'
        });
        
        // 4. Feedbacks Recebidos Hoje (sem alteração)
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        const feedbacksHojeCount = await Sessao.countDocuments({
            personalId: trainerObjectId,
            concluidaEm: { $gte: hojeInicio, $lte: hojeFim },
            status: 'completed',
            $or: [
                { pseAluno: { $exists: true, $nin: [null, ''] } },
                { comentarioAluno: { $exists: true, $nin: [null, ""] } }
            ]
        });

        res.json({
            totalAlunos,
            treinosAtivos, // Este nome de campo é mantido, mas agora representa "Alunos Ativos"
            totalTreinosModelo,
            feedbacksHojeCount,
        });

    } catch (error) {
        console.error("[GET /api/dashboard/geral] Erro ao buscar estatísticas:", error);
        next(error);
    }
});

export default router;