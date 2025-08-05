// server/src/routes/studentLimitRoutes.ts
import express, { Request, Response } from 'express';
import StudentLimitService from '../../services/StudentLimitService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

/**
 * GET /api/student-limit/status
 * Get current student limit status for authenticated personal trainer
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const status = await StudentLimitService.getStudentLimitStatus(personalTrainerId);
        
        return res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting student limit status:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/validate-activation
 * Validate if personal trainer can activate specified number of students
 */
router.post('/validate-activation', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const { quantidade = 1 } = req.body;
        
        if (typeof quantidade !== 'number' || quantidade < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser um número positivo',
                code: 'INVALID_QUANTITY'
            });
        }

        const validation = await StudentLimitService.validateStudentActivation(personalTrainerId, quantidade);
        
        return res.json({
            success: validation.isValid,
            message: validation.message,
            code: validation.errorCode,
            data: validation.status
        });
    } catch (error) {
        console.error('Error validating student activation:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/validate-invite
 * Validate if personal trainer can send student invite
 */
router.post('/validate-invite', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const validation = await StudentLimitService.validateSendInvite(personalTrainerId);
        
        return res.json({
            success: validation.isValid,
            message: validation.message,
            code: validation.errorCode,
            data: validation.status
        });
    } catch (error) {
        console.error('Error validating send invite:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/student-limit/detailed-breakdown
 * Get detailed limit breakdown (mainly for admin/debug purposes)
 */
router.get('/detailed-breakdown', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const breakdown = await StudentLimitService.getDetailedLimitBreakdown(personalTrainerId);
        
        return res.json({
            success: true,
            data: breakdown
        });
    } catch (error) {
        console.error('Error getting detailed breakdown:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

export default router;