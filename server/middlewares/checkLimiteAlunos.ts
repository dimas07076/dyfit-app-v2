// server/middlewares/checkLimiteAlunos.ts
import { Request, Response, NextFunction } from 'express';
import PlanoService from '../services/PlanoService.js';

/**
 * Middleware to check if personal trainer can activate more students
 */
export const checkLimiteAlunos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        // Skip check for admins
        if (req.user?.role === 'admin') {
            return next();
        }

        // Get requested quantity from body or default to 1
        const quantidadeDesejada = req.body.quantidade || 1;

        const status = await PlanoService.canActivateMoreStudents(personalTrainerId, quantidadeDesejada);

        if (!status.canActivate) {
            return res.status(403).json({
                message: 'Limite de alunos ativos excedido',
                code: 'STUDENT_LIMIT_EXCEEDED',
                data: {
                    currentLimit: status.currentLimit,
                    activeStudents: status.activeStudents,
                    availableSlots: status.availableSlots,
                    requestedQuantity: quantidadeDesejada
                }
            });
        }

        // Add status to request for potential use in controller
        (req as any).studentLimitStatus = status;
        next();
    } catch (error) {
        console.error('Error in checkLimiteAlunos middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware to check if personal trainer can activate a specific student
 * Used when activating an existing inactive student
 */
export const checkCanActivateStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        // Skip check for admins
        if (req.user?.role === 'admin') {
            return next();
        }

        const status = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);

        if (!status.canActivate) {
            return res.status(403).json({
                message: 'Não é possível ativar mais alunos. Limite excedido.',
                code: 'STUDENT_LIMIT_EXCEEDED',
                data: {
                    currentLimit: status.currentLimit,
                    activeStudents: status.activeStudents,
                    availableSlots: status.availableSlots
                }
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkCanActivateStudent middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};