// server/src/routes/personalPlanosRoutes.ts
import express from 'express';
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
router.get('/meu-plano', async (req, res) => {
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
    res.status(500).json({ mensagem: 'Erro ao buscar status do plano' });
  }
});

/**
 * GET /api/personal/can-activate/:quantidade? - Verifica se há vagas para cadastrar mais alunos
 */
router.get('/can-activate/:quantidade?', async (req, res) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    const quantidade = parseInt(req.params.quantidade || '1');
    if (quantidade < 1) {
      return res.status(400).json({ mensagem: 'Quantidade deve ser pelo menos 1' });
    }
    const status = await PlanoService.canActivateMoreStudents(personalTrainerId, quantidade);
    res.json(status);
  } catch (error) {
    console.error('Erro ao verificar vagas disponíveis:', error);
    res.status(500).json({ mensagem: 'Erro ao verificar capacidade de ativação' });
  }
});

/**
 * GET /api/personal/tokens-ativos - Retorna a quantidade de tokens avulsos ativos
 */
router.get('/tokens-ativos', async (req, res) => {
  try {
    await dbConnect();
    const personalTrainerId = (req as any).user.id;
    const tokensQuantity = await PlanoService.getTokensAvulsosAtivos(personalTrainerId);
    res.json({ quantidadeTotal: tokensQuantity });
  } catch (error) {
    console.error('Erro ao buscar tokens ativos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar tokens ativos' });
  }
});

/**
 * GET /api/personal/meus-tokens - Lista detalhes dos tokens avulsos ativos do personal
 */
router.get('/meus-tokens', async (req, res) => {
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
    res.status(500).json({ mensagem: 'Erro ao buscar tokens' });
  }
});

/**
 * GET /api/personal/planos-disponiveis - Lista todos os planos disponíveis para upgrade/downgrade
 */
router.get('/planos-disponiveis', async (req, res) => {
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
    res.status(500).json({ mensagem: 'Erro ao buscar planos disponíveis' });
  }
});

/**
 * POST /api/personal/renovar-plano - Renova ou troca de plano e associa alunos à nova vigência
 *
 * Este endpoint recebe:
 *   - novoPlanoId: ID do plano a ser atribuído
 *   - alunosSelecionados: array de IDs de alunos que continuarão no novo plano
 *   - customDuration (opcional): duração em dias (caso queira personalizar)
 *   - motivo (opcional): motivo da renovação/upgrade/downgrade
 *
 * Lógica:
 *   1. Atribui o novo plano ao personal (cria um novo registro em PersonalPlano).
 *   2. Verifica o limite de alunos do plano.
 *   3. Atualiza os alunos selecionados, redefinindo:
 *        slotType: 'plan'
 *        slotId: ID do novo PersonalPlano
 *        slotStartDate: data de início do plano
 *        slotEndDate: data de vencimento do plano
 *   4. Caso o número de alunos selecionados seja maior que o limite, retorna erro.
 *
 * Alunos não incluídos na lista continuam com os slots do plano anterior e expirarão
 * de acordo com a data antiga. Assim, não liberam vagas no novo ciclo.
 */
router.post('/renovar-plano', async (req, res) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;
    const { novoPlanoId, alunosSelecionados, customDuration, motivo } = req.body;

    if (!novoPlanoId) {
      return res.status(400).json({ mensagem: 'novoPlanoId é obrigatório' });
    }

    // Atribui o novo plano ao personal
    const personalPlano = await PlanoService.assignPlanToPersonal(
      personalTrainerId,
      novoPlanoId,
      null,
      customDuration,
      motivo || 'Renovação de plano'
    );

    // Busca o plano para obter o limite de alunos
    const plan = await Plano.findById(novoPlanoId);
    const limiteAlunos = plan?.limiteAlunos || 0;

    // Se houver seleção de alunos, verifica se não excede o limite
    if (Array.isArray(alunosSelecionados) && alunosSelecionados.length > limiteAlunos) {
      return res.status(400).json({
        mensagem: `Número de alunos selecionados excede o limite do novo plano (${limiteAlunos})`
      });
    }

    // Atualiza alunos selecionados com os dados do novo plano
    if (Array.isArray(alunosSelecionados)) {
      for (const alunoId of alunosSelecionados) {
        const aluno = await Aluno.findOne({
          _id: new mongoose.Types.ObjectId(alunoId),
          trainerId: personalTrainerId
        });

        if (aluno) {
          aluno.slotType = 'plan';
          aluno.slotId = new mongoose.Types.ObjectId(String(personalPlano._id)); // conversão explícita
          aluno.slotStartDate = personalPlano.dataInicio;
          aluno.slotEndDate = personalPlano.dataVencimento;
          await aluno.save();
        }
      }
    }

    res.json({
      mensagem: 'Plano renovado/atualizado com sucesso e alunos atualizados.',
      personalPlano
    });
  } catch (error) {
    console.error('Erro ao renovar plano:', error);
    res.status(500).json({ mensagem: 'Erro ao renovar plano' });
  }
});

export default router;
