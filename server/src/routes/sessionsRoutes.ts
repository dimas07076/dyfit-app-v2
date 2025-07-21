// server/src/routes/sessionsRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import Sessao, { ISessaoLean, ISessaoDocument, TipoCompromisso, TIPOS_COMPROMISSO, OpcaoPSE } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import Treino, { ITreino } from '../../models/Treino.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL
// =======================================================
// (Nenhuma alteração nas rotas do personal)
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const personalIdFromToken = req.user?.id;
    const { alunoId: alunoIdParam, date, populateStudent, limit, tipoCompromisso: tipoCompromissoQuery } = req.query;
    if (!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
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
                const fimDia = new Date(targetDate); fimDia.setHours(23, 59, 59, 999);
                queryFilter.sessionDate = { $gte: inicioDia, $lte: fimDia };
            }
        }
        if (tipoCompromissoQuery && typeof tipoCompromissoQuery === 'string' && TIPOS_COMPROMISSO.includes(tipoCompromissoQuery as TipoCompromisso)) {
            queryFilter.tipoCompromisso = tipoCompromissoQuery;
        }
        let query = Sessao.find(queryFilter).sort({ sessionDate: 1 });
        if (populateStudent === 'true') query = query.populate('alunoId', 'nome _id');
        query = query.populate('rotinaId', 'titulo _id');
        if (limit && typeof limit === 'string' && !isNaN(parseInt(limit))) query = query.limit(parseInt(limit));
        const sessoes = await query.lean<ISessaoLean[]>();
        res.json(sessoes);
    } catch (error) {
        console.error("[GET /api/sessions] Erro ao buscar sessões:", error);
        next(error);
    }
});
router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const personalIdFromToken = req.user?.id;
    const { alunoId, sessionDate, tipoCompromisso, notes, status, rotinaId, diaDeTreinoId, diaDeTreinoIdentificador } = req.body;
    if (!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!alunoId || !sessionDate || !status || !tipoCompromisso) return res.status(400).json({ mensagem: "Campos obrigatórios ausentes." });
    if (!Types.ObjectId.isValid(alunoId)) return res.status(400).json({ mensagem: "ID do aluno inválido." });
    const validDate = new Date(sessionDate);
    if (isNaN(validDate.getTime())) return res.status(400).json({ mensagem: "Formato de data inválido." });
    try {
        const personalObjectId = new Types.ObjectId(personalIdFromToken);
        const alunoObjectId = new Types.ObjectId(alunoId);
        const aluno = await Aluno.findOne({ _id: alunoObjectId, trainerId: personalObjectId });
        if (!aluno) return res.status(403).json({ mensagem: "Aluno não pertence a você." });
        const novaSessaoDoc = new Sessao({
            personalId: personalObjectId, alunoId: alunoObjectId, sessionDate: validDate, tipoCompromisso,
            notes, status, rotinaId: rotinaId ? new Types.ObjectId(rotinaId) : null,
            diaDeTreinoId: diaDeTreinoId ? new Types.ObjectId(diaDeTreinoId) : null, diaDeTreinoIdentificador: diaDeTreinoIdentificador || null,
        });
        await novaSessaoDoc.save();
        const sessaoPopulada = await Sessao.findById(novaSessaoDoc._id).populate('alunoId', 'nome _id').populate('rotinaId', 'titulo _id').lean<ISessaoLean>();
        res.status(201).json(sessaoPopulada);
    } catch (error: any) {
        next(error);
    }
});
router.put('/:sessionId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const personalIdFromToken = req.user?.id;
    const { sessionId } = req.params;
    const { status, notes, sessionDate, tipoCompromisso, rotinaId, diaDeTreinoId, diaDeTreinoIdentificador, alunoId: alunoIdBody, pseAluno, comentarioAluno } = req.body;
    if (!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if (!Types.ObjectId.isValid(sessionId)) return res.status(400).json({ mensagem: "ID da sessão inválido." });
    const updateData: Partial<ISessaoDocument> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (sessionDate) {
        const validDate = new Date(sessionDate);
        if (isNaN(validDate.getTime())) return res.status(400).json({ mensagem: "Formato de data inválido." });
        updateData.sessionDate = validDate;
    }
    if (tipoCompromisso) updateData.tipoCompromisso = tipoCompromisso;
    if (rotinaId !== undefined) updateData.rotinaId = rotinaId ? new Types.ObjectId(rotinaId) : null;
    if (diaDeTreinoId !== undefined) updateData.diaDeTreinoId = diaDeTreinoId ? new Types.ObjectId(diaDeTreinoId) : null;
    if (diaDeTreinoIdentificador !== undefined) updateData.diaDeTreinoIdentificador = diaDeTreinoIdentificador;
    if (alunoIdBody) {
        const aluno = await Aluno.findOne({ _id: new Types.ObjectId(alunoIdBody), trainerId: new Types.ObjectId(personalIdFromToken) });
        if (!aluno) return res.status(403).json({ mensagem: "Aluno não pertence a você." });
        updateData.alunoId = new Types.ObjectId(alunoIdBody);
    }
    if (pseAluno !== undefined) updateData.pseAluno = pseAluno;
    if (comentarioAluno !== undefined) updateData.comentarioAluno = comentarioAluno;
    if (Object.keys(updateData).length === 0) return res.status(400).json({ mensagem: "Nenhum dado para atualização." });
    const mongoTransactionSession = await mongoose.startSession();
    try {
        mongoTransactionSession.startTransaction();
        const personalObjectId = new Types.ObjectId(personalIdFromToken);
        const sessaoExistente = await Sessao.findOne({ _id: sessionId, personalId: personalObjectId }).session(mongoTransactionSession);
        if (!sessaoExistente) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ mensagem: "Sessão não encontrada." });
        }
        const jaEstavaConcluida = sessaoExistente.status === 'completed';
        Object.assign(sessaoExistente, updateData);
        if (updateData.status === 'completed' && !sessaoExistente.concluidaEm) sessaoExistente.concluidaEm = new Date();
        await sessaoExistente.save({ session: mongoTransactionSession });
        if (updateData.status === 'completed' && !jaEstavaConcluida && sessaoExistente.rotinaId) {
            const rotina = await Treino.findById(sessaoExistente.rotinaId).session(mongoTransactionSession);
            if (rotina) {
                rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
                await rotina.save({ session: mongoTransactionSession });
            }
        }
        await mongoTransactionSession.commitTransaction();
        const sessaoAtualizadaPopulada = await Sessao.findById(sessaoExistente._id).populate('alunoId', 'nome _id').populate('rotinaId', 'titulo _id').lean<ISessaoLean>();
        res.json(sessaoAtualizadaPopulada);
    } catch (error: any) {
        if (mongoTransactionSession.inTransaction()) await mongoTransactionSession.abortTransaction();
        next(error);
    } finally {
        await mongoTransactionSession.endSession();
    }
});
router.delete('/:sessionId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const personalIdFromToken = req.user?.id;
    const { sessionId } = req.params;
    if(!personalIdFromToken) return res.status(401).json({ mensagem: "Usuário não autenticado." });
    if(!Types.ObjectId.isValid(sessionId)) return res.status(400).json({ mensagem: "ID da sessão inválido." });
    try {
        const result = await Sessao.deleteOne({ _id: new Types.ObjectId(sessionId), personalId: new Types.ObjectId(personalIdFromToken) });
        if (result.deletedCount === 0) return res.status(404).json({ mensagem: "Sessão não encontrada." });
        res.status(200).json({ mensagem: "Sessão excluída com sucesso." });
    } catch (error) {
        next(error);
    }
});


