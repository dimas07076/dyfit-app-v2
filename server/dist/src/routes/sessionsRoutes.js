// server/src/routes/sessionsRoutes.ts
import express from 'express';
import mongoose, { Types } from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import Sessao from '../../models/Sessao.js';
import Treino from '../../models/Treino.js';
import dbConnect from '../../lib/dbConnect.js';
const router = express.Router();
// =======================================================
// ROTAS DO PERSONAL
// =======================================================
// (Rotas do personal omitidas por brevidade, permanecem inalteradas)
router.get('/', authenticateToken, async (req, res, next) => {
    // ... código original inalterado ...
});
router.post('/', authenticateToken, async (req, res, next) => {
    // ... código original inalterado ...
});
router.put('/:sessionId', authenticateToken, async (req, res, next) => {
    // ... código original inalterado ...
});
router.delete('/:sessionId', authenticateToken, async (req, res, next) => {
    // ... código original inalterado ...
});
// =======================================================
// ROTAS DO ALUNO
// =======================================================
router.post('/aluno/concluir-dia', authenticateAlunoToken, async (req, res, next) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    // <-- 1. MUDANÇA: Recebe 'dataInicio' do corpo da requisição -->
    const { rotinaId, diaDeTreinoId, pseAluno, comentarioAluno, duracaoSegundos, cargas, dataInicio } = req.body;
    if (!alunoId)
        return res.status(401).json({ message: "Aluno não autenticado." });
    if (!rotinaId || !diaDeTreinoId)
        return res.status(400).json({ message: "ID da rotina e do dia de treino são obrigatórios." });
    // <-- 2. MUDANÇA: Validação para o novo campo 'dataInicio' -->
    if (!dataInicio) {
        return res.status(400).json({ message: "A data de início do treino é obrigatória." });
    }
    const dataInicioValida = new Date(dataInicio);
    if (isNaN(dataInicioValida.getTime())) {
        return res.status(400).json({ message: "Formato de data de início inválido." });
    }
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
        const diaConcluidoIndex = rotina.diasDeTreino.findIndex(d => d._id.toString() === diaDeTreinoId);
        if (diaConcluidoIndex > -1) {
            const [diaMovido] = rotina.diasDeTreino.splice(diaConcluidoIndex, 1);
            rotina.diasDeTreino.push(diaMovido);
            rotina.diasDeTreino.forEach((dia, index) => {
                dia.ordemNaRotina = index;
            });
        }
        const novaSessao = new Sessao({
            personalId: rotina.criadorId,
            alunoId: new Types.ObjectId(alunoId),
            // <-- 3. MUDANÇA: Usa a data de início recebida do frontend -->
            sessionDate: dataInicioValida,
            concluidaEm: new Date(), // A data de conclusão é sempre o momento atual
            status: 'completed',
            tipoCompromisso: 'treino',
            rotinaId: rotina._id,
            diaDeTreinoId: diaDeTreino._id,
            diaDeTreinoIdentificador: diaDeTreino.identificadorDia,
            pseAluno: pseAluno || null,
            comentarioAluno: comentarioAluno || null,
            duracaoSegundos: duracaoSegundos || 0,
            cargasExecutadas: cargas || {},
        });
        await novaSessao.save({ session: mongoTransactionSession });
        rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
        await rotina.save({ session: mongoTransactionSession });
        await mongoTransactionSession.commitTransaction();
        res.status(201).json({ message: "Dia de treino concluído com sucesso!", _id: novaSessao._id, status: novaSessao.status, concluidaEm: novaSessao.concluidaEm });
    }
    catch (error) {
        if (mongoTransactionSession.inTransaction())
            await mongoTransactionSession.abortTransaction();
        next(error);
    }
    finally {
        await mongoTransactionSession.endSession();
    }
});
router.patch('/:sessionId/feedback', authenticateAlunoToken, async (req, res, next) => {
    // ... código original inalterado ...
});
export default router;
