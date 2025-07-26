// server/src/routes/adminPlanosRoutes.ts
import express from 'express';
import PlanoService from '../../services/PlanoService.js';
import PersonalTrainer from '../../models/PersonalTrainer.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authorizeAdmin } from '../../middlewares/authorizeAdmin.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(authorizeAdmin);

/**
 * GET /api/admin/planos - Get all plans
 */
router.get('/planos', async (req, res) => {
    try {
        const planos = await PlanoService.getAllPlans();
        res.json(planos);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ message: 'Erro ao buscar planos' });
    }
});

/**
 * POST /api/admin/planos - Create or update a plan
 */
router.post('/planos', async (req, res) => {
    try {
        const planData = req.body;
        const plano = await PlanoService.createOrUpdatePlan(planData);
        res.status(201).json(plano);
    } catch (error) {
        console.error('Error creating/updating plan:', error);
        res.status(500).json({ message: 'Erro ao criar/atualizar plano' });
    }
});

/**
 * GET /api/admin/personal/:personalId/status - Get personal trainer plan status
 */
router.get('/personal/:personalId/status', async (req, res) => {
    try {
        const { personalId } = req.params;
        
        const personal = await PersonalTrainer.findById(personalId);
        if (!personal) {
            return res.status(404).json({ message: 'Personal trainer não encontrado' });
        }

        const status = await PlanoService.getPersonalStatusForAdmin(personalId);
        status.personalInfo = {
            _id: personal._id,
            nome: personal.nome,
            email: personal.email
        };

        res.json(status);
    } catch (error) {
        console.error('Error fetching personal status:', error);
        res.status(500).json({ message: 'Erro ao buscar status do personal' });
    }
});

/**
 * POST /api/admin/personal/:personalId/assign-plan - Assign plan to personal trainer
 */
router.post('/personal/:personalId/assign-plan', async (req, res) => {
    try {
        const { personalId } = req.params;
        const { planoId, customDuration, motivo } = req.body;
        const adminId = (req as any).user.id;

        const personal = await PersonalTrainer.findById(personalId);
        if (!personal) {
            return res.status(404).json({ message: 'Personal trainer não encontrado' });
        }

        const personalPlano = await PlanoService.assignPlanToPersonal(
            personalId,
            planoId,
            adminId,
            customDuration,
            motivo
        );

        res.status(201).json({
            message: 'Plano atribuído com sucesso',
            personalPlano
        });
    } catch (error) {
        console.error('Error assigning plan:', error);
        res.status(500).json({ 
            message: error instanceof Error ? error.message : 'Erro ao atribuir plano'
        });
    }
});

/**
 * POST /api/admin/personal/:personalId/add-tokens - Add tokens to personal trainer
 */
router.post('/personal/:personalId/add-tokens', async (req, res) => {
    try {
        const { personalId } = req.params;
        const { quantidade, customDays, motivo } = req.body;
        const adminId = (req as any).user.id;

        if (!quantidade || quantidade < 1) {
            return res.status(400).json({ message: 'Quantidade deve ser pelo menos 1' });
        }

        const personal = await PersonalTrainer.findById(personalId);
        if (!personal) {
            return res.status(404).json({ message: 'Personal trainer não encontrado' });
        }

        const token = await PlanoService.addTokensToPersonal(
            personalId,
            quantidade,
            adminId,
            customDays,
            motivo
        );

        res.status(201).json({
            message: 'Tokens adicionados com sucesso',
            token
        });
    } catch (error) {
        console.error('Error adding tokens:', error);
        res.status(500).json({ message: 'Erro ao adicionar tokens' });
    }
});

/**
 * GET /api/admin/personal-trainers - Get all personal trainers with their current plan status
 */
router.get('/personal-trainers', async (req, res) => {
    try {
        const personalTrainers = await PersonalTrainer.find({ 
            role: 'Personal Trainer' 
        }).select('nome email createdAt');

        const personalTrainersWithStatus = await Promise.all(
            personalTrainers.map(async (personal) => {
                const personalId = personal._id?.toString();
                if (!personalId) return null;
                
                const status = await PlanoService.getPersonalCurrentPlan(personalId);
                return {
                    _id: personal._id,
                    nome: personal.nome,
                    email: personal.email,
                    createdAt: personal.createdAt,
                    planoAtual: status.plano?.nome || 'Sem plano',
                    alunosAtivos: status.alunosAtivos,
                    limiteAlunos: status.limiteAtual,
                    percentualUso: status.limiteAtual > 0 ? Math.round((status.alunosAtivos / status.limiteAtual) * 100) : 0
                };
            })
        );

        // Filter out null values
        const filteredResults = personalTrainersWithStatus.filter(Boolean);

        res.json(filteredResults);
    } catch (error) {
        console.error('Error fetching personal trainers:', error);
        res.status(500).json({ message: 'Erro ao buscar personal trainers' });
    }
});

/**
 * POST /api/admin/cleanup-expired - Cleanup expired plans and tokens
 */
router.post('/cleanup-expired', async (req, res) => {
    try {
        const result = await PlanoService.cleanupExpired();
        res.json({
            message: 'Limpeza realizada com sucesso',
            ...result
        });
    } catch (error) {
        console.error('Error cleaning up expired items:', error);
        res.status(500).json({ message: 'Erro ao realizar limpeza' });
    }
});

export default router;