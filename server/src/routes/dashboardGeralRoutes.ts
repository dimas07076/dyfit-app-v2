// server/src/routes/dashboardGeralRoutes.ts
import express, { Request, Response, NextFunction } from 'express'; // Request foi adicionado
import mongoose from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken'; // Importação corrigida
import Aluno from '../../models/Aluno';
import Treino from '../../models/Treino';
import Sessao from '../../models/Sessao';

const router = express.Router();

console.log("--- [server/src/routes/dashboardGeralRoutes.ts] Ficheiro carregado e rota GET / definida ---");

router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    const trainerId = req.user?.id;

    if (!trainerId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    console.log(`[GET /api/dashboard/geral] Buscando estatísticas para o trainerId: ${trainerId}`);

    try {
        const trainerObjectId = new mongoose.Types.ObjectId(trainerId);

        // 1. Total de Alunos
        const totalAlunos = await Aluno.countDocuments({ trainerId: trainerObjectId });
        console.log(`[GET /api/dashboard/geral] Total de alunos: ${totalAlunos}`);

        // 2. Treinos (Modelo) Ativos
        const treinosAtivos = await Treino.countDocuments({ 
            criadorId: trainerObjectId, 
            tipo: 'modelo', 
            status: 'ativo' 
        });
        console.log(`[GET /api/dashboard/geral] Treinos (modelo) ativos: ${treinosAtivos}`);

        // 3. Sessões Agendadas para Hoje
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0); // Início do dia
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999); // Fim do dia

        const sessoesHojeCount = await Sessao.countDocuments({
            personalId: trainerObjectId, // Corrigido de trainerId para personalId
            sessionDate: {
                $gte: hojeInicio,
                $lte: hojeFim
            },
        });
        console.log(`[GET /api/dashboard/geral] Sessões hoje: ${sessoesHojeCount}`);

        // 4. Taxa de Conclusão Geral (últimos 30 dias)
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        trintaDiasAtras.setHours(0,0,0,0);

        const agora = new Date();

        const sessoesUltimos30Dias = await Sessao.find({
            personalId: trainerObjectId, // Corrigido de trainerId para personalId
            sessionDate: { $gte: trintaDiasAtras, $lte: agora }
        }).select('status sessionDate').lean();

        let sessoesConcluidas = 0;
        let sessoesCanceladasPassadas = 0;

        sessoesUltimos30Dias.forEach(sessao => {
            if (sessao.status === 'completed') {
                sessoesConcluidas++;
            } else if (sessao.status === 'cancelled' && new Date(sessao.sessionDate) < agora) {
                sessoesCanceladasPassadas++;
            }
        });
        
        const denominadorTaxa = sessoesConcluidas + sessoesCanceladasPassadas;
        const taxaConclusaoGeral = denominadorTaxa > 0 ? (sessoesConcluidas / denominadorTaxa) : 0;

        console.log(`[GET /api/dashboard/geral] Sessões concluídas (30d): ${sessoesConcluidas}`);
        console.log(`[GET /api/dashboard/geral] Sessões canceladas passadas (30d): ${sessoesCanceladasPassadas}`);
        console.log(`[GET /api/dashboard/geral] Denominador taxa: ${denominadorTaxa}`);
        console.log(`[GET /api/dashboard/geral] Taxa de conclusão (0-1): ${taxaConclusaoGeral}`);

        res.json({
            totalAlunos,
            treinosAtivos,
            sessoesHojeCount,
            taxaConclusaoGeral,
        });

    } catch (error) {
        console.error("[GET /api/dashboard/geral] Erro ao buscar estatísticas:", error);
        next(error);
    }
});

export default router;