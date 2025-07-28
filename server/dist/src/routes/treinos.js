// server/src/routes/treinos.ts
import express from "express";
import mongoose, { Types } from "mongoose";
import Treino from "../../models/Treino.js";
import PastaTreino from '../../models/Pasta.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
const router = express.Router();
router.get("/", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const criadorId = req.user?.id;
        if (!criadorId)
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        const query = { criadorId: new Types.ObjectId(criadorId) };
        if (req.query.tipo) {
            query.tipo = req.query.tipo;
        }
        const rotinas = await Treino.find(query)
            .populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        })
            .sort({ tipo: 1, atualizadoEm: -1 });
        res.status(200).json(rotinas);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const { id } = req.params;
        const criadorId = req.user?.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ mensagem: "ID da rotina inválido." });
        }
        if (!criadorId) {
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        }
        const rotina = await Treino.findOne({ _id: id, criadorId: new Types.ObjectId(criadorId) })
            .populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        });
        if (!rotina) {
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });
        }
        res.status(200).json(rotina);
    }
    catch (error) {
        next(error);
    }
});
router.post("/", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const criadorId = req.user?.id;
        if (!criadorId)
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        const dadosRotina = { ...req.body, criadorId: new Types.ObjectId(criadorId), isCopied: false };
        const novaRotina = new Treino(dadosRotina);
        await novaRotina.save();
        const rotinaPopulada = await Treino.findById(novaRotina._id)
            .populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        });
        res.status(201).json(rotinaPopulada);
    }
    catch (error) {
        next(error);
    }
});
router.post("/associar-modelo", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const { fichaModeloId, alunoId } = req.body;
        const criadorId = req.user?.id;
        if (!criadorId)
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        if (!mongoose.Types.ObjectId.isValid(fichaModeloId) || !mongoose.Types.ObjectId.isValid(alunoId)) {
            return res.status(400).json({ mensagem: "IDs inválidos fornecidos." });
        }
        const fichaModelo = await Treino.findOne({ _id: fichaModeloId, criadorId: new Types.ObjectId(criadorId), tipo: 'modelo' });
        if (!fichaModelo)
            return res.status(404).json({ mensagem: "Ficha modelo não encontrada ou você não tem permissão para usá-la." });
        const { _id, criadoEm, atualizadoEm, diasDeTreino, ...modeloRestante } = fichaModelo.toObject();
        const newFichaData = {
            ...modeloRestante,
            tipo: 'individual',
            criadorId: new Types.ObjectId(criadorId),
            alunoId: new Types.ObjectId(alunoId),
            pastaId: null,
            titulo: modeloRestante.titulo,
            isCopied: true,
            diasDeTreino: diasDeTreino?.map((dia) => ({
                identificadorDia: dia.identificadorDia,
                nomeSubFicha: dia.nomeSubFicha,
                ordemNaRotina: dia.ordemNaRotina,
                exerciciosDoDia: dia.exerciciosDoDia?.map((ex) => {
                    const exercicioIdValue = typeof ex.exercicioId === 'object' && ex.exercicioId?._id
                        ? ex.exercicioId._id.toString() : ex.exercicioId.toString();
                    return {
                        exercicioId: new Types.ObjectId(exercicioIdValue),
                        series: ex.series,
                        repeticoes: ex.repeticoes,
                        carga: ex.carga,
                        descanso: ex.descanso,
                        observacoes: ex.observacoes,
                        ordemNoDia: ex.ordemNoDia,
                        concluido: false
                    };
                }) ?? []
            })) ?? []
        };
        const novaFichaIndividual = new Treino(newFichaData);
        await novaFichaIndividual.save();
        const fichaPopulada = await Treino.findById(novaFichaIndividual._id)
            .populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        });
        res.status(201).json(fichaPopulada);
    }
    catch (error) {
        console.error("Erro ao associar modelo de treino ao aluno:", error);
        next(error);
    }
});
// <<< INÍCIO DA ROTA CORRIGIDA >>>
// Esta rota agora CRIA um novo modelo a partir de uma rotina existente, em vez de modificá-la.
router.post("/:id/tornar-modelo", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const { id } = req.params;
        const criadorId = req.user?.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ mensagem: "ID da rotina inválido." });
        }
        if (!criadorId) {
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        }
        // 1. Encontra a rotina original para copiar. Pode ser 'individual' ou 'modelo'.
        const rotinaOriginal = await Treino.findOne({ _id: id, criadorId: new Types.ObjectId(criadorId) });
        if (!rotinaOriginal) {
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para copiá-la." });
        }
        // 2. Cria uma cópia profunda da rotina, removendo campos específicos.
        const { _id, criadoEm, atualizadoEm, alunoId, pastaId, ...restanteDaRotina } = rotinaOriginal.toObject();
        const novaRotinaModeloData = {
            ...restanteDaRotina,
            tipo: 'modelo', // Define o tipo como 'modelo'
            alunoId: null, // Remove a associação com o aluno
            pastaId: null, // Remove a associação com pasta
            titulo: restanteDaRotina.titulo, // Mantém o título original
            isCopied: true, // Marca como uma cópia
            diasDeTreino: restanteDaRotina.diasDeTreino?.map((dia) => ({
                identificadorDia: dia.identificadorDia,
                nomeSubFicha: dia.nomeSubFicha,
                ordemNaRotina: dia.ordemNaRotina,
                exerciciosDoDia: dia.exerciciosDoDia?.map((ex) => {
                    const exercicioIdValue = typeof ex.exercicioId === 'object' && ex.exercicioId?._id
                        ? ex.exercicioId._id.toString() : ex.exercicioId.toString();
                    return {
                        exercicioId: new Types.ObjectId(exercicioIdValue),
                        series: ex.series,
                        repeticoes: ex.repeticoes,
                        carga: ex.carga,
                        descanso: ex.descanso,
                        observacoes: ex.observacoes,
                        ordemNoDia: ex.ordemNoDia,
                        concluido: false
                    };
                }) ?? []
            })) ?? []
        };
        // 3. Salva a nova rotina como um novo documento.
        const novaRotinaModelo = new Treino(novaRotinaModeloData);
        await novaRotinaModelo.save();
        // 4. Popula e retorna o NOVO modelo criado.
        const rotinaPopulada = await Treino.findById(novaRotinaModelo._id)
            .populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        });
        res.status(201).json(rotinaPopulada); // Usa 201 Created para indicar criação de novo recurso
    }
    catch (error) {
        console.error("Erro ao copiar rotina para modelo:", error);
        next(error);
    }
});
// <<< FIM DA ROTA CORRIGIDA >>>
router.put("/:id", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const { id } = req.params;
        const criadorId = req.user?.id;
        if (!mongoose.Types.ObjectId.isValid(id) || !criadorId)
            return res.status(400).json({ mensagem: "Requisição inválida." });
        const rotina = await Treino.findOneAndUpdate({ _id: id, criadorId: new Types.ObjectId(criadorId) }, { $set: req.body }, { new: true, runValidators: true }).populate({ path: 'alunoId', select: 'nome' })
            .populate({ path: 'pastaId', select: 'nome' })
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        });
        if (!rotina)
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });
        res.status(200).json(rotina);
    }
    catch (error) {
        next(error);
    }
});
router.put("/:id/pasta", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const { id: rotinaId } = req.params;
    const { pastaId } = req.body;
    const criadorId = req.user?.id;
    if (!criadorId || !mongoose.Types.ObjectId.isValid(rotinaId))
        return res.status(400).json({ mensagem: "ID da rotina inválido ou usuário não autenticado." });
    if (pastaId && !mongoose.Types.ObjectId.isValid(pastaId))
        return res.status(400).json({ mensagem: "ID da pasta inválido." });
    try {
        if (pastaId) {
            const pastaDestino = await PastaTreino.findOne({ _id: pastaId, criadorId: criadorId });
            if (!pastaDestino)
                return res.status(404).json({ mensagem: "Pasta de destino não encontrada ou você não tem permissão para usá-la." });
        }
        const rotinaAtualizada = await Treino.findOneAndUpdate({ _id: rotinaId, criadorId: criadorId }, { $set: { pastaId: pastaId ? new Types.ObjectId(pastaId) : null } }, { new: true }).populate('pastaId', 'nome')
            .populate({
            path: 'diasDeTreino',
            populate: { path: 'exerciciosDoDia.exercicioId', model: 'Exercicio', select: 'nome urlVideo' }
        });
        if (!rotinaAtualizada)
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão para movê-la." });
        res.status(200).json(rotinaAtualizada);
    }
    catch (error) {
        next(error);
    }
});
router.delete("/:id", authenticateToken, async (req, res, next) => {
    await dbConnect();
    try {
        const { id } = req.params;
        const criadorId = req.user?.id;
        if (!mongoose.Types.ObjectId.isValid(id) || !criadorId)
            return res.status(400).json({ mensagem: "Requisição inválida." });
        const resultado = await Treino.findOneAndDelete({ _id: id, criadorId: new Types.ObjectId(criadorId) });
        if (!resultado)
            return res.status(404).json({ mensagem: "Rotina não encontrada ou você não tem permissão." });
        res.status(200).json({ mensagem: "Rotina excluída com sucesso." });
    }
    catch (error) {
        next(error);
    }
});
export default router;
