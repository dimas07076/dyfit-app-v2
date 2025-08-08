// server/src/routes/tokenRoutes.ts
import express, { Request, Response } from 'express';
import TokenService from '../../services/TokenService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

/**
 * GET /api/token/status
 * Get current token status for authenticated personal trainer
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalId = req.user?.id;
        console.log(`[TokenRoutes] GET /status - Personal Trainer ID: ${personalId}`);
        
        if (!personalId) {
            console.log(`[TokenRoutes] Unauthorized access attempt`);
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const tokenStatus = await TokenService.getAvailableTokens(personalId);
        
        console.log(`[TokenRoutes] Returning token status for ${personalId}:`, {
            availableSlots: tokenStatus.availableSlots,
            hasPlan: tokenStatus.hasPlan,
            planTokens: tokenStatus.plan.available,
            avulsoTokens: tokenStatus.avulso.available
        });
        
        return res.json({
            success: true,
            data: tokenStatus
        });
    } catch (error) {
        console.error('❌ Error getting token status:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/token/assign
 * Assign token to student with optional type specification
 */
router.post('/assign', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalId = req.user?.id;
        if (!personalId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const { studentId, type } = req.body;
        
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'studentId é obrigatório',
                code: 'MISSING_STUDENT_ID'
            });
        }

        // Validate type if provided
        if (type && !['Plano', 'Avulso'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'type deve ser "Plano" ou "Avulso"',
                code: 'INVALID_TYPE'
            });
        }

        // Validate tenant - ensure student belongs to this personal trainer
        const Aluno = (await import('../../models/Aluno.js')).default;
        const student = await Aluno.findById(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Aluno não encontrado',
                code: 'STUDENT_NOT_FOUND'
            });
        }

        if (student.trainerId.toString() !== personalId) {
            return res.status(403).json({
                success: false,
                message: 'Aluno não pertence a este personal trainer',
                code: 'INVALID_TENANT'
            });
        }

        const result = await TokenService.assignToken(studentId, type);
        
        console.log(`[TokenRoutes] Token assigned successfully:`, {
            personalId,
            studentId,
            tokenId: result.tokenId,
            type: result.type
        });
        
        return res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('❌ Error assigning token:', error);
        
        if (error.message.includes('not found') || error.message.includes('No available')) {
            return res.status(409).json({
                success: false,
                message: 'Você não possui tokens disponíveis para cadastrar/ativar novos alunos.',
                code: 'NO_TOKENS_AVAILABLE'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/token/:studentId
 * Get token assigned to a specific student
 */
router.get('/:studentId', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalId = req.user?.id;
        if (!personalId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const { studentId } = req.params;
        
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'studentId é obrigatório',
                code: 'MISSING_STUDENT_ID'
            });
        }

        // Validate tenant - ensure student belongs to this personal trainer
        const Aluno = (await import('../../models/Aluno.js')).default;
        const student = await Aluno.findById(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Aluno não encontrado',
                code: 'STUDENT_NOT_FOUND'
            });
        }

        if (student.trainerId.toString() !== personalId) {
            return res.status(403).json({
                success: false,
                message: 'Aluno não pertence a este personal trainer',
                code: 'INVALID_TENANT'
            });
        }

        const tokenStatus = await TokenService.getStudentToken(studentId);
        
        if (!tokenStatus) {
            return res.status(404).json({
                success: false,
                message: 'Token não encontrado para este aluno',
                code: 'TOKEN_NOT_FOUND'
            });
        }
        
        console.log(`[TokenRoutes] Found token for student ${studentId}:`, tokenStatus);
        
        return res.json({
            success: true,
            data: tokenStatus
        });
    } catch (error) {
        console.error('❌ Error getting student token:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/token/debug/stats/:personalId
 * Debug endpoint to get comprehensive token statistics
 */
router.get('/debug/stats/:personalId', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        // Only allow access to own data or admin access
        const requesterId = req.user?.id;
        const { personalId } = req.params;
        
        if (requesterId !== personalId && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado',
                code: 'UNAUTHORIZED_ACCESS'
            });
        }

        const stats = await TokenService.getTokenStats(personalId);
        
        console.log(`[TokenRoutes] Debug stats for ${personalId}:`, stats);
        
        return res.json({
            success: true,
            data: {
                personalId,
                timestamp: new Date().toISOString(),
                stats
            }
        });
    } catch (error) {
        console.error('❌ Error getting token stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/token/debug/migrate
 * Debug endpoint to migrate from old TokenAvulso system
 * ADMIN ONLY
 */
router.post('/debug/migrate', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        // Only allow admin access
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem executar a migração',
                code: 'ADMIN_ONLY'
            });
        }

        const { personalId } = req.body;
        
        console.log(`[TokenRoutes] Starting migration for personal: ${personalId || 'all'}`);
        
        const result = await TokenService.migrateFromTokenAvulso(personalId);
        
        console.log(`[TokenRoutes] Migration completed:`, result);
        
        return res.json({
            success: true,
            data: result,
            message: `Migration completed: ${result.migrated} tokens migrated, ${result.errors} errors`
        });
    } catch (error) {
        console.error('❌ Error during migration:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro durante a migração',
            code: 'MIGRATION_ERROR'
        });
    }
});

export default router;