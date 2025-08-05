// server/src/routes/adminPlanosRoutes.ts
import express from 'express';
import PlanoService from '../../services/PlanoService.js';
import PersonalTrainer from '../../models/PersonalTrainer.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authorizeAdmin } from '../../middlewares/authorizeAdmin.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(authorizeAdmin);

/**
 * GET /api/admin/planos/status - Check plans status
 */
router.get('/planos/status', async (req, res) => {
    try {
        await dbConnect();
        
        console.log('🔍 Verificando status dos planos...');
        
        const status = await PlanoService.ensureInitialPlansExist();
        const planos = await PlanoService.getAllPlans();
        
        res.json({
            status: status ? 'ok' : 'error',
            planosCount: planos.length,
            planos: planos.map(p => ({ 
                nome: p.nome, 
                limiteAlunos: p.limiteAlunos, 
                preco: p.preco, 
                ativo: p.ativo 
            })),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao verificar status dos planos:', error);
        res.status(500).json({ 
            message: 'Erro ao verificar status dos planos',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});

/**
 * GET /api/admin/planos - Get all plans
 */
router.get('/planos', async (req, res) => {
    try {
        await dbConnect();
        
        console.log('📊 Recebida requisição para listar planos...');
        
        const planos = await PlanoService.getAllPlans();
        
        console.log(`✅ Retornando ${planos.length} planos encontrados.`);
        
        res.json(planos);
    } catch (error) {
        console.error('❌ Erro ao buscar planos:', error);
        
        res.status(500).json({ 
            message: 'Erro ao buscar planos',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/planos - Create or update a plan
 */
router.post('/planos', async (req, res) => {
    try {
        await dbConnect();
        
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
        await dbConnect();
        
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
        await dbConnect();
        
        const { personalId } = req.params;
        const { planoId, customDuration, motivo } = req.body;
        const adminId = (req as any).user.id;

        console.log('🔄 Atribuindo plano:', { personalId, planoId, customDuration, motivo });

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

        console.log('✅ Plano atribuído com sucesso:', personalPlano._id);

        res.status(201).json({
            message: 'Plano atribuído com sucesso',
            personalPlano,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error assigning plan:', error);
        res.status(500).json({ 
            message: error instanceof Error ? error.message : 'Erro ao atribuir plano',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/admin/personal/:personalId/add-tokens - Add tokens to personal trainer
 */
router.post('/personal/:personalId/add-tokens', async (req, res) => {
    try {
        await dbConnect();
        
        const { personalId } = req.params;
        const { quantidade, customDays, motivo } = req.body;
        const adminId = (req as any).user.id;

        console.log('🔄 Adicionando tokens:', { personalId, quantidade, customDays, motivo });

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

        console.log('✅ Tokens adicionados com sucesso:', token._id);

        res.status(201).json({
            message: 'Tokens adicionados com sucesso',
            token,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error adding tokens:', error);
        res.status(500).json({ 
            message: 'Erro ao adicionar tokens',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/admin/personal-trainers - Get all personal trainers with their current plan status
 */
router.get('/personal-trainers', async (req, res) => {
    try {
        await dbConnect();
        
        console.log('📊 Buscando personal trainers com status de planos...');
        
        const personalTrainers = await PersonalTrainer.find({ 
            role: 'Personal Trainer' 
        }).select('nome email createdAt statusAssinatura limiteAlunos dataInicioAssinatura dataFimAssinatura planoId');

        console.log(`✅ Encontrados ${personalTrainers.length} personal trainers.`);

        const personalTrainersWithStatus = await Promise.all(
            personalTrainers.map(async (personal) => {
                const personalId = personal._id?.toString();
                if (!personalId) return null;
                
                try {
                    const status = await PlanoService.getPersonalCurrentPlan(personalId);
                    
                    const planoNome = (status.plano && status.plano.nome) ? status.plano.nome : 'Sem plano';
                    const planoId = (status.plano && status.plano._id) ? status.plano._id : null;
                    const planoDisplay = (status.plano && status.plano.nome) ? 
                        status.plano.nome : 
                        'Sem plano';
                    
                    // Extract plan dates - prefer active plan, fallback to expired plan
                    let dataInicio = null;
                    let dataVencimento = null;
                    
                    if (status.personalPlano) {
                        dataInicio = status.personalPlano.dataInicio;
                        dataVencimento = status.personalPlano.dataVencimento;
                    }
                    
                    const personalData = {
                        _id: personal._id,
                        nome: personal.nome,
                        email: personal.email,
                        createdAt: personal.createdAt,
                        statusAssinatura: personal.statusAssinatura,
                        dataInicioAssinatura: personal.dataInicioAssinatura,
                        dataFimAssinatura: personal.dataFimAssinatura,
                        planoId: personal.planoId, 

                        planoAtual: planoNome, 
                        planoDisplay: planoDisplay, 
                        alunosAtivos: status.alunosAtivos,
                        limiteAlunos: status.limiteAtual, // Total limit: base plan + active tokens
                        percentualUso: status.limiteAtual > 0 ? Math.round((status.alunosAtivos / status.limiteAtual) * 100) : 0,
                        hasActivePlan: !!(status.plano && status.plano.nome && !status.isExpired),
                        isExpired: status.isExpired, // New field for expiration status
                        dataInicio: dataInicio, // Plan start date (preserved when expired)
                        dataVencimento: dataVencimento, // Plan expiration date (preserved when expired)
                        planDetails: (status.plano && status.plano.nome) ? {
                            id: status.plano._id,
                            nome: status.plano.nome,
                            limiteAlunos: status.plano.limiteAlunos,
                            preco: status.plano.preco
                        } : null
                    };

                    // --- NOVO LOG DE DIAGNÓSTICO NO BACKEND ---
                    console.log(`[adminPlanosRoutes] Dados finais para ${personal.nome} ANTES de enviar:`, JSON.stringify(personalData, null, 2));
                    // --- FIM NOVO LOG DE DIAGNÓSTICO NO BACKEND ---

                    return personalData;
                } catch (error) {
                    console.error(`❌ Erro ao buscar status do personal ${personalId}:`, error);
                    return {
                        _id: personal._id,
                        nome: personal.nome,
                        email: personal.email,
                        createdAt: personal.createdAt,
                        planoAtual: 'Erro ao carregar',
                        planoId: null,
                        planoDisplay: 'Erro ao carregar',
                        alunosAtivos: 0,
                        limiteAlunos: 0,
                        percentualUso: 0,
                        hasActivePlan: false,
                        isExpired: false,
                        dataInicio: null,
                        dataVencimento: null,
                        planDetails: null
                    };
                }
            })
        );

        const filteredResults = personalTrainersWithStatus.filter(Boolean);
        
        console.log(`✅ Retornando dados de ${filteredResults.length} personal trainers com status.`);

        res.json(filteredResults); 
    } catch (error) {
        console.error('❌ Erro ao buscar personal trainers:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar personal trainers',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
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
