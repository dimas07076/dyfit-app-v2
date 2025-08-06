// server/middlewares/checkLimiteAlunos.ts
import { Request, Response, NextFunction } from 'express';
import PlanoService from '../services/PlanoService.js';
import StudentLimitService from '../services/StudentLimitService.js';

/**
 * Enhanced middleware to check if personal trainer can activate more students
 * Uses StudentLimitService for comprehensive validation
 */
export const checkLimiteAlunos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        console.log(`[checkLimiteAlunos] 🔍 Middleware called for personal: ${personalTrainerId}`);
        console.log(`[checkLimiteAlunos] 📋 Request details:`, {
            method: req.method,
            url: req.url,
            userRole: req.user?.role,
            bodyQuantidade: req.body.quantidade
        });
        
        if (!personalTrainerId) {
            console.log(`[checkLimiteAlunos] ❌ Unauthorized access attempt`);
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        // Skip check for admins
        if (req.user?.role === 'admin') {
            console.log(`[checkLimiteAlunos] 👑 Admin user, skipping limit check`);
            return next();
        }

        // Get requested quantity from body or default to 1
        const quantidadeDesejada = req.body.quantidade || 1;
        console.log(`[checkLimiteAlunos] 🔢 Validating activation for quantity: ${quantidadeDesejada}`);

        const validation = await StudentLimitService.validateStudentActivation(personalTrainerId, quantidadeDesejada);
        
        console.log(`[checkLimiteAlunos] 📊 Validation result:`, {
            isValid: validation.isValid,
            message: validation.message,
            errorCode: validation.errorCode,
            currentLimit: validation.status.currentLimit,
            activeStudents: validation.status.activeStudents,
            availableSlots: validation.status.availableSlots,
            tokensAvulsos: validation.status.planInfo?.tokensAvulsos
        });

        if (!validation.isValid) {
            console.log(`[checkLimiteAlunos] 🚫 Validation failed, blocking request`);
            return res.status(403).json({
                success: false,
                message: validation.message,
                code: validation.errorCode,
                data: {
                    currentLimit: validation.status.currentLimit,
                    activeStudents: validation.status.activeStudents,
                    availableSlots: validation.status.availableSlots,
                    requestedQuantity: quantidadeDesejada,
                    recommendations: validation.status.recommendations
                }
            });
        }

        console.log(`[checkLimiteAlunos] ✅ Validation passed, allowing request`);
        // Add status to request for potential use in controller
        (req as any).studentLimitStatus = validation.status;
        next();
    } catch (error) {
        console.error('[checkLimiteAlunos] ❌ Error in middleware:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor ao verificar limite de alunos',
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

        const validation = await StudentLimitService.validateStudentActivation(personalTrainerId, 1);

        if (!validation.isValid) {
            return res.status(403).json({
                success: false,
                message: validation.message,
                code: validation.errorCode,
                data: {
                    currentLimit: validation.status.currentLimit,
                    activeStudents: validation.status.activeStudents,
                    availableSlots: validation.status.availableSlots,
                    recommendations: validation.status.recommendations
                }
            });
        }

        // Add status to request for potential use in controller
        (req as any).studentLimitStatus = validation.status;
        next();
    } catch (error) {
        console.error('Error in checkCanActivateStudent middleware:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor ao verificar ativação de aluno',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware to check if personal trainer can send student invites
 */
export const checkCanSendInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        console.log(`[checkCanSendInvite] 🔍 Middleware called for personal: ${personalTrainerId}`);
        console.log(`[checkCanSendInvite] 📋 Request details:`, {
            method: req.method,
            url: req.url,
            userRole: req.user?.role,
            bodyEmail: req.body.emailConvidado
        });
        
        if (!personalTrainerId) {
            console.log(`[checkCanSendInvite] ❌ Unauthorized access attempt`);
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        // Skip check for admins
        if (req.user?.role === 'admin') {
            console.log(`[checkCanSendInvite] 👑 Admin user, skipping limit check`);
            return next();
        }

        console.log(`[checkCanSendInvite] 📧 Validating invite capability`);
        const validation = await StudentLimitService.validateSendInvite(personalTrainerId);
        
        console.log(`[checkCanSendInvite] 📊 Validation result:`, {
            isValid: validation.isValid,
            message: validation.message,
            errorCode: validation.errorCode,
            currentLimit: validation.status.currentLimit,
            activeStudents: validation.status.activeStudents,
            availableSlots: validation.status.availableSlots,
            tokensAvulsos: validation.status.planInfo?.tokensAvulsos
        });

        if (!validation.isValid) {
            console.log(`[checkCanSendInvite] 🚫 Validation failed, blocking invite`);
            return res.status(403).json({
                success: false,
                message: validation.message,
                code: validation.errorCode,
                data: {
                    currentLimit: validation.status.currentLimit,
                    activeStudents: validation.status.activeStudents,
                    availableSlots: validation.status.availableSlots,
                    recommendations: validation.status.recommendations
                }
            });
        }

        console.log(`[checkCanSendInvite] ✅ Validation passed, allowing invite`);
        // Add status to request for potential use in controller
        (req as any).studentLimitStatus = validation.status;
        next();
    } catch (error) {
        console.error('[checkCanSendInvite] ❌ Error in middleware:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor ao verificar envio de convite',
            code: 'INTERNAL_ERROR'
        });
    }
};