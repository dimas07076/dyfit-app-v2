// server/src/routes/personalPlanosRoutes.ts

import express, { Request, Response, NextFunction } from 'express';
import PlanoService from '../../services/PlanoService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
import Aluno from '../../models/Aluno.js';
import Plano from '../../models/Plano.js';
import mongoose from 'mongoose';

const router = express.Router();

// Aplica autenticação a todas as rotas
router.use(authenticateToken);

/**
 * GET /api/personal/meu-plano - Consulta o plano atual do personal
 */
router.get('/meu-plano', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    console.log(`🔍 API /meu-plano chamada para personalTrainerId: ${personalTrainerId}`);
    
    const status = await PlanoService.getPersonalCurrentPlan(personalTrainerId);

    console.log(`🔍 Status retornado: limiteAtual=${status.limiteAtual}, alunosAtivos=${status.alunosAtivos}, tokensAvulsos=${status.tokensAvulsos}`);

    // Adiciona uma verificação para retornar 404 se não houver plano,
    // o que é esperado para novos usuários e tratado pelo frontend.
    if (!status.plano && !status.personalPlano) {
      return res.status(404).json({
        message: 'Nenhum plano ativo ou expirado encontrado para este personal trainer.',
        code: 'PLAN_NOT_FOUND',
      });
    }

    const response = {
      plano: status.plano,
      personalPlano: status.personalPlano,
      limiteAtual: status.limiteAtual,
      alunosAtivos: status.alunosAtivos,
      tokensAvulsos: status.tokensAvulsos,
      percentualUso: status.limiteAtual > 0 ? Math.round((status.alunosAtivos / status.limiteAtual) * 100) : 0,
      podeAtivarMais: status.limiteAtual > status.alunosAtivos,
      vagasDisponiveis: status.limiteAtual - status.alunosAtivos
    };

    console.log(`🔍 Resposta sendo enviada:`, JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Erro ao consultar plano do personal:', error);
    next(error);
  }
});

/**
 * GET /api/personal/can-activate/:quantidade? - Verifica se há vagas para cadastrar mais alunos
 */
router.get('/can-activate/:quantidade?', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    const quantidade = parseInt(req.params.quantidade || '1');
    if (isNaN(quantidade) || quantidade < 1) {
      return res.status(400).json({ mensagem: 'Quantidade deve ser pelo menos 1' });
    }
    const status = await PlanoService.canActivateMoreStudents(personalTrainerId, quantidade);
    res.json(status);
  } catch (error) {
    console.error('Erro ao verificar vagas disponíveis:', error);
    next(error);
  }
});

/**
 * GET /api/personal/tokens-ativos - Retorna a quantidade de tokens avulsos ativos
 */
router.get('/tokens-ativos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    const tokensQuantity = await PlanoService.getTokensAvulsosAtivos(personalTrainerId);
    res.json({ quantidadeTotal: tokensQuantity });
  } catch (error) {
    console.error('Erro ao buscar tokens ativos:', error);
    next(error);
  }
});

/**
 * GET /api/personal/meus-tokens - Lista detalhes dos tokens avulsos ativos do personal
 */
router.get('/meus-tokens', async (req, res, next: NextFunction) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    const detalhes = await PlanoService.getDetailedTokensForAdmin(personalTrainerId);
    const tokens = detalhes.activeTokens.map(token => ({
      id: token._id,
      quantidade: token.quantidade,
      dataAdicao: token.createdAt,
      dataVencimento: token.dataVencimento
    }));
    res.json({ tokens });
  } catch (error) {
    console.error('Erro ao buscar tokens do personal:', error);
    next(error);
  }
});

/**
 * GET /api/personal/debug-tokens - Debug endpoint to check token status for troubleshooting
 */
