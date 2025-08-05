// server/middlewares/checkLimiteAlunos.ts
import { Request, Response, NextFunction } from 'express';
import PlanoService from '../services/PlanoService.js';
import StudentLimitService from '../services/StudentLimitService.js';

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

        // Use the new StudentLimitService for validation
        const validationResult = await StudentLimitService.validateStudentActivation(personalTrainerId, quantidadeDesejada);

        if (!validationResult.success) {
            return res.status(403).json({
                message: validationResult.message,
                code: validationResult.code,
                data: validationResult.data
            });
        }

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

        const validationResult = await StudentLimitService.validateStudentActivation(personalTrainerId, 1);

        if (!validationResult.success) {
            return res.status(403).json({
                message: validationResult.message,
                code: validationResult.code,
                data: validationResult.data
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

/**
 * Middleware to check if personal trainer can send invites
 */
export const checkCanSendInvite = async (req: Request, res: Response, next: NextFunction) => {
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

        const validationResult = await StudentLimitService.canSendInvite(personalTrainerId);

        if (!validationResult.success) {
            return res.status(403).json({
                message: validationResult.message,
                code: validationResult.code,
                data: validationResult.data
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkCanSendInvite middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware to check student status changes
 */
export const checkStudentStatusChange = async (req: Request, res: Response, next: NextFunction) => {
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

        const { status: newStatus } = req.body;
        const studentId = req.params.id;

        if (!newStatus || !studentId) {
            return next(); // Let the main handler validate required fields
        }

        // Get current student status
        const Aluno = (await import('../models/Aluno.js')).default;
        const student = await Aluno.findOne({ 
            _id: studentId, 
            trainerId: personalTrainerId 
        });

        if (!student) {
            return next(); // Let the main handler deal with not found
        }

        const validationResult = await StudentLimitService.validateStudentStatusChange(
            personalTrainerId, 
            student.status, 
            newStatus
        );

        if (!validationResult.success) {
            return res.status(403).json({
                message: validationResult.message,
                code: validationResult.code,
                data: validationResult.data
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkStudentStatusChange middleware:', error);
        res.status(500).json({ 
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
};