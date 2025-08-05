// server/src/routes/studentLimitRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import StudentLimitService from '../../services/StudentLimitService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/student-limit/status - Get current student limit status
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    
    try {
        const personalTrainerId = req.user?.id;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const status = await StudentLimitService.getStudentLimitStatus(personalTrainerId);
        
        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting student limit status:', error);
        next(error);
    }
});

/**
 * POST /api/student-limit/validate-activation - Validate student activation
 */
router.post('/validate-activation', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    
    try {
        const personalTrainerId = req.user?.id;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const { quantidade = 1 } = req.body;
        
        if (typeof quantidade !== 'number' || quantidade <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser um número positivo',
                code: 'INVALID_QUANTITY'
            });
        }

        const validationResult = await StudentLimitService.validateStudentActivation(personalTrainerId, quantidade);
        
        res.status(200).json(validationResult);
    } catch (error) {
        console.error('Error validating student activation:', error);
        next(error);
    }
});

/**
 * POST /api/student-limit/validate-invite - Validate invite sending
 */
router.post('/validate-invite', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    
    try {
        const personalTrainerId = req.user?.id;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const validationResult = await StudentLimitService.canSendInvite(personalTrainerId);
        
        res.status(200).json(validationResult);
    } catch (error) {
        console.error('Error validating invite:', error);
        next(error);
    }
});

/**
 * GET /api/student-limit/detailed-breakdown - Get detailed breakdown
 */
router.get('/detailed-breakdown', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    
    try {
        const personalTrainerId = req.user?.id;
        
        if (!personalTrainerId) {
            return res.status(401).json({ 
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const breakdown = await StudentLimitService.getDetailedBreakdown(personalTrainerId);
        
        res.status(200).json({
            success: true,
            data: breakdown
        });
    } catch (error) {
        console.error('Error getting detailed breakdown:', error);
        next(error);
    }
});

export default router;