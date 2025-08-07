// server/src/routes/tokenRoutes.ts
import express from 'express';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import TokenService from '../../services/TokenService.js';
import TokenMigrationService from '../../services/TokenMigrationService.js';

const router = express.Router();

/**
 * GET /api/tokens/status
 * Get complete token status for the authenticated personal trainer
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado'
            });
        }
        
        const tokenStatus = await TokenService.getTokenStatus(personalTrainerId);
        
        res.json({
            success: true,
            data: tokenStatus
        });
        
    } catch (error) {
        console.error('Error getting token status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao buscar status dos tokens',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
        });
    }
});

/**
 * GET /api/tokens/student/:studentId
 * Get token details for a specific student
 */
router.get('/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const tokenDetails = await TokenService.getStudentTokenDetails(studentId);
        
        if (!tokenDetails) {
            return res.status(404).json({
                success: false,
                message: 'Token não encontrado para este aluno'
            });
        }
        
        res.json({
            success: true,
            data: tokenDetails
        });
        
    } catch (error) {
        console.error('Error getting student token details:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao buscar detalhes do token',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
        });
    }
});

/**
 * GET /api/tokens/renewal/:planoId
 * Get tokens available for renewal for a specific plan
 */
router.get('/renewal/:planoId', authenticateToken, async (req, res) => {
    try {
        const { planoId } = req.params;
        const renewalData = await TokenService.getTokensForRenewal(planoId);
        
        res.json({
            success: true,
            data: renewalData
        });
        
    } catch (error) {
        console.error('Error getting tokens for renewal:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao buscar tokens para renovação',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
        });
    }
});

/**
 * POST /api/tokens/renovar
 * Renew selected plan tokens
 */
router.post('/renovar', authenticateToken, async (req, res) => {
    try {
        const { planoId, novaDataExpiracao, tokensRenovados } = req.body;
        
        // Validation
        if (!planoId || !novaDataExpiracao || !Array.isArray(tokensRenovados)) {
            return res.status(400).json({
                success: false,
                message: 'Dados de renovação inválidos. Necessário: planoId, novaDataExpiracao, tokensRenovados',
                errorCode: 'VALIDATION_ERROR'
            });
        }
        
        const renewalResult = await TokenService.renewPlanTokens({
            planoId,
            novaDataExpiracao,
            tokensRenovados
        });
        
        if (!renewalResult.success) {
            return res.status(400).json({
                success: false,
                message: renewalResult.message,
                errors: renewalResult.errors,
                errorCode: 'RENEWAL_ERROR'
            });
        }
        
        res.json({
            success: true,
            message: renewalResult.message,
            data: {
                renovatedCount: renewalResult.renovatedCount,
                liberatedCount: renewalResult.liberatedCount,
                errors: renewalResult.errors
            }
        });
        
    } catch (error) {
        console.error('Error renewing tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno durante renovação de tokens',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
        });
    }
});

/**
 * POST /api/tokens/migrate
 * Migration endpoint (for development/admin use)
 */
router.post('/migrate', authenticateToken, async (req, res) => {
    try {
        // Only allow in development or for admin users
        if (process.env.NODE_ENV === 'production' && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Operação não permitida em produção para usuários não-admin'
            });
        }
        
        const migrationResult = await TokenMigrationService.runCompleteMigration();
        
        res.json({
            success: true,
            message: 'Migração concluída',
            data: migrationResult
        });
        
    } catch (error) {
        console.error('Error during migration:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno durante migração',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
        });
    }
});

export default router;