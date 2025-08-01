// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import WorkoutLog from '../../models/WorkoutLog.js';
import { startOfWeek, endOfWeek, differenceInCalendarDays, parseISO } from 'date-fns';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos, checkCanActivateStudent } from '../../middlewares/checkLimiteAlunos.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================

// POST /api/aluno/convite - Gera um link de convite para aluno
router.post("/convite", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Personal não autenticado." });
    }

    try {
        const { emailConvidado } = req.body;

        if (emailConvidado) {
            const alunoExistente = await Aluno.findOne({ email: emailConvidado, trainerId });
            if (alunoExistente) {
                return res.status(409).json({ erro: "Este aluno já está cadastrado com você." });
            }

            const convitePendente = await ConviteAluno.findOne({ emailConvidado, status: 'pendente', criadoPor: trainerId });
            if (convitePendente) {
                // CORREÇÃO: Link corrigido para corresponder à rota do frontend
                const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${convitePendente.token}`;
                return res.status(200).json({ mensagem: "Já existe um convite pendente para este email.", linkConvite });
            }
        }

        const novoConvite = new ConviteAluno({
            emailConvidado: emailConvidado || undefined,
            criadoPor: new mongoose.Types.ObjectId(trainerId)
        });

        await novoConvite.save();
        // CORREÇÃO: Link corrigido para corresponder à rota do frontend
        const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${novoConvite.token}`;
        res.status(201).json({ mensagem: "Link de convite gerado com sucesso!", linkConvite });

    } catch (error) {
        next(error);
    }
});

// GET /api/aluno/gerenciar - Lista todos os alunos do personal
router.get("/gerenciar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    try {
        const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    } catch (error) {
        next(error);
    }
});

// POST /api/aluno/gerenciar - Criar um novo aluno
router.post("/gerenciar", authenticateToken, checkLimiteAlunos, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    try {
        const { nome, email, password, phone, birthDate, goal, weight, height, startDate } = req.body;

        if (!nome || !email || !password) {
            return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });
        }

        const alunoExistente = await Aluno.findOne({ email: email.toLowerCase() });
        if (alunoExistente) {
            return res.status(409).json({ erro: "Já existe um aluno com este email." });
        }

        const novoAluno = new Aluno({
            nome,
            email: email.toLowerCase(),
            passwordHash: password,
            trainerId: new mongoose.Types.ObjectId(trainerId),
            phone,
            birthDate: birthDate ? new Date(birthDate) : undefined,
            goal,
            weight: weight ? parseFloat(weight) : undefined,
            height: height ? parseInt(height) : undefined,
            startDate: startDate ? new Date(startDate) : new Date(),
            status: 'active'
        });

        await novoAluno.save();
        const alunoResponse = novoAluno.toObject();
        delete alunoResponse.passwordHash;

        res.status(201).json({ 
            mensagem: "Aluno criado com sucesso!", 
            aluno: alunoResponse 
        });

    } catch (error) {
        next(error);
    }
});

export default router;