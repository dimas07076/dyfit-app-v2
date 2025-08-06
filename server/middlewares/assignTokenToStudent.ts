// server/middlewares/assignTokenToStudent.ts
import { Request, Response, NextFunction } from 'express';
import TokenAssignmentService from '../services/TokenAssignmentService.js';

/**
 * Middleware to assign a token to a student after successful creation/activation
 * This should be used AFTER the student is successfully created
 */
export const assignTokenToStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        // Get student ID from response data (set by previous middleware/controller)
        const studentId = (res.locals.createdStudentId || res.locals.studentId);
        
        console.log(`[assignTokenToStudent] 🎯 DETAILED: Middleware called for assignment:`, {
            personalTrainerId,
            studentId,
            method: req.method,
            url: req.url,
            bodyStatus: req.body?.status,
            isCreation: !!res.locals.createdStudentId,
            isUpdate: !!res.locals.studentId,
            timestamp: new Date().toISOString()
        });
        
        if (!personalTrainerId || !studentId) {
            console.log(`[assignTokenToStudent] ⚠️ Missing required data for token assignment:`, {
                personalTrainerId: !!personalTrainerId,
                studentId: !!studentId,
                locals: res.locals
            });
            // Don't fail the request, just log and continue
            return next();
        }

        // Skip token assignment for admins
        if (req.user?.role === 'admin') {
            console.log(`[assignTokenToStudent] 👑 Admin user, skipping token assignment`);
            return next();
        }

        // Get token status BEFORE assignment
        const TokenAssignmentService = (await import('../services/TokenAssignmentService.js')).default;
        const tokenStatusBefore = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const existingStudentToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
        
        console.log(`[assignTokenToStudent] 📊 DETAILED: Pre-assignment status:`, {
            personalTrainerId,
            studentId,
            tokenStatusBefore: {
                available: tokenStatusBefore.availableTokens,
                consumed: tokenStatusBefore.consumedTokens,
                total: tokenStatusBefore.totalTokens
            },
            existingStudentToken: existingStudentToken ? {
                tokenId: existingStudentToken._id?.toString(),
                expired: existingStudentToken.dataVencimento <= new Date(),
                assignedDate: existingStudentToken.dateAssigned
            } : null
        });

        // Skip assignment if student already has a valid token (for reactivation scenarios)
        if (existingStudentToken && existingStudentToken.dataVencimento > new Date()) {
            console.log(`[assignTokenToStudent] ♻️ DETAILED: Student ${studentId} already has valid token ${existingStudentToken._id}, skipping new assignment`);
            return next();
        }

        console.log(`[assignTokenToStudent] 🔗 DETAILED: Proceeding with token assignment to student ${studentId} for personal ${personalTrainerId}`);
        
        const assignmentResult = await TokenAssignmentService.assignTokenToStudent(
            personalTrainerId, 
            studentId, 
            1 // One token per student
        );
        
        // Get token status AFTER assignment
        const tokenStatusAfter = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const studentTokenAfter = await TokenAssignmentService.getStudentAssignedToken(studentId);
        
        console.log(`[assignTokenToStudent] 📊 DETAILED: Assignment result and post-assignment status:`, {
            assignmentResult: {
                success: assignmentResult.success,
                message: assignmentResult.message,
                errorCode: assignmentResult.errorCode,
                assignedTokenId: assignmentResult.assignedToken?._id?.toString()
            },
            tokenStatusAfter: {
                available: tokenStatusAfter.availableTokens,
                consumed: tokenStatusAfter.consumedTokens,
                total: tokenStatusAfter.totalTokens,
                changeInAvailable: tokenStatusAfter.availableTokens - tokenStatusBefore.availableTokens,
                changeInConsumed: tokenStatusAfter.consumedTokens - tokenStatusBefore.consumedTokens
            },
            studentTokenAfter: studentTokenAfter ? {
                tokenId: studentTokenAfter._id?.toString(),
                quantity: studentTokenAfter.quantidade,
                assignedDate: studentTokenAfter.dateAssigned,
                expirationDate: studentTokenAfter.dataVencimento
            } : null,
            expectedBehavior: {
                availableShouldDecrease: tokenStatusBefore.availableTokens - tokenStatusAfter.availableTokens === 1,
                consumedShouldIncrease: tokenStatusAfter.consumedTokens - tokenStatusBefore.consumedTokens === 1,
                studentShouldHaveToken: !!studentTokenAfter
            }
        });
        
        if (!assignmentResult.success) {
            console.warn(`[assignTokenToStudent] ⚠️ DETAILED: Token assignment failed: ${assignmentResult.message}`);
            // Log the warning but don't fail the request since student was already created
            // In a production system, you might want to implement rollback logic here
        } else {
            console.log(`[assignTokenToStudent] ✅ DETAILED: Token successfully assigned to student ${studentId}`);
            // Store assignment info in response locals for potential use
            res.locals.tokenAssignment = assignmentResult;
            
            // Verify the assignment was persisted correctly
            const verificationToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            console.log(`[assignTokenToStudent] 🔍 DETAILED: Assignment verification:`, {
                tokenWasAssigned: !!verificationToken,
                tokenId: verificationToken?._id?.toString(),
                isPermanentlyBound: !!verificationToken?.assignedToStudentId,
                criticalCheck: verificationToken?.assignedToStudentId?.toString() === studentId ? 'CORRECT' : 'ERROR'
            });
        }
        
        next();
    } catch (error) {
        console.error('[assignTokenToStudent] ❌ DETAILED: Error in token assignment middleware:', error);
        // Don't fail the request, just log the error and continue
        next();
    }
};

/**
 * Helper middleware to extract student ID from request/response for token assignment
 */
export const setStudentIdForTokenAssignment = (getStudentId: (req: Request, res: Response) => string | undefined) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const studentId = getStudentId(req, res);
        if (studentId) {
            res.locals.studentId = studentId;
            console.log(`[setStudentIdForTokenAssignment] 📝 Set student ID for token assignment: ${studentId}`);
        }
        next();
    };
};