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
    // Se não há sessão anterior, não pode haver comparação de aumento
    if (!sessaoAtual || !sessaoAnterior) {
        return false;
    }
    
    // Obtém os dados de carga das duas sessões
    const cargasAtuais = sessaoAtual.cargasExecutadas;
    const cargasAnteriores = sessaoAnterior.cargasExecutadas;
    
    // Se alguma das sessões não tem dados de carga, não pode haver comparação
    if (!cargasAtuais || !cargasAnteriores) {
        return false;
    }
    
    // Handle both Map and Object cases (MongoDB pode retornar Maps)
    let cargasAtuaisObj: any = {};
    let cargasAnterioresObj: any = {};
    
    if (cargasAtuais instanceof Map) {
        cargasAtuaisObj = Object.fromEntries(cargasAtuais);
    } else {
        cargasAtuaisObj = cargasAtuais;
    }
    
    if (cargasAnteriores instanceof Map) {
        cargasAnterioresObj = Object.fromEntries(cargasAnteriores);
    } else {
        cargasAnterioresObj = cargasAnteriores;
    }
    
    // Verifica se há dados para comparar
    const keysAtuais = Object.keys(cargasAtuaisObj);
    const keysAnteriores = Object.keys(cargasAnterioresObj);
    
    if (keysAtuais.length === 0 || keysAnteriores.length === 0) {
        return false;
    }

    // Verifica se algum exercício teve aumento de carga
    for (const [exercicioId, cargaAtual] of Object.entries(cargasAtuaisObj)) {
        const cargaAnterior = cargasAnterioresObj[exercicioId];
        
        // Só compara se ambas as cargas existem
        if (cargaAnterior && cargaAtual) {
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

// Função aprimorada para encontrar a sessão anterior mais relevante para comparação
function encontrarSessaoAnteriorParaComparacao(historico: any[], indexAtual: number): any | null {
    const sessaoAtual = historico[indexAtual];
    
    // Procura pela sessão anterior do mesmo dia de treino (mais relevante)
    for (let i = indexAtual + 1; i < historico.length; i++) {
        const sessaoCandidata = historico[i];
        
        // Se encontrar uma sessão do mesmo dia de treino, use essa
        if (sessaoCandidata.diaDeTreinoId && 
            sessaoAtual.diaDeTreinoId && 
            sessaoCandidata.diaDeTreinoId.toString() === sessaoAtual.diaDeTreinoId.toString()) {
            return sessaoCandidata;
        }
    }
    
    // Se não encontrar do mesmo dia, use a próxima sessão disponível (fallback para comportamento anterior)
    return indexAtual < historico.length - 1 ? historico[indexAtual + 1] : null;
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
            // Usa a função aprimorada para encontrar a sessão anterior mais relevante
            const sessaoAnterior = encontrarSessaoAnteriorParaComparacao(historico, index);
            const aumentoCarga = verificarAumentoCarga(sessao, sessaoAnterior);

            return {
                _id: sessao._id,
                treinoId: sessao.rotinaId?._id || null,
                treinoTitulo: (sessao.rotinaId as any)?.titulo || sessao.diaDeTreinoIdentificador || 'Treino Concluído',
                dataInicio: sessao.sessionDate,
                dataFim: sessao.concluidaEm,
                duracaoTotalMinutos: sessao.duracaoSegundos ? Math.round(sessao.duracaoSegundos / 60) : 0,
                nivelTreino: sessao.pseAluno,
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

// DEBUG: Endpoint para ver dados brutos das sessões para diagnóstico
router.get('/aluno/:alunoId/debug', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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
        const historico = await Sessao.find({ 
            alunoId: new mongoose.Types.ObjectId(alunoId),
            personalId: new mongoose.Types.ObjectId(personalId),
            status: 'completed' 
        })
        .sort({ concluidaEm: -1 })
        .lean();

        // Retorna dados brutos para debugging
        const debugData = historico.map((sessao, index) => {
            const sessaoAnterior = encontrarSessaoAnteriorParaComparacao(historico, index);
            
            return {
                index,
                _id: sessao._id,
                sessionDate: sessao.sessionDate,
                concluidaEm: sessao.concluidaEm,
                diaDeTreinoId: sessao.diaDeTreinoId,
                diaDeTreinoIdentificador: sessao.diaDeTreinoIdentificador,
                cargasExecutadas: sessao.cargasExecutadas,
                cargasExecutadasType: typeof sessao.cargasExecutadas,
                cargasExecutadasKeys: sessao.cargasExecutadas ? Object.keys(sessao.cargasExecutadas) : [],
                cargasExecutadasIsMap: sessao.cargasExecutadas instanceof Map,
                temSessaoAnterior: !!sessaoAnterior,
                sessaoAnteriorId: sessaoAnterior?._id,
                sessaoAnteriorDiaDeTreinoId: sessaoAnterior?.diaDeTreinoId,
                sessaoAnteriorCargasExecutadas: sessaoAnterior?.cargasExecutadas,
                tipoComparacao: sessaoAnterior ? 
                    (sessaoAnterior.diaDeTreinoId?.toString() === sessao.diaDeTreinoId?.toString() ? 
                        'mesmo_dia_treino' : 'sessao_anterior_geral') : 'primeira_sessao',
                resultadoComparacao: verificarAumentoCarga(sessao, sessaoAnterior)
            };
        });

        res.json({
            totalSessoes: historico.length,
            sessoes: debugData
        });

    } catch (error) {
        console.error(`[GET /api/activity-logs/aluno/${alunoId}/debug] Erro:`, error);
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