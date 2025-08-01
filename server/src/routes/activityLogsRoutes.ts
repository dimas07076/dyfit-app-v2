// server/src/routes/activityLogsRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import Sessao from '../../models/Sessao.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

/**
 * Função para verificar se houve aumento de carga comparando com a sessão anterior
 */
const verificarAumentoCarga = async (sessaoAtual: any, alunoId: string): Promise<boolean> => {
    try {
        // Se não há cargas executadas, retorna false
        if (!sessaoAtual.cargasExecutadas || Object.keys(sessaoAtual.cargasExecutadas).length === 0) {
            return false;
        }

        // Busca a sessão anterior do mesmo aluno (completed e mais recente que a atual)
        const sessaoAnterior = await Sessao.findOne({
            alunoId: new mongoose.Types.ObjectId(alunoId),
            status: 'completed',
            concluidaEm: { $lt: sessaoAtual.concluidaEm },
            cargasExecutadas: { $exists: true, $ne: {} }
        })
        .sort({ concluidaEm: -1 })
        .lean();

        // Se não há sessão anterior com cargas, retorna false
        if (!sessaoAnterior || !sessaoAnterior.cargasExecutadas) {
            return false;
        }

        // Compara as cargas: verifica se pelo menos um exercício teve aumento
        const cargasAtuais = sessaoAtual.cargasExecutadas;
        const cargasAnteriores = sessaoAnterior.cargasExecutadas;

        for (const exercicioId in cargasAtuais) {
            if (cargasAnteriores[exercicioId]) {
                const cargaAtual = parseFloat(cargasAtuais[exercicioId]) || 0;
                const cargaAnterior = parseFloat(cargasAnteriores[exercicioId]) || 0;
                
                // Se encontrou pelo menos um exercício com aumento de carga
                if (cargaAtual > cargaAnterior) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar aumento de carga:', error);
        return false;
    }
};

router.get('/aluno/:alunoId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();

    const personalId = req.user?.id;
    const alunoId = req.params.alunoId;

    if (!personalId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    try {
        // Busca o histórico de sessões do aluno
        const historico = await Sessao.find({ 
            alunoId: new mongoose.Types.ObjectId(alunoId),
            personalId: new mongoose.Types.ObjectId(personalId),
            status: 'completed' 
        })
        .sort({ concluidaEm: -1 })
        .populate('rotinaId', 'titulo')
        .lean();

        // Mapeia os dados para a estrutura que o frontend espera
        const historicoMapeado = await Promise.all(historico.map(async (sessao) => {
            // Calcula se houve aumento de carga para esta sessão
            const aumentoCarga = await verificarAumentoCarga(sessao, alunoId);

            return {
                _id: sessao._id,
                treinoId: sessao.rotinaId?._id || null,
                treinoTitulo: (sessao.rotinaId as any)?.titulo || sessao.diaDeTreinoIdentificador || 'Treino Concluído',
                dataInicio: sessao.sessionDate,
                dataFim: sessao.concluidaEm,
                duracaoTotalMinutos: sessao.duracaoSegundos ? Math.round(sessao.duracaoSegundos / 60) : 0,
                nivelTreino: sessao.pseAluno,
                comentarioAluno: sessao.comentarioAluno,
                aumentoCarga: aumentoCarga // ✅ Agora calcula corretamente
            };
        }));

        res.json(historicoMapeado);

    } catch (error) {
        console.error(`[GET /api/activity-logs/aluno/${alunoId}] Erro:`, error);
        next(error);
    }
});

export default router;