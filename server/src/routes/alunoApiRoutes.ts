// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao, { OPCOES_PSE } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos, checkCanSendInvite } from '../../middlewares/checkLimiteAlunos.js';
import TokenAssignmentService, { getTokenExpirationDate } from '../../services/TokenAssignmentService.js';
import StudentResourceValidationService from '../../services/StudentResourceValidationService.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================

// POST /api/aluno/convite - Gera um link de convite para aluno
router.post("/convite", authenticateToken, checkCanSendInvite, async (req: Request, res: Response, next: NextFunction) => {
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
        }

        const novoConvite = new ConviteAluno({
            emailConvidado: emailConvidado || undefined,
            criadoPor: new mongoose.Types.ObjectId(trainerId)
        });

        await novoConvite.save();
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
        const { nome, email, password, ...outrosCampos } = req.body;

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
            ...outrosCampos,
            status: 'active'
        });

        await novoAluno.save();
        const alunoResponse = novoAluno.toObject();
        delete alunoResponse.passwordHash;
        
        const studentId = (novoAluno._id as mongoose.Types.ObjectId).toString();
        
        const validationResult = (req as any).resourceValidation;
        let assignmentResult: any;

        if (validationResult && validationResult.isValid) {
             if (validationResult.resourceType === 'plan') {
                assignmentResult = await TokenAssignmentService.assignPlanSlotToStudent(trainerId, studentId);
            } else if (validationResult.resourceType === 'token') {
                assignmentResult = await TokenAssignmentService.assignTokenToStudent(trainerId, studentId);
            } else {
                 assignmentResult = { success: false, message: 'Tipo de recurso desconhecido após validação.' };
            }
        } else {
             assignmentResult = { success: false, message: 'Validação de recurso falhou ou não foi executada.' };
        }
        
        console.log(`[AlunoCreation] ✅ Atribuição de recurso finalizada:`, assignmentResult);

        res.status(201).json({
            mensagem: "Aluno criado com sucesso!",
            aluno: alunoResponse,
            resourceAssignment: assignmentResult
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/aluno/gerenciar/:id - Buscar um aluno específico
router.get("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (código existente sem alterações)
});

// PUT /api/aluno/gerenciar/:id - Atualizar um aluno existente
router.put("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (código existente sem o middleware checkStudentStatusChange)
});

// DELETE /api/aluno/gerenciar/:id - Excluir um aluno
router.delete("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... (código existente sem alterações)
});

// ... (Restante das rotas do aluno sem alterações)

export default router;