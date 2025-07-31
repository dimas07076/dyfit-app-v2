// server/src/routes/activityLogsRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import Sessao from '../../models/Sessao.js'; // <-- 1. MUDANÇA: Importa Sessao ao invés de WorkoutLog

const router = express.Router();

console.log("--- [server/src/routes/activityLogsRoutes.ts] Ficheiro carregado ---");

// Função auxiliar para verificar se houve aumento de carga comparando com a sessão anterior
function verificarAumentoCarga(sessaoAtual: any, sessaoAnterior: any): boolean {
    if (!sessaoAtual?.cargasExecutadas || !sessaoAnterior?.cargasExecutadas) {
        return false; // Se não há dados de carga, não houve aumento
    }

    const cargasAtuais = sessaoAtual.cargasExecutadas;
    const cargasAnteriores = sessaoAnterior.cargasExecutadas;

    // Verifica se algum exercício teve aumento de carga
    for (const [exercicioId, cargaAtual] of Object.entries(cargasAtuais)) {
        const cargaAnterior = cargasAnteriores[exercicioId];
        
        if (cargaAnterior && cargaAtual) {
            // Converte strings para números para comparação
            const cargaAtualNum = parseFloat(cargaAtual as string);
            const cargaAnteriorNum = parseFloat(cargaAnterior);
            
            // Se qualquer exercício teve aumento de carga, retorna true
            if (!isNaN(cargaAtualNum) && !isNaN(cargaAnteriorNum) && cargaAtualNum > cargaAnteriorNum) {
                return true;
            }
        }
    }

    return false; // Nenhum exercício teve aumento de carga
}

// ROTA AJUSTADA PARA BUSCAR DA COLEÇÃO CORRETA ('sessoes')
router.get('/aluno/:alunoId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();

    const { alunoId } = req.params;
    const personalId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(alunoId)) {
        return res.status(400).json({ mensagem: "ID do aluno inválido." });
    }
    if (!personalId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    try {
        // --- 2. MUDANÇA: A consulta agora usa o modelo 'Sessao' ---
        // Adicionamos status: 'completed' para pegar apenas os treinos finalizados.
        const historico = await Sessao.find({ 
            alunoId: new mongoose.Types.ObjectId(alunoId),
            personalId: new mongoose.Types.ObjectId(personalId),
            status: 'completed' 
        })
        .sort({ concluidaEm: -1 }) // Ordena pelos mais recentes
        .populate('rotinaId', 'titulo') // Popula o título da rotina para exibição
        .lean(); // Usa .lean() para um desempenho melhor

        // Mapeia os dados para a estrutura que o frontend espera (IWorkoutHistoryLog)
        const historicoMapeado = historico.map((sessao, index) => {
            // Para calcular o aumento de carga, compara com a sessão anterior (próxima no array, pois está ordenado desc)
            const sessaoAnterior = index < historico.length - 1 ? historico[index + 1] : null;
            const aumentoCarga = verificarAumentoCarga(sessao, sessaoAnterior);

            return {
                _id: sessao._id,
                treinoId: sessao.rotinaId?._id || null,
                treinoTitulo: (sessao.rotinaId as any)?.titulo || sessao.diaDeTreinoIdentificador || 'Treino Concluído',
                dataInicio: sessao.sessionDate, // <-- ADICIONADO: Inclui a data de início
                dataFim: sessao.concluidaEm,
                duracaoTotalMinutos: sessao.duracaoSegundos ? Math.round(sessao.duracaoSegundos / 60) : 0,
                nivelTreino: sessao.pseAluno, // O frontend já sabe como traduzir isso
                comentarioAluno: sessao.comentarioAluno,
                aumentoCarga: aumentoCarga, // <-- MUDANÇA: Agora calcula dinamicamente
            };
        });

        res.json(historicoMapeado);

    } catch (error) {
        console.error(`[GET /api/activity-logs/aluno/${alunoId}] Erro:`, error);
        next(error);
    }
});


// Rota placeholder mantida como original
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const limitParam = req.query.limit;
    const limit = typeof limitParam === 'string' && parseInt(limitParam) > 0 ? parseInt(limitParam) : 5;
    if (!trainerId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }
    console.log(`[GET /api/activity-logs] (Placeholder) Buscando logs para trainerId: ${trainerId} com limite: ${limit}`);
    try {
        const mockActivities: any[] = [];
        res.json(mockActivities);
    } catch (error) {
        console.error("[GET /api/activity-logs] (Placeholder) Erro:", error);
        next(error);
    }
});

export default router;