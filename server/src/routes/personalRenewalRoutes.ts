// server/src/routes/personalRenewalRoutes.ts
import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';

import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest, { IRenewalRequest, RStatus, RenewalStatus } from '../../models/RenewalRequest.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';
import PlanoService from '../../services/PlanoService.js';
import Aluno from '../../models/Aluno.js';
import PersonalPlano from '../../models/PersonalPlano.js';

/**
 * Função auxiliar para finalizar ciclo com anti-abuso de tokens
 */
async function finalizeCycleWithAntiAbuse(
  userId: string, 
  keepStudentIds: string[], 
  activePlan: any, 
  session: any
) {
  const personalObjectId = new mongoose.Types.ObjectId(userId);

  // ANTI-ABUSO: Limpar reservas de tokens do ciclo anterior
  await PlanoService.clearPreviousCycleTokenReservations(userId);

  // Inativa todos os alunos ativos do personal
  await Aluno.updateMany(
    { trainerId: personalObjectId, status: 'active' },
    { 
      $set: { status: 'inactive' }, 
      $unset: { 
        slotType: "", 
        slotId: "", 
        slotStartDate: "", 
        slotEndDate: "",
        cycleId: "",
        tokenReservedForCycle: ""
      } 
    },
    { session }
  );
  
  // Reativa apenas os alunos selecionados
  if (keepStudentIds.length > 0) {
    await Aluno.updateMany(
      { _id: { $in: keepStudentIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, trainerId: personalObjectId },
      { $set: { 
          status: 'active', 
          slotType: 'plan', 
          slotId: activePlan._id, 
          slotStartDate: activePlan.dataInicio, 
          slotEndDate: activePlan.dataVencimento,
          cycleId: activePlan._id,
          tokenReservedForCycle: false // Alunos do plano não precisam de reserva de token
        } 
      },
      { session }
    );
  }
}

const router = express.Router();
router.use(authenticateToken);

// Configuração do Multer (upload de arquivos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/^(image\/(jpeg|png)|application\/pdf)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JPEG, PNG e PDF são permitidos'));
    }
  }
});

/**
 * Lista as solicitações do personal logado.
 */
async function listMyRenewals(req: any, res: any, next: any) {
  try {
    await dbConnect();
    const personalTrainerId = req.user.id;
    const { status, limit } = req.query as { status?: string; limit?: string };

    const query: any = { personalTrainerId };
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = { $in: statuses };
    }

    const lim = Math.max(1, Math.min(parseInt(limit || '25', 10) || 25, 100));

    const items = await RenewalRequest
      .find(query)
      .populate('planIdRequested', 'nome') // Popula o nome do plano
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean<IRenewalRequest[]>();

    res.json(items);
  } catch (error) {
    console.error('[PersonalRenewalRoutes] Erro ao listar solicitações:', error);
    next(error);
  }
}

router.get('/renewal-requests', listMyRenewals);
router.get('/', listMyRenewals);

/**
 * Cria uma nova solicitação de renovação (sem comprovante ainda).
 */
