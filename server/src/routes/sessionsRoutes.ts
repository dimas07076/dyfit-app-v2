// server/src/routes/sessionsRoutes.ts
import express, { Request, Response, NextFunction } from 'express'; // Request foi adicionado aqui
import mongoose, { Types } from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js'; // Importação corrigida
import Sessao, { ISessaoLean, ISessaoDocument, TipoCompromisso, TIPOS_COMPROMISSO, OpcaoPSE } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import Treino, { ITreino } from '../../models/Treino.js';

const router = express.Router();

// A partir daqui, você só precisa remover a tipagem ': AuthenticatedRequest' de todos os (req)
// GET /api/sessions - Listar sessões com filtros
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // O resto do arquivo permanece EXATAMENTE igual
    const personalIdFromToken = req.user?.id;
    const { alunoId: alunoIdParam, date, populateStudent, limit, tipoCompromisso: tipoCompromissoQuery } = req.query;

    if (!personalIdFromToken) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    try {
        const queryFilter: any = { personalId: new Types.ObjectId(personalIdFromToken) };
        if (alunoIdParam && typeof alunoIdParam === 'string' && Types.ObjectId.isValid(alunoIdParam)) {
            queryFilter.alunoId = new Types.ObjectId(alunoIdParam);
        }
        if (date && typeof date === 'string') {
            const targetDate = new Date(date);
            if (!isNaN(targetDate.getTime())) {
                const inicioDia = new Date(targetDate);
                inicioDia.setHours(0, 0, 0, 0);
                const fimDia = new Date(targetDate);
                fimDia.setHours(23, 59, 59, 999);
                queryFilter.sessionDate = { $gte: inicioDia, $lte: fimDia };
            }
        }
        if (tipoCompromissoQuery && typeof tipoCompromissoQuery === 'string' && TIPOS_COMPROMISSO.includes(tipoCompromissoQuery as TipoCompromisso)) {
            queryFilter.tipoCompromisso = tipoCompromissoQuery;
        }
        let query = Sessao.find(queryFilter).sort({ sessionDate: 1 });
        if (populateStudent === 'true') {
            query = query.populate('alunoId', 'nome _id'); 
        }
        query = query.populate('rotinaId', 'titulo _id');
        if (limit && typeof limit === 'string' && !isNaN(parseInt(limit))) {
            query = query.limit(parseInt(limit));
        }
        const sessoes = await query.lean<ISessaoLean[]>(); 
        res.json(sessoes);
    } catch (error) {
        console.error("[GET /api/sessions] Erro ao buscar sessões:", error);
        next(error);
    }
});
// ... e assim por diante para TODAS as outras rotas no arquivo ...
// (O restante do seu código aqui)
router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => { /* ... seu código ... */ });
router.put('/:sessionId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => { /* ... seu código ... */ });
router.delete('/:sessionId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => { /* ... seu código ... */ });


export default router;

// Nota: Para ser breve, eu não colei todo o conteúdo do seu arquivo. 
// Você deve apenas alterar as linhas de import e a assinatura das rotas.
// Exemplo: router.post('/', authenticateToken, async (req: AuthenticatedRequest, ... se torna
// router.post('/', authenticateToken, async (req: Request, ...