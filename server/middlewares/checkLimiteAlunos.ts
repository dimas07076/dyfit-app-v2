// server/middlewares/checkLimiteAlunos.ts
import { Request, Response, NextFunction } from 'express';
import SlotManagementService from '../services/SlotManagementService.js';

/**
 * Enhanced middleware to check if personal trainer can activate more students
 * Now uses the new slot management system
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

        // Check slot availability using new system
        const slotResult = await SlotManagementService.verificarSlotDisponivel(personalTrainerId);

        if (!slotResult.slotsDisponiveis) {
            return res.status(403).json({
                message: slotResult.message,
                code: 'STUDENT_LIMIT_EXCEEDED',
                details: slotResult.details
            });
        }

        // Add slot info to request for use in controller
        (req as any).slotInfo = slotResult.slotInfo;
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
 * Enhanced middleware to check if personal trainer can activate a specific student
 * Used when activating an existing inactive student
 */
export const checkCanActivateStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        const alunoId = req.params.id;
        
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

        if (!alunoId) {
            return res.status(400).json({
                message: 'ID do aluno é obrigatório',
                code: 'MISSING_STUDENT_ID'
            });
        }

        // Check if student can be reactivated
        const reactivationResult = await SlotManagementService.podeReativarAluno(alunoId);
        
        if (!reactivationResult.podeReativar && !reactivationResult.novaAssociacaoNecessaria) {
            return res.status(403).json({
                message: reactivationResult.motivoNegacao || 'Não é possível reativar este aluno',
                code: 'REACTIVATION_DENIED'
            });
        }

        // If new association is needed, check for available slots
        if (reactivationResult.novaAssociacaoNecessaria) {
            const slotResult = await SlotManagementService.verificarSlotDisponivel(personalTrainerId);
            
            if (!slotResult.slotsDisponiveis) {
                return res.status(403).json({
                    message: 'Não é possível reativar: ' + slotResult.message,
                    code: 'STUDENT_LIMIT_EXCEEDED',
                    details: slotResult.details
                });
            }
            
            // Add slot info for new association
            (req as any).newSlotInfo = slotResult.slotInfo;
        }

        (req as any).reactivationResult = reactivationResult;
        next();
    } catch (error) {
        console.error('Error in checkCanActivateStudent middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware to validate token management requests
 */
export const validateTokenRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { quantidade } = req.body;
        
        if (!quantidade || typeof quantidade !== 'number') {
            return res.status(400).json({
                message: 'Quantidade é obrigatória e deve ser um número',
                code: 'INVALID_QUANTITY'
            });
        }

        if (quantidade < 1 || quantidade > 100) {
            return res.status(400).json({
                message: 'Quantidade deve ser entre 1 e 100',
                code: 'QUANTITY_OUT_OF_RANGE'
            });
        }

        next();
    } catch (error) {
        console.error('Error in validateTokenRequest middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware to validate plan assignment requests
 */
export const validatePlanAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { planoId, customDuration } = req.body;
        const { personalId } = req.params;
        
        if (!planoId) {
            return res.status(400).json({
                message: 'ID do plano é obrigatório',
                code: 'MISSING_PLAN_ID'
            });
        }

        if (!personalId) {
            return res.status(400).json({
                message: 'ID do personal trainer é obrigatório',
                code: 'MISSING_PERSONAL_ID'
            });
        }

        if (customDuration && (typeof customDuration !== 'number' || customDuration < 1 || customDuration > 365)) {
            return res.status(400).json({
                message: 'Duração personalizada deve ser entre 1 e 365 dias',
                code: 'INVALID_CUSTOM_DURATION'
            });
        }

        next();
    } catch (error) {
        console.error('Error in validatePlanAssignment middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};