router.get('/debug-tokens', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    
    console.log(`🐛 DEBUG: Token debug endpoint called for ${personalTrainerId}`);
    
    // Get all tokens (including expired ones) for this personal trainer
    const TokenAvulso = (await import('../../models/TokenAvulso.js')).default;
    const mongoose = (await import('mongoose')).default;
    
    // Try multiple search approaches to find tokens
    const searchResults = {
      byString: [] as any[],
      byObjectId: [] as any[],
      allTokensInDB: [] as any[],
      stringSearchError: null as string | null,
      objectIdSearchError: null as string | null
    };
    
    try {
      // Search using string ID (incorrect but test anyway)
      searchResults.byString = await TokenAvulso.find({ personalTrainerId }).sort({ createdAt: -1 });
      console.log('🐛 DEBUG: Search by string succeeded');
    } catch (e: any) {
      searchResults.stringSearchError = e.message;
      console.log('🐛 DEBUG: Search by string failed:', e.message);
    }
    
    try {
      // Search using ObjectId (correct approach for this schema)
      const objectId = new mongoose.Types.ObjectId(personalTrainerId);
      searchResults.byObjectId = await TokenAvulso.find({ personalTrainerId: objectId }).sort({ createdAt: -1 });
      console.log('🐛 DEBUG: Search by ObjectId succeeded');
    } catch (e: any) {
      searchResults.objectIdSearchError = e.message;
      console.log('🐛 DEBUG: Search by ObjectId failed:', e.message);
    }
    
    try {
      // Get all tokens in database to see what exists
      searchResults.allTokensInDB = await TokenAvulso.find({}).limit(20).sort({ createdAt: -1 });
    } catch (e: any) {
      console.log('🐛 DEBUG: Get all tokens failed:', e.message);
    }
    
    const now = new Date();
    const allTokens = searchResults.byString.length > 0 ? searchResults.byString : searchResults.byObjectId;
    
    const activeTokens = allTokens.filter(token => 
      token.ativo === true && 
      token.dataVencimento && 
      token.dataVencimento > now
    );
    
    const totalActiveQuantity = activeTokens.reduce((sum, token) => sum + (token.quantidade || 0), 0);
    
    // Also get the official count using the service method
    const serviceCount = await PlanoService.getTokensAvulsosAtivos(personalTrainerId);
    
    res.json({
      personalTrainerId,
      personalTrainerIdType: typeof personalTrainerId,
      currentTime: now.toISOString(),
      searchResults: {
        byStringCount: searchResults.byString.length,
        byObjectIdCount: searchResults.byObjectId.length,
        allTokensInDBCount: searchResults.allTokensInDB.length,
        stringSearchError: searchResults.stringSearchError,
        objectIdSearchError: searchResults.objectIdSearchError,
        recommendedApproach: 'ObjectId (since schema expects ObjectId type)'
      },
      allTokensCount: allTokens.length,
      activeTokensCount: activeTokens.length,
      totalActiveQuantity,
      serviceCalculatedCount: serviceCount,
      allTokensInDB: searchResults.allTokensInDB.map(token => ({
        id: token._id,
        personalTrainerId: token.personalTrainerId,
        personalTrainerIdType: typeof token.personalTrainerId,
        quantidade: token.quantidade,
        ativo: token.ativo,
        dataVencimento: token.dataVencimento?.toISOString(),
        isExpired: token.dataVencimento ? token.dataVencimento <= now : true,
        createdAt: token.createdAt?.toISOString(),
        motivoAdicao: token.motivoAdicao
      })),
      allTokens: allTokens.map(token => ({
        id: token._id,
        personalTrainerId: token.personalTrainerId,
        personalTrainerIdType: typeof token.personalTrainerId,
        quantidade: token.quantidade,
        ativo: token.ativo,
        dataVencimento: token.dataVencimento?.toISOString(),
        isExpired: token.dataVencimento ? token.dataVencimento <= now : true,
        createdAt: token.createdAt?.toISOString(),
        motivoAdicao: token.motivoAdicao
      })),
      activeTokens: activeTokens.map(token => ({
        id: token._id,
        quantidade: token.quantidade,
        dataVencimento: token.dataVencimento?.toISOString(),
        motivoAdicao: token.motivoAdicao
      }))
    });
  } catch (error) {
    console.error('🐛 DEBUG: Erro no endpoint de debug de tokens:', error);
    next(error);
  }
});

/**
 * GET /api/personal/planos-disponiveis - Lista todos os planos disponíveis para upgrade/downgrade
 */
router.get('/planos-disponiveis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const planos = await PlanoService.getAllPlans();
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
    console.error('Erro ao buscar planos disponíveis:', error);
    next(error);
  }
});

/**
 * GET /api/personal/plan-history - Verifica se o personal já ativou algum plano anteriormente
 */
router.get('/plan-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    
    // Verifica se o personal já teve algum plano (ativo ou expirado)
    const existingPlan = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
    const hasEverHadPlan = !!(existingPlan.plano || existingPlan.personalPlano);
    
    res.json({
      hasEverHadPlan,
      canActivateFreePlan: !hasEverHadPlan
    });
  } catch (error) {
    console.error('Erro ao verificar histórico de planos:', error);
    next(error);
  }
});

