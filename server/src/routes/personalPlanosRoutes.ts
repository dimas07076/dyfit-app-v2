// server/src/routes/personalPlanosRoutes.ts
import express from 'express';
import PlanoService from '../../services/PlanoService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/personal/meu-plano - Get current plan status for authenticated personal trainer
 */
router.get('/meu-plano', async (req, res) => {
    try {
        const personalTrainerId = (req as any).user.id;
        const status = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
        
        res.json({
            plano: status.plano,
            personalPlano: status.personalPlano,
            limiteAtual: status.limiteAtual,
            alunosAtivos: status.alunosAtivos,
            tokensAvulsos: status.tokensAvulsos,
            percentualUso: status.limiteAtual > 0 ? Math.round((status.alunosAtivos / status.limiteAtual) * 100) : 0,
            podeAtivarMais: status.limiteAtual > status.alunosAtivos,
            vagasDisponiveis: status.limiteAtual - status.alunosAtivos
        });
    } catch (error) {
        console.error('Error fetching personal plan status:', error);
        res.status(500).json({ message: 'Erro ao buscar status do plano' });
    }
});

/**
 * GET /api/personal/can-activate/:quantidade? - Check if can activate more students
 */
router.get('/can-activate/:quantidade?', async (req, res) => {
    try {
        const personalTrainerId = (req as any).user.id;
        const quantidade = parseInt(req.params.quantidade || '1');
        
        if (quantidade < 1) {
            return res.status(400).json({ message: 'Quantidade deve ser pelo menos 1' });
        }

        const status = await PlanoService.canActivateMoreStudents(personalTrainerId, quantidade);
        
        res.json(status);
    } catch (error) {
        console.error('Error checking activation capability:', error);
        res.status(500).json({ message: 'Erro ao verificar capacidade de ativação' });
    }
});

/**
 * GET /api/personal/tokens-ativos - Get active tokens for personal trainer
 */
router.get('/tokens-ativos', async (req, res) => {
    try {
        const personalTrainerId = (req as any).user.id;
        const tokensQuantity = await PlanoService.getTokensAvulsosAtivos(personalTrainerId);
        
        res.json({
            quantidadeTotal: tokensQuantity
        });
    } catch (error) {
        console.error('Error fetching active tokens:', error);
        res.status(500).json({ message: 'Erro ao buscar tokens ativos' });
    }
});

/**
 * GET /api/personal/planos-disponiveis - Get available plans (for reference/upgrade info)
 */
router.get('/planos-disponiveis', async (req, res) => {
    try {
        const planos = await PlanoService.getAllPlans();
        
        // Return plans without admin-specific information
        const planosPublicos = planos.map(plano => ({
            _id: plano._id,
            nome: plano.nome,
            descricao: plano.descricao,
            limiteAlunos: plano.limiteAlunos,
            preco: plano.preco,
            duracao: plano.duracao,
            tipo: plano.tipo
        }));
        
        res.json(planosPublicos);
    } catch (error) {
        console.error('Error fetching available plans:', error);
        res.status(500).json({ message: 'Erro ao buscar planos disponíveis' });
    }
});

export default router;