// =======================================================
// ROTAS DO ALUNO
// =======================================================

router.post('/aluno/concluir-dia', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    // <<< INÍCIO DA ALTERAÇÃO >>>
    const { rotinaId, diaDeTreinoId, pseAluno, comentarioAluno, duracaoSegundos, cargas } = req.body;
    // <<< FIM DA ALTERAÇÃO >>>

    if (!alunoId) return res.status(401).json({ message: "Aluno não autenticado." });
    if (!rotinaId || !diaDeTreinoId) return res.status(400).json({ message: "ID da rotina e do dia de treino são obrigatórios." });

    const mongoTransactionSession = await mongoose.startSession();
    try {
        mongoTransactionSession.startTransaction();
        const rotina = await Treino.findOne({ _id: rotinaId, alunoId }).session(mongoTransactionSession);
        if (!rotina) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: "Rotina não encontrada ou não pertence a este aluno." });
        }
        const diaDeTreino = rotina.diasDeTreino.id(diaDeTreinoId);
        if (!diaDeTreino) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: "Dia de treino não encontrado nesta rotina." });
        }
        const novaSessao = new Sessao({
            personalId: rotina.criadorId,
            alunoId: new Types.ObjectId(alunoId),
            sessionDate: new Date(),
            concluidaEm: new Date(),
            status: 'completed',
            tipoCompromisso: 'treino',
            rotinaId: rotina._id,
            diaDeTreinoId: diaDeTreino._id,
            diaDeTreinoIdentificador: diaDeTreino.identificadorDia,
            pseAluno: pseAluno || null,
            comentarioAluno: comentarioAluno || null,
            // <<< INÍCIO DA ALTERAÇÃO >>>
            duracaoSegundos: duracaoSegundos || 0,
            cargasExecutadas: cargas || {},
            // <<< FIM DA ALTERAÇÃO >>>
        });
        await novaSessao.save({ session: mongoTransactionSession });
        rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
        await rotina.save({ session: mongoTransactionSession });
        await mongoTransactionSession.commitTransaction();
        res.status(201).json({ message: "Dia de treino concluído com sucesso!", _id: novaSessao._id, status: novaSessao.status, concluidaEm: novaSessao.concluidaEm });
    } catch (error) {
        if (mongoTransactionSession.inTransaction()) await mongoTransactionSession.abortTransaction();
        next(error);
    } finally {
        await mongoTransactionSession.endSession();
    }
});

router.patch('/:sessionId/feedback', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    const { sessionId } = req.params;
    const { pseAluno, comentarioAluno } = req.body;

    if (!alunoId) return res.status(401).json({ message: "Aluno não autenticado." });
    if (!Types.ObjectId.isValid(sessionId)) return res.status(400).json({ message: "ID da sessão inválido." });

    try {
        const sessao = await Sessao.findOne({ _id: sessionId, alunoId: new Types.ObjectId(alunoId) });
        if (!sessao) {
            return res.status(404).json({ message: "Sessão não encontrada ou não pertence a este aluno." });
        }
        if (pseAluno) sessao.pseAluno = pseAluno as OpcaoPSE;
        if (comentarioAluno !== undefined) sessao.comentarioAluno = comentarioAluno;
        await sessao.save();
        res.status(200).json({ message: "Feedback atualizado com sucesso.", _id: sessao._id, pseAluno: sessao.pseAluno, comentarioAluno: sessao.comentarioAluno });
    } catch (error) {
        next(error);
    }
});

export default router;