/**
 * POST /api/personal/activate-free-plan - Ativa o plano "Free" para o personal logado.
 */
router.post('/activate-free-plan', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;

    // 1. Verifica se o personal já tem algum plano (ativo ou expirado)
    const existingPlan = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
    if (existingPlan.plano || existingPlan.personalPlano) {
      return res.status(409).json({ message: 'Você já possui ou já teve um plano. A ativação do plano gratuito é permitida apenas uma vez.' });
    }

    // 2. Encontra o plano do tipo "free" no banco de dados
    const freePlan = await Plano.findOne({ tipo: 'free', ativo: true });
    // <<< INÍCIO DA CORREÇÃO >>>
    if (!freePlan || !freePlan._id) {
    // <<< FIM DA CORREÇÃO >>>
      return res.status(404).json({ message: 'O Plano Free não está disponível no momento. Entre em contato com o suporte.' });
    }

    // 3. Atribui o plano ao personal
    const assignedPlan = await PlanoService.assignPlanToPersonal(
      personalTrainerId,
      freePlan._id.toString(),
      null, // adminId é nulo para ativação automática
      freePlan.duracao,
      'Ativação automática do Plano Free'
    );

    res.status(200).json({
      message: 'Plano Free ativado com sucesso!',
      plan: assignedPlan,
    });
  } catch (error) {
    console.error('Erro ao ativar o Plano Free:', error);
    next(error);
  }
});

/**
 * POST /api/personal/renovar-plano - Finaliza o ciclo de renovação, definindo quais alunos continuam.
 * Esta rota NÃO atribui um novo plano, ela assume que o plano já foi ativado pelo admin.
 */
router.post('/renovar-plano', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const personalTrainerId = req.user?.id;
            const { alunosSelecionados } = req.body;

            if (!personalTrainerId) {
                throw new Error('Usuário não autenticado.');
            }
            if (!Array.isArray(alunosSelecionados)) {
                throw new Error('A lista de alunos selecionados é inválida.');
            }

            // 1. Encontra o plano ATUAL e ATIVO do personal (que foi recém atribuído pelo admin).
            const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
            
            if (!planStatus || !planStatus.personalPlano || planStatus.isExpired) {
                throw new Error('Nenhum plano ativo foi encontrado. A renovação pode não ter sido concluída pelo administrador.');
            }
            const { personalPlano, plano, tokensAvulsos } = planStatus;

            if (!plano) {
               throw new Error('Detalhes do plano ativo não foram encontrados.');
            }

            const limiteTotal = (plano.limiteAlunos || 0) + (tokensAvulsos || 0);

            // 2. Valida o limite de alunos.
            if (alunosSelecionados.length > limiteTotal) {
                throw new Error(`Limite de vagas excedido. Seu limite total é de ${limiteTotal} vagas (plano + tokens), mas ${alunosSelecionados.length} alunos foram selecionados.`);
            }

            const personalObjectId = new mongoose.Types.ObjectId(personalTrainerId);
            const alunosSelecionadosIds = alunosSelecionados.map(id => new mongoose.Types.ObjectId(id));

            // 3. Inativa TODOS os alunos do personal que estavam ativos, limpando seus slots.
            // Isso garante que alunos de ciclos antigos não mantenham vagas indevidamente.
            await Aluno.updateMany(
                { trainerId: personalObjectId, status: 'active' },
                { 
                    $set: { status: 'inactive' },
                    $unset: { slotType: "", slotId: "", slotStartDate: "", slotEndDate: "" }
                },
                { session }
            );

            // 4. Reativa os alunos SELECIONADOS, atribuindo o novo slot do plano.
            if (alunosSelecionados.length > 0) {
                await Aluno.updateMany(
                    { _id: { $in: alunosSelecionadosIds }, trainerId: personalObjectId },
                    {
                        $set: {
                            status: 'active',
                            slotType: 'plan',
                            slotId: personalPlano._id,
                            slotStartDate: personalPlano.dataInicio,
                            slotEndDate: personalPlano.dataVencimento,
                        }
                    },
                    { session }
                );
            }
        });

        res.json({
            mensagem: 'Ciclo de renovação finalizado e alunos atualizados com sucesso!',
            dados: {
                alunosMantidos: req.body.alunosSelecionados.length
            }
        });

    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
});


export default router;