router.post('/', async (req, res, next) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;
    const { planIdRequested, notes } = req.body as { planIdRequested: string; notes?: string };

    if (!planIdRequested) {
      return res.status(400).json({ mensagem: 'O ID do plano solicitado é obrigatório.', code: 'MISSING_PLAN_ID' });
    }

    const openRequest = await RenewalRequest.findOne({
      personalTrainerId,
      status: { $in: [RStatus.REQUESTED, RStatus.LINK_SENT, RStatus.PROOF_SUBMITTED, RStatus.APPROVED, RStatus.CYCLE_ASSIGNMENT_PENDING, RStatus.PENDING, RStatus.PAYMENT_LINK_SENT, RStatus.PAYMENT_PROOF_UPLOADED] }
    });

    if (openRequest) {
      return res.status(409).json({
        mensagem: 'Você já possui uma solicitação de renovação em andamento. Aguarde a conclusão do processo atual.',
        code: 'OPEN_REQUEST_EXISTS'
      });
    }

    const newRequest = new RenewalRequest({
      personalTrainerId,
      planIdRequested,
      status: RStatus.REQUESTED,
      notes,
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (error) {
    next(error);
  }
});

/**
 * Download do comprovante (se for arquivo).
 */
router.get('/:id/proof/download', async (req, res, next) => {
    await dbConnect();
    try {
      const requestId = req.params.id;
      const personalTrainerId = (req as any).user.id;
  
      const request = await RenewalRequest.findOne({ _id: requestId, personalTrainerId });
      if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
  
      if (!request.proof || request.proof.kind !== 'file' || !request.proof.fileId) {
        return res.status(404).json({ mensagem: 'Comprovante não encontrado ou é um link externo.' });
      }
  
      const bucket = await getPaymentProofBucket();
      const downloadStream = bucket.openDownloadStream(request.proof.fileId);
  
      res.set({
        'Content-Type': request.proof.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${request.proof.filename || 'comprovante'}"`,
      });
  
      downloadStream.pipe(res);
      downloadStream.on('error', (err) => {
        console.error('Erro no download do comprovante:', err);
        if (!res.headersSent) {
          res.status(404).json({ mensagem: 'Arquivo de comprovante não encontrado no armazenamento.' });
        }
      });
    } catch (error) {
      next(error);
    }
});
  
/**
 * Rota para o personal enviar o comprovante (link ou arquivo).
 */
router.post('/:id/proof', upload.single('paymentProof'), async (req, res, next) => {
    await dbConnect();
    try {
      const requestId = req.params.id;
      const personalTrainerId = (req as any).user.id;
      const { paymentProofUrl } = req.body as { paymentProofUrl?: string };
      const file = (req as any).file as Express.Multer.File | undefined;
  
      if (!paymentProofUrl && !file) {
        return res.status(400).json({ mensagem: 'Forneça um link ou um arquivo de comprovante.', code: 'MISSING_PAYMENT_PROOF' });
      }
      if (paymentProofUrl && file) {
        return res.status(400).json({ mensagem: 'Envie apenas um link OU um arquivo, não ambos.', code: 'CONFLICTING_PAYMENT_PROOF' });
      }
  
      const request = await RenewalRequest.findOne({ _id: requestId, personalTrainerId });
      if (!request) {
        return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
      }
      
      const validStatuses: RenewalStatus[] = [RStatus.LINK_SENT, RStatus.PAYMENT_LINK_SENT];
      if (!validStatuses.includes(request.status)) {
        return res.status(400).json({ mensagem: `Não é possível enviar comprovante para uma solicitação com status "${request.status}". Aguarde o envio do link de pagamento.`, code: 'INVALID_STATUS' });
      }
  
      if (file) {
        const bucket = await getPaymentProofBucket();
        const uploadStream = bucket.openUploadStream(file.originalname, {
          metadata: { contentType: file.mimetype, personalId: personalTrainerId, uploadedAt: new Date() }
        });
        uploadStream.end(file.buffer);
  
        request.proof = {
          kind: 'file',
          fileId: uploadStream.id,
          filename: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        };
        request.paymentProofUrl = undefined; // Limpa o campo legado
      } else if (paymentProofUrl) {
        request.proof = { kind: 'link', url: paymentProofUrl, uploadedAt: new Date() };
        request.paymentProofUrl = paymentProofUrl; // Mantém compatibilidade
      }
  
      request.status = RStatus.PROOF_SUBMITTED;
      request.proofUploadedAt = new Date();
      await request.save();
  
      res.json(request);
    } catch (error) {
      next(error);
    }
});

/**
 * Rota para finalizar o ciclo de renovação sem ID específico.
 * Encontra automaticamente a solicitação aprovada do personal e a finaliza.
 * IMPORTANTE: Esta rota deve vir ANTES da rota com parâmetro :id para evitar conflitos
 */
router.post('/finalize-cycle', async (req, res, next) => {
    await dbConnect();
    const userId = (req as any).user.id;
    const { keepStudentIds = [], removeStudentIds = [], note } = req.body || {};
    const session = await mongoose.startSession();
  
    try {
      await session.withTransaction(async () => {
        // Encontra a solicitação aprovada ou pendente de atribuição de ciclo
        const validStatuses: RenewalStatus[] = [RStatus.APPROVED, RStatus.CYCLE_ASSIGNMENT_PENDING];
        const request = await RenewalRequest.findOne({ 
          personalTrainerId: userId, 
          status: { $in: validStatuses }
        }).session(session);
        
        if (!request) {
          throw { status: 404, message: 'Nenhuma solicitação aprovada encontrada para finalizar.' };
        }
        
        const finalizedStatuses: RenewalStatus[] = [RStatus.FULFILLED, RStatus.REJECTED];
        if (finalizedStatuses.includes(request.status)) {
          res.status(200).json({ renewalId: request._id, status: request.status, message: 'Pedido já encerrado.' });
          return;
        }
  
        const activePlan = await PersonalPlano.findOne({ personalTrainerId: userId, ativo: true }).populate('planoId').session(session);
        if (!activePlan) throw { status: 409, message: 'Plano ativo não encontrado para aplicar o ciclo.' };
  
        const limite = (activePlan as any).planoId?.limiteAlunos ?? 0;
        if (Array.isArray(keepStudentIds) && keepStudentIds.length > limite) {
          throw { status: 400, message: `Quantidade de alunos selecionados (${keepStudentIds.length}) excede o limite do plano (${limite}).` };
        }
  
        const personalObjectId = new mongoose.Types.ObjectId(userId);
  
        // Inativa todos os alunos ativos do personal
        await Aluno.updateMany(
          { trainerId: personalObjectId, status: 'active' },
          { $set: { status: 'inactive' }, $unset: { slotType: "", slotId: "", slotStartDate: "", slotEndDate: "" } },
          { session }
        );
        
        // Reativa apenas os alunos selecionados
        if (keepStudentIds.length > 0) {
          await Aluno.updateMany(
            { _id: { $in: keepStudentIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, trainerId: personalObjectId },
            { $set: { 
                status: 'active', 
                slotType: 'plan', 
                slotId: activePlan._id, 
                slotStartDate: activePlan.dataInicio, 
                slotEndDate: activePlan.dataVencimento 
              } 
            },
            { session }
          );
        }
        
        // Finaliza a solicitação
        request.status = RStatus.FULFILLED;
        request.cycleFinalizedAt = new Date();
        if (note) request.notes = `${request.notes || ''}\nNota de finalização: ${note}`.trim();
        await request.save({ session });
  
        res.json({
          renewalId: request._id,
          status: request.status,
          cycleFinalizedAt: request.cycleFinalizedAt,
          kept: keepStudentIds,
          removed: removeStudentIds,
        });
      });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
});

/**
 * Rota para o personal finalizar o ciclo de renovação, ativando os alunos selecionados.
 * Esta rota aceita um ID específico da solicitação.
 */
router.post('/:id/finalize-cycle', async (req, res, next) => {
    await dbConnect();
    const renewalId = req.params.id;
    const userId = (req as any).user.id;
    const { keepStudentIds = [], removeStudentIds = [], note } = req.body || {};
    const session = await mongoose.startSession();
  
    try {
      await session.withTransaction(async () => {
        if (!mongoose.isValidObjectId(renewalId)) {
          throw { status: 400, message: 'ID da solicitação inválido.' };
        }
  
        const request = await RenewalRequest.findById(renewalId).session(session);
        if (!request) throw { status: 404, message: 'Solicitação não encontrada.' };
        if (request.personalTrainerId.toString() !== userId) {
          throw { status: 403, message: 'Sem permissão para finalizar esta solicitação.' };
        }
        
        const finalizedStatuses: RenewalStatus[] = [RStatus.FULFILLED, RStatus.REJECTED];
        if (finalizedStatuses.includes(request.status)) {
          res.status(200).json({ renewalId: request._id, status: request.status, message: 'Pedido já encerrado.' });
          return;
        }
        
        const validStatuses: RenewalStatus[] = [RStatus.APPROVED, RStatus.CYCLE_ASSIGNMENT_PENDING];
        if (!validStatuses.includes(request.status)) {
          throw { status: 409, message: `Estado inválido: ${request.status}. A solicitação precisa estar aprovada.` };
        }
  
        const activePlan = await PersonalPlano.findOne({ personalTrainerId: userId, ativo: true }).populate('planoId').session(session);
        if (!activePlan) throw { status: 409, message: 'Plano ativo não encontrado para aplicar o ciclo.' };
  
        const limite = (activePlan as any).planoId?.limiteAlunos ?? 0;
        if (Array.isArray(keepStudentIds) && keepStudentIds.length > limite) {
          throw { status: 400, message: `Quantidade de alunos selecionados (${keepStudentIds.length}) excede o limite do plano (${limite}).` };
        }
  
        const personalObjectId = new mongoose.Types.ObjectId(userId);
  
        // Inativa todos os alunos ativos do personal
        await Aluno.updateMany(
          { trainerId: personalObjectId, status: 'active' },
          { $set: { status: 'inactive' }, $unset: { slotType: "", slotId: "", slotStartDate: "", slotEndDate: "" } },
          { session }
        );
        
        // Reativa apenas os alunos selecionados
        if (keepStudentIds.length > 0) {
          await Aluno.updateMany(
            { _id: { $in: keepStudentIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, trainerId: personalObjectId },
            { $set: { 
                status: 'active', 
                slotType: 'plan', 
                slotId: activePlan._id, 
                slotStartDate: activePlan.dataInicio, 
                slotEndDate: activePlan.dataVencimento 
              } 
            },
            { session }
          );
        }
        
        // Finaliza a solicitação
        request.status = RStatus.FULFILLED;
        request.cycleFinalizedAt = new Date();
        if (note) request.notes = `${request.notes || ''}\nNota de finalização: ${note}`.trim();
        await request.save({ session });
  
        res.json({
          renewalId: request._id,
          status: request.status,
          cycleFinalizedAt: request.cycleFinalizedAt,
          kept: keepStudentIds,
          removed: removeStudentIds,
        });
      });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
});

/**
 * POST /api/personal/renovar-plano (Rota LEGADA para compatibilidade)
 */
router.post('/renovar-plano', async (req, res, next) => {
    await dbConnect();
    const session = await mongoose.startSession();
  
    try {
      let closedRequests: string[] = [];
  
      await session.withTransaction(async () => {
        const personalTrainerId = (req as any).user?.id as string;
        const { alunosSelecionados } = req.body as { alunosSelecionados: string[] };
  
        if (!personalTrainerId) throw new Error('Usuário não autenticado.');
        if (!Array.isArray(alunosSelecionados)) throw new Error('A lista de alunos selecionados é inválida.');
  
        const approvedStatuses: RenewalStatus[] = [RStatus.APPROVED, 'APPROVED' as any, RStatus.CYCLE_ASSIGNMENT_PENDING];
        const approvedList = await RenewalRequest
          .find({ personalTrainerId, status: { $in: approvedStatuses } })
          .session(session);
        if (!approvedList.length) {
          const err: any = new Error('Não há solicitação aprovada pendente para este personal.');
          err.status = 409; err.code = 'NO_APPROVED_REQUEST';
          throw err;
        }
  
        const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
        if (!planStatus || !planStatus.personalPlano || (planStatus as any).isExpired) {
          const err: any = new Error('Nenhum plano ativo foi encontrado. A renovação pode não ter sido concluída pelo administrador.');
          err.status = 409; err.code = 'NO_ACTIVE_PLAN'; throw err;
        }
  
        const { personalPlano, plano, tokensAvulsos } = planStatus as any;
        if (!plano) {
          const err: any = new Error('Detalhes do plano ativo não foram encontrados.');
          err.status = 409; err.code = 'PLAN_DETAILS_NOT_FOUND'; throw err;
        }
  
        const limiteTotal = (plano.limiteAlunos || 0) + (tokensAvulsos || 0);
        if (alunosSelecionados.length > limiteTotal) {
          const err: any = new Error(`Limite de vagas excedido. Seu limite total é de ${limiteTotal} (plano + tokens).`);
          err.status = 400; err.code = 'LIMIT_EXCEEDED'; throw err;
        }
  
        const personalObjectId = new mongoose.Types.ObjectId(personalTrainerId);
        const alunosSelecionadosIds = alunosSelecionados.map((id) => new mongoose.Types.ObjectId(id));
  
        await Aluno.updateMany(
          { trainerId: personalObjectId, status: 'active' },
          { $set: { status: 'inactive' }, $unset: { slotType: "", slotId: "", slotStartDate: "", slotEndDate: "" } },
          { session }
        );
  
        if (alunosSelecionados.length > 0) {
          await Aluno.updateMany(
            { _id: { $in: alunosSelecionadosIds }, trainerId: personalObjectId },
            { $set: { status: 'active', slotType: 'plan', slotId: personalPlano._id, slotStartDate: personalPlano.dataInicio, slotEndDate: personalPlano.dataVencimento } },
            { session }
          );
        }
  
        const result = await RenewalRequest.updateMany(
          { personalTrainerId, status: { $in: approvedStatuses } },
          { $set: { status: RStatus.FULFILLED, paymentDecisionAt: new Date(), cycleFinalizedAt: new Date() } },
          { session }
        );
  
        if (result.modifiedCount > 0) {
          type IdOnly = { _id: mongoose.Types.ObjectId };
          const closed = await RenewalRequest
            .find({ personalTrainerId, status: RStatus.FULFILLED })
            .sort({ updatedAt: -1 })
            .limit(result.modifiedCount)
            .select('_id')
            .lean<IdOnly[]>()
            .session(session);
  
          closedRequests = closed.map((r) => r._id.toString());
        }
      });
  
      res.json({
        mensagem: 'Ciclo de renovação finalizado e alunos atualizados com sucesso!',
        closedRequests,
        dados: { alunosMantidos: (req.body?.alunosSelecionados || []).length }
      });
    } catch (error: any) {
      if (error?.code) return res.status(error.status || 409).json({ mensagem: error.message, code: error.code });
      next(error);
    } finally {
      await session.endSession();
    }
});

export default router;