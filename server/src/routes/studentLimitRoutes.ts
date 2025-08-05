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
        console.log(`[StudentLimitRoutes] GET /status - Personal Trainer ID: ${personalTrainerId}`);
        
        if (!personalTrainerId) {
            console.log(`[StudentLimitRoutes] Unauthorized access attempt`);
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const status = await StudentLimitService.getStudentLimitStatus(personalTrainerId);
        
        console.log(`[StudentLimitRoutes] Returning status for ${personalTrainerId}:`, {
            canActivate: status.canActivate,
            currentLimit: status.currentLimit,
            activeStudents: status.activeStudents,
            availableSlots: status.availableSlots,
            tokensAvulsos: status.planInfo?.tokensAvulsos
        });
        
        return res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('❌ Error getting student limit status:', error);
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

/**
 * GET /api/student-limit/debug-tokens
 * Debug endpoint to inspect token calculation (development only)
 */
router.get('/debug-tokens', authenticateToken, async (req: Request, res: Response) => {
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

        // Import TokenAvulso directly for debug
        const TokenAvulso = (await import('../../models/TokenAvulso.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        
        console.log(`[DEBUG] Analyzing tokens for personal: ${personalTrainerId}`);
        console.log(`[DEBUG] Personal ID type: ${typeof personalTrainerId}`);
        
        const now = new Date();
        console.log(`[DEBUG] Current time: ${now.toISOString()}`);
        
        // Get all tokens for this personal (no filters)
        const allTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId
        }).lean();
        
        console.log(`[DEBUG] Found ${allTokens.length} total tokens`);
        
        // Get active tokens using exact same query as service
        const activeTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId,
            ativo: true,
            dataVencimento: { $gt: now }
        }).lean();
        
        console.log(`[DEBUG] Found ${activeTokens.length} active tokens`);
        
        // Get tokens using service method
        const serviceTokenCount = await PlanoService.getTokensAvulsosAtivos(personalTrainerId);
        console.log(`[DEBUG] Service returned: ${serviceTokenCount} tokens`);
        
        // Analysis
        const tokenAnalysis = allTokens.map(token => ({
            id: token._id.toString(),
            quantidade: token.quantidade,
            ativo: token.ativo,
            dataVencimento: token.dataVencimento,
            isExpired: token.dataVencimento <= now,
            personalTrainerId: token.personalTrainerId.toString(),
            isActive: token.ativo && token.dataVencimento > now,
            daysTillExpiry: Math.ceil((token.dataVencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }));
        
        const activeTokensSum = activeTokens.reduce((sum, token) => sum + (token.quantidade || 0), 0);
        
        return res.json({
            success: true,
            debug: {
                personalTrainerId,
                personalIdType: typeof personalTrainerId,
                currentTime: now.toISOString(),
                totalTokenRecords: allTokens.length,
                activeTokenRecords: activeTokens.length,
                activeTokensSum,
                serviceTokenCount,
                tokenAnalysis,
                queryResults: {
                    allTokensQuery: allTokens.length,
                    activeTokensQuery: activeTokens.length,
                    serviceMethod: serviceTokenCount
                },
                calculations: {
                    expectedActiveSum: activeTokensSum,
                    actualServiceResult: serviceTokenCount,
                    matches: activeTokensSum === serviceTokenCount
                }
            }
        });
    } catch (error) {
        console.error('Error in debug-tokens:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro no debug de tokens',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});

export default router;