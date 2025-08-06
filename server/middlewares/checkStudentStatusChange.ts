// server/middlewares/checkStudentStatusChange.ts
import { Request, Response, NextFunction } from 'express';
import StudentLimitService from '../services/StudentLimitService.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

/**
 * Middleware to check student status changes and validate limits when activating students
 */
export const checkStudentStatusChange = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        const alunoId = req.params.id;
        const { status: newStatus } = req.body;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        // Skip check for admins
        if (req.user?.role === 'admin') {
            return next();
        }

        // Only validate if we're changing to active status
        if (newStatus !== 'active') {
            return next();
        }

        // Get current student status
        const currentStudent = await Aluno.findOne({ 
            _id: new mongoose.Types.ObjectId(alunoId),
            trainerId: new mongoose.Types.ObjectId(personalTrainerId)
        });

        if (!currentStudent) {
            return res.status(404).json({
                success: false,
                message: 'Aluno não encontrado',
                code: 'STUDENT_NOT_FOUND'
            });
        }

        // If student is already active, no need to check limit
        if (currentStudent.status === 'active') {
            return next();
        }

        // Student is being activated, check if they already have an assigned token
        const TokenAssignmentService = (await import('../services/TokenAssignmentService.js')).default;
        const existingToken = await TokenAssignmentService.getStudentAssignedToken(alunoId);
        
        if (existingToken) {
            const now = new Date();
            const isTokenExpired = existingToken.dataVencimento <= now;
            
            console.log(`[checkStudentStatusChange] 🔍 Student ${alunoId} has existing token:`, {
                tokenId: existingToken._id,
                expired: isTokenExpired,
                expirationDate: existingToken.dataVencimento
            });
            
            if (!isTokenExpired) {
                console.log(`[checkStudentStatusChange] ✅ Student ${alunoId} can be reactivated with existing valid token`);
                // Student has a valid token, allow activation without new token assignment
                return next();
            } else {
                console.log(`[checkStudentStatusChange] ⚠️ Student ${alunoId} has expired token, need new token for activation`);
                // Token is expired, need to assign a new token - continue with normal validation
            }
        } else {
            console.log(`[checkStudentStatusChange] 🆕 Student ${alunoId} has no assigned token, need new token for activation`);
            // No existing token, need to assign a new token - continue with normal validation
        }
        
        // Check if personal trainer can activate (for new token assignment)
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
                    recommendations: validation.status.recommendations || [],
                    studentName: currentStudent.nome
                }
            });
        }

        // If we reach here, student needs a new token assignment
        // Set student ID for token assignment middleware (only if no valid existing token)
        if (!existingToken || existingToken.dataVencimento <= new Date()) {
            res.locals.studentId = alunoId;
            console.log(`[checkStudentStatusChange] 📝 Set student ID for token assignment: ${alunoId}`);
        }

        // Add status to request for potential use in controller
        (req as any).studentLimitStatus = validation.status;
        next();
    } catch (error) {
        console.error('Error in checkStudentStatusChange middleware:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor ao verificar mudança de status',
            code: 'INTERNAL_ERROR'
        });
    }
};