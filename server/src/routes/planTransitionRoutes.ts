// server/src/routes/planTransitionRoutes.ts
import express from 'express';
import PlanTransitionService from '../../services/PlanTransitionService.js';
import { ManualReactivationRequest, ManualReactivationResult } from '../../../shared/types/planos.js';

const router = express.Router();

/**
 * GET /api/plan-transition/eligible-students/:personalTrainerId
 * Get eligible students for manual reactivation (used during downgrades)
 */
router.get('/eligible-students/:personalTrainerId', async (req, res) => {
    try {
        const { personalTrainerId } = req.params;
        const { excludeRecentDays } = req.query;
        
        console.log(`[PlanTransitionRoutes] 📋 Getting eligible students for personal ${personalTrainerId}`);
        
        if (!personalTrainerId) {
            return res.status(400).json({
                error: 'Personal trainer ID é obrigatório',
                code: 'MISSING_PERSONAL_ID'
            });
        }
        
        const excludeDays = excludeRecentDays ? parseInt(excludeRecentDays as string) : 30;
        const eligibleStudents = await PlanTransitionService.getEligibleStudentsForReactivation(
            personalTrainerId,
            excludeDays
        );
        
        console.log(`[PlanTransitionRoutes] ✅ Found ${eligibleStudents.length} eligible students`);
        
        res.json({
            success: true,
            data: eligibleStudents,
            message: `${eligibleStudents.length} aluno(s) elegível(is) para reativação`
        });
        
    } catch (error) {
        console.error('❌ Error getting eligible students:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: (error as Error).message,
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/plan-transition/manual-reactivation
 * Manually reactivate selected students (used for downgrade scenarios)
 */
router.post('/manual-reactivation', async (req, res) => {
    try {
        const request: ManualReactivationRequest = req.body;
        const { selectedStudentIds, personalTrainerId, newPlanId } = request;
        
        console.log(`[PlanTransitionRoutes] 👤 Manual reactivation request:`, {
            personalTrainerId,
            newPlanId,
            selectedStudentCount: selectedStudentIds.length,
            selectedStudentIds
        });
        
        // Validate request
        if (!personalTrainerId || !newPlanId || !selectedStudentIds || selectedStudentIds.length === 0) {
            return res.status(400).json({
                error: 'Dados inválidos',
                message: 'Personal trainer ID, plano ID e lista de alunos são obrigatórios',
                code: 'INVALID_REQUEST'
            });
        }
        
        // Perform manual reactivation
        const result = await PlanTransitionService.manuallyReactivateStudents(
            personalTrainerId,
            selectedStudentIds
        );
        
        const response: ManualReactivationResult = {
            success: result.success,
            studentsReactivated: result.reactivatedCount,
            errors: result.errors,
            message: result.success 
                ? `${result.reactivatedCount} aluno(s) reativado(s) com sucesso`
                : 'Erro ao reativar alunos'
        };
        
        console.log(`[PlanTransitionRoutes] ✅ Manual reactivation completed:`, response);
        
        if (result.success) {
            res.json(response);
        } else {
            res.status(400).json(response);
        }
        
    } catch (error) {
        console.error('❌ Error in manual reactivation:', error);
        res.status(500).json({
            success: false,
            studentsReactivated: 0,
            errors: [(error as Error).message],
            message: 'Erro interno do servidor'
        });
    }
});

/**
 * GET /api/plan-transition/transition-preview/:personalTrainerId/:newPlanId
 * Preview what would happen with a plan transition without executing it
 */
router.get('/transition-preview/:personalTrainerId/:newPlanId', async (req, res) => {
    try {
        const { personalTrainerId, newPlanId } = req.params;
        
        console.log(`[PlanTransitionRoutes] 👀 Transition preview for personal ${personalTrainerId} to plan ${newPlanId}`);
        
        if (!personalTrainerId || !newPlanId) {
            return res.status(400).json({
                error: 'Personal trainer ID e plan ID são obrigatórios',
                code: 'MISSING_PARAMETERS'
            });
        }
        
        // Get transition type without executing
        const transitionType = await PlanTransitionService.detectTransitionType(
            personalTrainerId,
            newPlanId
        );
        
        // Get eligible students if it's a downgrade
        let eligibleStudents: any[] = [];
        if (transitionType.type === 'downgrade') {
            eligibleStudents = await PlanTransitionService.getEligibleStudentsForReactivation(personalTrainerId);
        }
        
        const preview = {
            transitionType: transitionType.type,
            currentPlan: transitionType.currentPlan,
            newPlan: transitionType.newPlan,
            limitDifference: transitionType.limitDifference,
            willRequireManualSelection: transitionType.type === 'downgrade',
            eligibleStudentsCount: eligibleStudents.length,
            eligibleStudents: transitionType.type === 'downgrade' ? eligibleStudents : undefined,
            automaticReactivation: transitionType.type === 'renewal' || transitionType.type === 'upgrade'
        };
        
        console.log(`[PlanTransitionRoutes] 📊 Transition preview:`, preview);
        
        res.json({
            success: true,
            data: preview,
            message: `Preview da transição: ${transitionType.type}`
        });
        
    } catch (error) {
        console.error('❌ Error generating transition preview:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: (error as Error).message,
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/plan-transition/student-history/:personalTrainerId
 * Get student plan history for a personal trainer
 */
router.get('/student-history/:personalTrainerId', async (req, res) => {
    try {
        const { personalTrainerId } = req.params;
        const { limit = '50', page = '1' } = req.query;
        
        console.log(`[PlanTransitionRoutes] 📚 Getting student history for personal ${personalTrainerId}`);
        
        if (!personalTrainerId) {
            return res.status(400).json({
                error: 'Personal trainer ID é obrigatório',
                code: 'MISSING_PERSONAL_ID'
            });
        }
        
        const StudentPlanHistory = (await import('../../models/StudentPlanHistory.js')).default;
        
        const limitNum = parseInt(limit as string);
        const pageNum = parseInt(page as string);
        const skip = (pageNum - 1) * limitNum;
        
        const [history, total] = await Promise.all([
            StudentPlanHistory.find({
                personalTrainerId
            })
            .populate('studentId', 'nome email status')
            .populate('previousPlanId', 'nome limiteAlunos')
            .sort({ dateDeactivated: -1 })
            .skip(skip)
            .limit(limitNum),
            
            StudentPlanHistory.countDocuments({
                personalTrainerId
            })
        ]);
        
        console.log(`[PlanTransitionRoutes] ✅ Found ${history.length} history records (total: ${total})`);
        
        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            },
            message: `${history.length} registro(s) de histórico encontrado(s)`
        });
        
    } catch (error) {
        console.error('❌ Error getting student history:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: (error as Error).message,
            code: 'INTERNAL_ERROR'
        });
    }
});

export default router;