// server/middlewares/checkStudentLimit.ts
import { Request, Response, NextFunction } from 'express';
import TokenService from '../services/TokenService.js';
import dbConnect from '../lib/dbConnect.js';

export interface StudentLimitRequest extends Request {
    user?: {
        id: string;
        role: "personal" | "admin";
        firstName: string;
        lastName: string;
        email: string;
    };
}

/**
 * Middleware to check if personal trainer has available tokens for student operations
 * Used in routes for creating/activating students and sending invites
 */
export const checkStudentLimit = async (
    req: StudentLimitRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await dbConnect();
        
        const personalId = req.user?.id;
        
        if (!personalId) {
            res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
            return;
        }

        console.log(`[checkStudentLimit] 🛡️ Checking student limit for personal: ${personalId}`);
        
        // Get available tokens
        const tokenStatus = await TokenService.getAvailableTokens(personalId);
        
        console.log(`[checkStudentLimit] 📊 Token status:`, {
            availableSlots: tokenStatus.availableSlots,
            hasPlan: tokenStatus.hasPlan,
            planAvailable: tokenStatus.plan.available,
            avulsoAvailable: tokenStatus.avulso.available
        });
        
        // Check if there are available slots
        if (tokenStatus.availableSlots === 0) {
            console.log(`[checkStudentLimit] ❌ No available slots for personal: ${personalId}`);
            
            res.status(409).json({
                success: false,
                message: 'Você não possui tokens disponíveis para cadastrar/ativar novos alunos.',
                code: 'NO_TOKENS_AVAILABLE',
                data: {
                    availableSlots: tokenStatus.availableSlots,
                    hasPlan: tokenStatus.hasPlan,
                    planTokens: tokenStatus.plan.available,
                    avulsoTokens: tokenStatus.avulso.available
                }
            });
            return;
        }
        
        console.log(`[checkStudentLimit] ✅ Student limit check passed - ${tokenStatus.availableSlots} slots available`);
        
        // Add token status to request for potential use by route handlers
        (req as any).tokenStatus = tokenStatus;
        
        next();
        
    } catch (error) {
        console.error('❌ Error in checkStudentLimit middleware:', error);
        
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao verificar limite de alunos',
            code: 'INTERNAL_ERROR'
        });
    }
};

/**
 * Middleware variant specifically for invite operations
 * Could have different logic in the future (e.g., allow invites even at limit)
 */
export const checkInviteLimit = async (
    req: StudentLimitRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // For now, use the same logic as checkStudentLimit
    // In the future, this could be customized for invite-specific behavior
    return checkStudentLimit(req, res, next);
};

/**
 * Middleware to validate and optionally assign token during student creation
 * This can be used in student creation routes to automatically handle token assignment
 */
export const assignTokenOnStudentCreation = async (
    req: StudentLimitRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        await dbConnect();
        
        const personalId = req.user?.id;
        
        if (!personalId) {
            res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
            return;
        }

        // This middleware should be called AFTER the student is created
        // and the studentId should be available in the request
        const studentId = (req as any).createdStudentId || req.body.studentId;
        
        if (!studentId) {
            console.log(`[assignTokenOnStudentCreation] ⚠️ No studentId available for token assignment`);
            next();
            return;
        }

        console.log(`[assignTokenOnStudentCreation] 🎯 Assigning token to newly created student: ${studentId}`);
        
        try {
            const result = await TokenService.assignToken(studentId);
            
            console.log(`[assignTokenOnStudentCreation] ✅ Token assigned successfully:`, {
                studentId,
                tokenId: result.tokenId,
                type: result.type
            });
            
            // Add token assignment result to request for potential use by route handlers
            (req as any).tokenAssignment = result;
            
        } catch (tokenError: any) {
            console.error(`[assignTokenOnStudentCreation] ❌ Failed to assign token:`, tokenError);
            
            // Don't fail the entire operation if token assignment fails
            // Log the error and continue - the student was created successfully
            (req as any).tokenAssignmentError = tokenError.message;
        }
        
        next();
        
    } catch (error) {
        console.error('❌ Error in assignTokenOnStudentCreation middleware:', error);
        
        // Don't fail the operation - continue to next middleware
        (req as any).middlewareError = 'Token assignment middleware failed';
        next();
    }
};

export default {
    checkStudentLimit,
    checkInviteLimit,
    assignTokenOnStudentCreation
};