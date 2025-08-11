// server/src/routes/tokenRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
// A importação correta, dando um nome (alias) para a instância padrão exportada
import tokenAssignmentService from '../../services/TokenAssignmentService.js'; 
import Aluno from '../../models/Aluno.js';

const router = express.Router();

// ROTA PARA BUSCAR DETALHES DO TOKEN DE UM ALUNO ESPECÍFICO
router.get('/student/:studentId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { studentId } = req.params;
        const personalId = req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ message: 'ID do aluno inválido.' });
        }

        // Validação de segurança: Verificar se o aluno pertence ao personal logado
        const aluno = await Aluno.findOne({ _id: studentId, trainerId: personalId });
        if (!aluno) {
            return res.status(404).json({ message: 'Aluno não encontrado ou não pertence a este personal trainer.' });
        }

        // Agora usamos o nome da instância importada
        const token = await tokenAssignmentService.getStudentAssignedToken(studentId);

        if (!token) {
            console.log(`[TokenRoutes] Nenhum token encontrado para o aluno: ${studentId}`);
            return res.status(404).json({ message: 'Token não encontrado para este aluno' });
        }

        console.log(`[TokenRoutes] Token encontrado para o aluno ${studentId}:`, (token as any).id || token._id);
        res.status(200).json(token);

    } catch (error) {
        console.error('[TokenRoutes] Erro ao buscar token do aluno:', error);
        next(error);
    }
});

export default router;