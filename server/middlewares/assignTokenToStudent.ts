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
        
        console.log(`[assignTokenToStudent] 🎯 Middleware called for assignment:`, {
            personalTrainerId,
            studentId,
            method: req.method,
            url: req.url
        });
        
        if (!personalTrainerId || !studentId) {
            console.log(`[assignTokenToStudent] ⚠️ Missing required data for token assignment:`, {
                personalTrainerId: !!personalTrainerId,
                studentId: !!studentId
            });
            // Don't fail the request, just log and continue
            return next();
        }

        // Skip token assignment for admins
        if (req.user?.role === 'admin') {
            console.log(`[assignTokenToStudent] 👑 Admin user, skipping token assignment`);
            return next();
        }

        console.log(`[assignTokenToStudent] 🔗 Assigning token to student ${studentId} for personal ${personalTrainerId}`);
        
        const assignmentResult = await TokenAssignmentService.assignTokenToStudent(
            personalTrainerId, 
            studentId, 
            1 // One token per student
        );
        
        console.log(`[assignTokenToStudent] 📊 Assignment result:`, {
            success: assignmentResult.success,
            message: assignmentResult.message,
            errorCode: assignmentResult.errorCode,
            assignedTokenId: assignmentResult.assignedToken?._id
        });
        
        if (!assignmentResult.success) {
            console.warn(`[assignTokenToStudent] ⚠️ Token assignment failed: ${assignmentResult.message}`);
            // Log the warning but don't fail the request since student was already created
            // In a production system, you might want to implement rollback logic here
        } else {
            console.log(`[assignTokenToStudent] ✅ Token successfully assigned to student ${studentId}`);
            // Store assignment info in response locals for potential use
            res.locals.tokenAssignment = assignmentResult;
        }
        
        next();
    } catch (error) {
        console.error('[assignTokenToStudent] ❌ Error in token assignment middleware:', error);
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