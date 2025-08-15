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

// <<< INÍCIO DA ALTERAÇÃO >>>
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
// <<< FIM DA ALTERAÇÃO >>>


export default router;