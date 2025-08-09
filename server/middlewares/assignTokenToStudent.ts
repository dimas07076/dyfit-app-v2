// server/middlewares/assignTokenToStudent.ts
import { Request, Response, NextFunction } from 'express';
import TokenAssignmentService, { getTokenAssignedStudentId } from '../services/TokenAssignmentService.js';
import StudentResourceValidationService from '../services/StudentResourceValidationService.js';

/**
 * Enhanced middleware to assign appropriate resource to a student after successful creation/activation
 * Uses unified StudentResourceValidationService to assign plan slots or tokens based on priority
 * This should be used AFTER the student is successfully created
 */
export const assignTokenToStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const personalTrainerId = req.user?.id;
        
        // Get student ID from response data (set by previous middleware/controller)
        const studentId = (res.locals.createdStudentId || res.locals.studentId);
        
        console.log(`[assignTokenToStudent] 🎯 ENHANCED: Middleware called for resource assignment:`, {
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
            console.log(`[assignTokenToStudent] ⚠️ Missing required data for resource assignment:`, {
                personalTrainerId: !!personalTrainerId,
                studentId: !!studentId,
                locals: res.locals
            });
            // Don't fail the request, just log and continue
            return next();
        }

        // Skip resource assignment for admins
        if (req.user?.role === 'admin') {
            console.log(`[assignTokenToStudent] 👑 Admin user, skipping resource assignment`);
            return next();
        }

        // Use unified resource assignment service
        console.log(`[assignTokenToStudent] 🔗 ENHANCED: Proceeding with unified resource assignment to student ${studentId} for personal ${personalTrainerId}`);
        
        const assignmentResult = await StudentResourceValidationService.assignResourceToStudent(
            personalTrainerId, 
            studentId
        );
        
        console.log(`[assignTokenToStudent] 📊 ENHANCED: Resource assignment result:`, {
            success: assignmentResult.success,
            message: assignmentResult.message,
            resourceType: assignmentResult.resourceType,
            assignedResourceId: assignmentResult.assignedResourceId
        });
        
        if (!assignmentResult.success) {
            console.warn(`[assignTokenToStudent] ⚠️ ENHANCED: Resource assignment failed: ${assignmentResult.message}`);
            // Log the warning but don't fail the request since student was already created
            // In a production system, you might want to implement rollback logic here
        } else {
            console.log(`[assignTokenToStudent] ✅ ENHANCED: Resource successfully assigned to student ${studentId} (type: ${assignmentResult.resourceType})`);
            // Store assignment info in response locals for potential use
            res.locals.resourceAssignment = assignmentResult;
            
            // Additional verification for token assignments
            if (assignmentResult.resourceType === 'token') {
                const verificationToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
                console.log(`[assignTokenToStudent] 🔍 ENHANCED: Token assignment verification:`, {
                    tokenWasAssigned: !!verificationToken,
                    tokenId: verificationToken?._id?.toString(),
                    isPermanentlyBound: verificationToken ? !!getTokenAssignedStudentId(verificationToken) : false,
                    criticalCheck: verificationToken ? (getTokenAssignedStudentId(verificationToken)?.toString() === studentId ? 'CORRECT' : 'ERROR') : 'NO_TOKEN'
                });
            }
        }
        
        next();
    } catch (error) {
        console.error('[assignTokenToStudent] ❌ ENHANCED: Error in resource assignment middleware:', error);
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