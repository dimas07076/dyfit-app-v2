// server/src/routes/exercicios.ts
import express from "express";
import mongoose from "mongoose";
import Exercicio from "../../models/Exercicio.js";
import Treino from "../../models/Treino.js";
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
const router = express.Router();
// Função auxiliar de filtro
const buildFilterQuery = (baseFilter, req) => {
    const query = { ...baseFilter };
    const { grupo, categoria } = req.query;
    if (grupo && typeof grupo === 'string' && grupo !== 'all')
        query.grupoMuscular = grupo;
    if (categoria && typeof categoria === 'string' && categoria !== 'all')
        query.categoria = categoria;
    return query;
};
// <<< CONSOLIDAÇÃO: Nova rota GET /biblioteca para todos os tipos de filtro >>>
router.get("/biblioteca", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const userId = req.user?.id;
    try {
        if (!userId)
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        const { tipo } = req.query; // 'todos', 'app', 'meus', 'favoritos'
        let baseFilter = {};
        switch (tipo) {
            case 'app':
                baseFilter.isCustom = { $ne: true }; // Exercícios do App (não personalizados)
                break;
            case 'meus':
                baseFilter.isCustom = true; // Exercícios personalizados
                baseFilter.creatorId = new mongoose.Types.ObjectId(userId); // Apenas os do usuário logado
                break;
            case 'favoritos':
                baseFilter.favoritedBy = new mongoose.Types.ObjectId(userId); // Exercícios favoritados pelo usuário
                break;
            case 'todos':
            default:
                // Retorna todos os exercícios do App + os personalizados do usuário logado
                baseFilter.$or = [
                    { isCustom: { $ne: true } },
                    { isCustom: true, creatorId: new mongoose.Types.ObjectId(userId) }
                ];
                break;
        }
        const finalFilterQuery = buildFilterQuery(baseFilter, req);
        // Busca os exercícios com os filtros aplicados
        const exercicios = await Exercicio.find(finalFilterQuery).lean();
        // Adiciona a flag isFavoritedByCurrentUser para cada exercício
        const exerciciosComFavorito = exercicios.map(ex => ({
            ...ex,
            isFavoritedByCurrentUser: ex.favoritedBy?.some(favId => favId.equals(new mongoose.Types.ObjectId(userId))) ?? false
        }));
        res.status(200).json(exerciciosComFavorito);
    }
    catch (error) {
        console.error("Erro ao buscar exercícios da biblioteca:", error);
        next(error);
    }
});
// As rotas GET /app, /meus, /favoritos foram consolidadas na rota /biblioteca e podem ser removidas se não houver outro uso.
// Se ainda houver outros usos específicos, elas podem ser mantidas, mas a rota /biblioteca é a principal para o modal.
// POST / - Criar um novo exercício
router.post("/", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const { nome, descricao, categoria, grupoMuscular, urlVideo, isCustom } = req.body;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    if (!requesterId)
        return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!nome)
        return res.status(400).json({ erro: "O nome do exercício é obrigatório." });
    try {
        const exercicioData = {
            nome: nome.trim(), descricao, categoria, grupoMuscular, urlVideo, isCustom
        };
        if (isCustom === false) {
            if (requesterRole?.toLowerCase() !== 'admin') {
                return res.status(403).json({ erro: "Apenas administradores podem criar exercícios do App." });
            }
            exercicioData.creatorId = undefined;
        }
        else {
            exercicioData.isCustom = true;
            exercicioData.creatorId = new mongoose.Types.ObjectId(requesterId);
            const jaExiste = await Exercicio.findOne({ nome: nome.trim(), creatorId: exercicioData.creatorId });
            if (jaExiste)
                return res.status(409).json({ erro: "Você já possui um exercício personalizado com esse nome." });
        }
        const novoExercicio = await Exercicio.create(exercicioData);
        res.status(201).json(novoExercicio);
    }
    catch (error) {
        next(error);
    }
});
// PUT /:id - Atualizar um exercício
router.put("/:id", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const { id } = req.params;
    const updates = req.body;
    if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ erro: "ID inválido." });
    if (!requesterId)
        return res.status(401).json({ erro: "Não autorizado." });
    try {
        const exercicio = await Exercicio.findById(id);
        if (!exercicio)
            return res.status(404).json({ erro: "Exercício não encontrado." });
        const isOwner = exercicio.creatorId?.equals(new mongoose.Types.ObjectId(requesterId));
        const isAdmin = requesterRole?.toLowerCase() === 'admin';
        if ((exercicio.isCustom && isOwner) || (!exercicio.isCustom && isAdmin)) {
            Object.assign(exercicio, updates);
            await exercicio.save();
            res.status(200).json(exercicio);
        }
        else {
            return res.status(403).json({ erro: "Permissão negada para editar este exercício." });
        }
    }
    catch (error) {
        next(error);
    }
});
// DELETE /:id - Deletar um exercício
router.delete("/:id", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ erro: "ID inválido." });
    if (!requesterId)
        return res.status(401).json({ erro: "Não autorizado." });
    try {
        const exercicio = await Exercicio.findById(id);
        if (!exercicio)
            return res.status(404).json({ erro: "Exercício não encontrado." });
        const isOwner = exercicio.creatorId?.equals(new mongoose.Types.ObjectId(requesterId));
        const isAdmin = requesterRole?.toLowerCase() === 'admin';
        if ((exercicio.isCustom && isOwner) || (!exercicio.isCustom && isAdmin)) {
            // <<< CORREÇÃO: Lógica de remoção em cascata >>>
            const exercicioId = new mongoose.Types.ObjectId(id);
            // 1. Remove o exercício de todas as rotinas
            await Treino.updateMany({ "diasDeTreino.exerciciosDoDia.exercicioId": exercicioId }, { $pull: { "diasDeTreino.$[].exerciciosDoDia": { exercicioId: exercicioId } } });
            // 2. Deleta o exercício principal
            await exercicio.deleteOne();
            res.status(200).json({ message: "Exercício deletado com sucesso e removido de todas as rotinas." });
        }
        else {
            return res.status(403).json({ erro: "Permissão negada para deletar este exercício." });
        }
    }
    catch (error) {
        next(error);
    }
});
// ... (rotas de favorite/unfavorite permanecem inalteradas)
// POST /:id/favorite - Favoritar
router.post("/:id/favorite", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !userId)
        return res.status(400).json({ erro: "Requisição inválida." });
    try {
        await Exercicio.updateOne({ _id: id }, { $addToSet: { favoritedBy: new mongoose.Types.ObjectId(userId) } });
        res.status(200).json({ message: "Exercício favoritado." });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /:id/favorite - Desfavoritar
router.delete("/:id/favorite", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const userId = req.user?.id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !userId)
        return res.status(400).json({ erro: "Requisição inválida." });
    try {
        await Exercicio.updateOne({ _id: id }, { $pull: { favoritedBy: new mongoose.Types.ObjectId(userId) } });
        res.status(200).json({ message: "Exercício desfavoritado." });
    }
    catch (error) {
        next(error);
    }
});
export default router;
