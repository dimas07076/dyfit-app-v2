// server/middlewares/checkLimiteAlunos.ts
import { Request, Response, NextFunction } from 'express';
// CORREÇÃO: Importa a instância padrão do serviço, não uma exportação nomeada.
import StudentResourceValidationService from '../services/StudentResourceValidationService.js';

/**
 * Middleware ajustado para verificar se o personal trainer pode usar um recurso de aluno.
 */
export const checkLimiteAlunos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        console.log(`[checkLimiteAlunos] 🔍 Middleware de verificação de limite executado para o personal: ${personalTrainerId}`);
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        if (req.user?.role === 'admin') {
            console.log(`[checkLimiteAlunos] 👑 Usuário admin, verificação de limite ignorada.`);
            return next();
        }

        const validation = await StudentResourceValidationService.validateResourceForNewStudent(personalTrainerId);
        
        console.log(`[checkLimiteAlunos] 📊 Resultado da validação:`, validation);

        if (!validation.isValid) {
            console.log(`[checkLimiteAlunos] 🚫 Validação falhou, bloqueando a requisição.`);
            return res.status(403).json({
                success: false,
                message: validation.message,
                code: 'LIMIT_EXCEEDED',
            });
        }
        
        // Anexa o resultado da validação ao objeto 'req' para que a rota possa usá-lo.
        (req as any).resourceValidation = validation;

        console.log(`[checkLimiteAlunos] ✅ Validação aprovada, permitindo a requisição.`);
        next();

    } catch (error) {
        console.error('[checkLimiteAlunos] ❌ Erro no middleware:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor ao verificar limite de alunos',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware para verificar se o personal trainer pode ativar um aluno inativo.
 */
export const checkCanActivateStudent = async (req: Request, res: Response, next: NextFunction) => {
    console.log("[checkCanActivateStudent] Redirecionando para a verificação de limite padrão.");
    return checkLimiteAlunos(req, res, next);
};

/**
 * Middleware para verificar se o personal trainer pode enviar convites.
 */
export const checkCanSendInvite = async (req: Request, res: Response, next: NextFunction) => {
    console.log("[checkCanSendInvite] Redirecionando para a verificação de limite padrão.");
    return checkLimiteAlunos(req, res, next);
};