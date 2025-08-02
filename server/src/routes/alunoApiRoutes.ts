// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao, { OPCOES_PSE } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import { startOfWeek, endOfWeek, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos } from '../../middlewares/checkLimiteAlunos.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================

// POST /api/aluno/convite
router.post("/convite", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Personal não autenticado." });

    try {
        const { emailConvidado } = req.body;
        if (emailConvidado) {
            const alunoExistente = await Aluno.findOne({ email: emailConvidado, trainerId });
            if (alunoExistente) return res.status(409).json({ erro: "Este aluno já está cadastrado com você." });
            const convitePendente = await ConviteAluno.findOne({ emailConvidado, status: 'pendente', criadoPor: trainerId });
            if (convitePendente) {
                const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${convitePendente.token}`;
                return res.status(200).json({ mensagem: "Já existe um convite pendente para este email.", linkConvite });
            }
        }
        const novoConvite = new ConviteAluno({ emailConvidado: emailConvidado || undefined, criadoPor: new mongoose.Types.ObjectId(trainerId) });
        await novoConvite.save();
        const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${novoConvite.token}`;
        res.status(201).json({ mensagem: "Link de convite gerado com sucesso!", linkConvite });
    } catch (error) { next(error); }
});

// GET /api/aluno/gerenciar
router.get("/gerenciar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    try {
        const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    } catch (error) { next(error); }
});

// <<< ROTA ADICIONADA >>>
// GET /api/aluno/gerenciar/:id
router.get("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const { id: alunoId } = req.params;
    if (!trainerId) return res.status(401).json({ erro: "Personal não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(alunoId)) return res.status(400).json({ erro: "ID de aluno inválido." });

    try {
        const aluno = await Aluno.findOne({ _id: alunoId, trainerId }).select('-passwordHash');
        if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou não pertence a este personal." });
        res.status(200).json(aluno);
    } catch (error) { next(error); }
});

// POST /api/aluno/gerenciar
router.post("/gerenciar", authenticateToken, checkLimiteAlunos, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });

    try {
        const { nome, email, password } = req.body;
        if (!nome || !email || !password) return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });

        const alunoExistente = await Aluno.findOne({ email: email.toLowerCase() });
        if (alunoExistente) return res.status(409).json({ erro: "Já existe um aluno com este email." });

        const novoAluno = new Aluno({ ...req.body, trainerId: new mongoose.Types.ObjectId(trainerId), passwordHash: password });
        await novoAluno.save();
        const alunoResponse = novoAluno.toObject();
        delete alunoResponse.passwordHash;
        res.status(201).json({ mensagem: "Aluno criado com sucesso!", aluno: alunoResponse });
    } catch (error) { next(error); }
});

// <<< ROTA ADICIONADA >>>
// PUT /api/aluno/gerenciar/:id
router.put("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const { id: alunoId } = req.params;
    if (!trainerId) return res.status(401).json({ erro: "Personal não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(alunoId)) return res.status(400).json({ erro: "ID de aluno inválido." });

    try {
        const { password, ...updateData } = req.body;
        if (password) {
            // Se uma nova senha for fornecida, ela precisa ser hasheada.
            // O hook 'pre-save' do Mongoose cuida disso automaticamente.
            const alunoParaAtualizar = await Aluno.findOne({ _id: alunoId, trainerId: new mongoose.Types.ObjectId(trainerId) });
            if(!alunoParaAtualizar) return res.status(404).json({ erro: "Aluno não encontrado." });

            Object.assign(alunoParaAtualizar, updateData);
            alunoParaAtualizar.passwordHash = password; // Atribui a nova senha
            await alunoParaAtualizar.save();

            const alunoResponse = alunoParaAtualizar.toObject();
            delete alunoResponse.passwordHash;
            return res.status(200).json({ mensagem: "Aluno atualizado com sucesso!", aluno: alunoResponse });
        }

        // Se não houver nova senha, faz uma atualização simples
        const alunoAtualizado = await Aluno.findOneAndUpdate(
            { _id: alunoId, trainerId: new mongoose.Types.ObjectId(trainerId) },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!alunoAtualizado) return res.status(404).json({ erro: "Aluno não encontrado ou não pertence a este personal." });
        res.status(200).json({ mensagem: "Aluno atualizado com sucesso!", aluno: alunoAtualizado });
    } catch (error: any) {
        if (error.code === 11000) return res.status(409).json({ erro: "O email fornecido já está em uso." });
        next(error);
    }
});

// =======================================================
// ROTAS DO ALUNO (EXISTENTES - INALTERADAS)
// =======================================================
// ... (código das rotas do aluno que já funcionam)
router.get('/meus-treinos', authenticateAlunoToken, async (req, res, next) => { /* ... */ });
router.get('/meus-treinos/:id', authenticateAlunoToken, async (req, res, next) => { /* ... */ });
router.get('/minhas-sessoes-concluidas-na-semana', authenticateAlunoToken, async (req, res, next) => { /* ... */ });
router.get('/stats-progresso', authenticateAlunoToken, async (req, res, next) => { /* ... */ });
router.get('/meu-historico-sessoes', authenticateAlunoToken, async (req, res, next) => { /* ... */ });


export default router;