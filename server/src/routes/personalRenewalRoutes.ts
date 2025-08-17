import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';

import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest from '../../models/RenewalRequest.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';
import PlanoService from '../../services/PlanoService.js';
import Aluno from '../../models/Aluno.js';
import PersonalPlano from '../../models/PersonalPlano.js';

const router = express.Router();
router.use(authenticateToken);

// Upload (link OU arquivo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.match(/^(image\/(jpeg|png)|application\/pdf)$/)) cb(null, true);
    else cb(new Error('Apenas arquivos JPEG, PNG e PDF são permitidos'));
  }
});

/** Listagem das minhas solicitações (com filtro opcional por status) */
async function listMyRenewals(req: any, res: any) {
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
    .sort({ createdAt: -1 })
    .limit(lim);

  res.json(items);
}

/** GET (duas formas de montagem compatíveis) */
router.get('/renewal-requests', listMyRenewals);
router.get('/', listMyRenewals);

/** POST /api/personal/renewal-requests — cria uma nova solicitação */
router.post('/', upload.single('paymentProof'), async (req, res) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;
    const { planIdRequested, paymentLink, notes } = req.body as { planIdRequested: string; paymentLink?: string; notes?: string };
    const file = (req as any).file as Express.Multer.File | undefined;

    if (paymentLink && file) {
      return res.status(400).json({ mensagem: 'Forneça apenas um link OU um arquivo, não ambos.', code: 'CONFLICTING_PAYMENT_PROOF' });
    }

    let proof: any = undefined;
    let initialStatus: any = 'pending';

    if (file) {
      const bucket = await getPaymentProofBucket();
      const uploadStream = bucket.openUploadStream(file.originalname, {
        metadata: { contentType: file.mimetype, personalId: personalTrainerId, uploadedAt: new Date() }
      });
      uploadStream.end(file.buffer);
      proof = {
        kind: 'file' as const,
        fileId: uploadStream.id,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      };
      initialStatus = 'payment_proof_uploaded';
    }

    if (paymentLink) {
      proof = { kind: 'link' as const, url: paymentLink, uploadedAt: new Date() };
      initialStatus = 'payment_proof_uploaded';
    }

    const newRequest = new RenewalRequest({
      personalTrainerId,
      personalId: personalTrainerId,
      planIdRequested,
      planId: planIdRequested,
      status: initialStatus,
      notes,
      proof,
      proofUploadedAt: proof ? new Date() : undefined,
      paymentLink: paymentLink || undefined,
      paymentProofUrl: proof?.kind === 'file' ? `file:${proof.fileId}` : undefined
    });

    await newRequest.save();

    res.status(201).json({
      _id: newRequest._id,
      personalTrainerId: newRequest.personalTrainerId,
      planIdRequested: newRequest.planIdRequested,
      status: newRequest.status,
      proof: newRequest.proof,
      notes: newRequest.notes,
      createdAt: newRequest.createdAt
    });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ mensagem: 'Dados inválidos fornecidos.', code: 'VALIDATION_ERROR', details: (error as any).errors });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ mensagem: `Erro no upload: ${error.message}`, code: 'UPLOAD_ERROR' });
    }
    res.status(500).json({ mensagem: 'Erro interno do servidor ao solicitar renovação.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

/** Download do comprovante (se for arquivo) */
router.get('/:id/proof/download', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;
    const personalTrainerId = (req as any).user.id;

    const request = await RenewalRequest.findOne({ _id: requestId, personalTrainerId });
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });

    if (!request.proof || request.proof.kind !== 'file' || !request.proof.fileId) {
      return res.status(404).json({ mensagem: 'Comprovante não encontrado ou é um link.' });
    }

    const bucket = await getPaymentProofBucket();
    const downloadStream = bucket.openDownloadStream(request.proof.fileId);

    res.set({
      'Content-Type': request.proof.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${request.proof.filename || 'comprovante.pdf'}"`
    });

    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Erro ao baixar arquivo:', error);
      if (!res.headersSent) res.status(404).json({ mensagem: 'Arquivo não encontrado.' });
    });
  } catch (error) {
    console.error('Erro ao baixar comprovante:', error);
    res.status(500).json({ mensagem: 'Erro ao baixar comprovante' });
  }
});

/** PUT compat para anexar link após envio de link de pagamento */
router.put('/:id/payment-proof', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;
    const { paymentProofUrl } = req.body as { paymentProofUrl: string };

    const request = await RenewalRequest.findOne({
      _id: requestId,
      personalTrainerId: (req as any).user.id
    });

    if (!request || request.status !== 'payment_link_sent') {
      return res.status(400).json({ mensagem: 'Solicitação não encontrada ou em estado inválido.' });
    }

    request.paymentProofUrl = paymentProofUrl;
    request.status = 'payment_proof_uploaded';
    (request as any).proofUploadedAt = new Date();
    request.proof = { kind: 'link', url: paymentProofUrl, uploadedAt: new Date() } as any;

    await request.save();
    res.json(request);
  } catch (error) {
    console.error('Erro ao anexar comprovante:', error);
    res.status(500).json({ mensagem: 'Erro ao anexar comprovante' });
  }
});

/** POST envio de comprovante (link OU arquivo) */
router.post('/:id/proof', upload.single('paymentProof'), async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;
    const personalTrainerId = (req as any).user.id;
    const { paymentProofUrl } = req.body as { paymentProofUrl?: string };
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!paymentProofUrl && !file) {
      return res.status(400).json({ mensagem: 'Forneça link ou arquivo de comprovante.', code: 'MISSING_PAYMENT_PROOF' });
    }
    if (paymentProofUrl && file) {
      return res.status(400).json({ mensagem: 'Use apenas link OU arquivo.', code: 'CONFLICTING_PAYMENT_PROOF' });
    }

    const request = await RenewalRequest.findOne({ _id: requestId, personalTrainerId });
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });

    if (request.status !== 'payment_link_sent') {
      return res.status(400).json({ mensagem: `Estado inválido: ${request.status}. Apenas com link enviado.`, code: 'INVALID_STATUS' });
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
      } as any;
      request.paymentProofUrl = undefined;
    } else {
      request.proof = { kind: 'link', url: paymentProofUrl, uploadedAt: new Date() } as any;
      request.paymentProofUrl = paymentProofUrl!;
    }

    request.status = 'payment_proof_uploaded';
    (request as any).proofUploadedAt = new Date();
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Erro ao enviar comprovante:', error);
    res.status(500).json({ mensagem: 'Erro ao enviar comprovante' });
  }
});

/**
 * POST /api/personal/renewal-requests/:id/finalize-cycle
 * Confirma o ciclo (kept/removed) e ENCERRA o pedido com status FULFILLED.
 */
router.post('/renewal-requests/:id/finalize-cycle', async (req, res) => {
  await dbConnect();
  const renewalId = req.params.id;
  const userId = (req as any).user.id;
  const { keepStudentIds = [], removeStudentIds = [], note } = req.body || {};

  try {
    if (!mongoose.isValidObjectId(renewalId)) {
      return res.status(400).json({ mensagem: 'renewalId inválido.' });
    }

    const request = await RenewalRequest.findById(renewalId);
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });

    if (request.personalTrainerId.toString() !== userId) {
      return res.status(403).json({ mensagem: 'Sem permissão para finalizar esta solicitação.' });
    }

    if (['FULFILLED', 'REJECTED'].includes(request.status as any)) {
      return res.status(200).json({ renewalId: request._id, status: 'FULFILLED', message: 'Pedido já encerrado.' });
    }

    if (!['approved', 'APPROVED', 'cycle_assignment_pending'].includes(request.status as any)) {
      return res.status(409).json({ mensagem: `Estado inválido: ${request.status}.` });
    }

    const activePlan = await PersonalPlano.findOne({ personalTrainerId: userId, ativo: true }).populate('planoId');
    if (!activePlan) return res.status(409).json({ mensagem: 'Plano ativo não encontrado para aplicar o ciclo.' });

    const limite = (activePlan as any).limiteAlunos ?? (activePlan as any).planoId?.limite ?? 1;
    if (Array.isArray(keepStudentIds) && keepStudentIds.length > limite) {
      return res.status(400).json({ mensagem: `Quantidade acima do limite do plano (${limite}).` });
    }

    const keepSet = new Set<string>(Array.isArray(keepStudentIds) ? keepStudentIds.map(String) : []);
    const removeSet = new Set<string>(Array.isArray(removeStudentIds) ? removeStudentIds.map(String) : []);
    for (const id of keepSet) removeSet.delete(id);

    const allIds = [...keepSet, ...removeSet];
    if (allIds.length) {
      const count = await Aluno.countDocuments({ _id: { $in: allIds }, trainerId: new mongoose.Types.ObjectId(userId) });
      if (count !== allIds.length) return res.status(400).json({ mensagem: 'Há alunos que não pertencem ao personal.' });
    }

    const now = new Date();
    if (keepSet.size) {
      await Aluno.updateMany(
        { _id: { $in: Array.from(keepSet) }, trainerId: new mongoose.Types.ObjectId(userId) },
        { $set: { status: 'active', slotType: 'plan', slotId: activePlan._id, slotStartDate: now, slotEndDate: (activePlan as any).dataVencimento || null } }
      );
    }
    if (removeSet.size) {
      await Aluno.updateMany(
        { _id: { $in: Array.from(removeSet) }, trainerId: new mongoose.Types.ObjectId(userId) },
        { $set: { status: 'inactive', slotEndDate: now }, $unset: { slotType: '', slotId: '', slotStartDate: '' } }
      );
    }

    request.status = 'FULFILLED' as any;
    (request as any).closedAt = now;
    (request as any).closedBy = new mongoose.Types.ObjectId(userId);
    if (note) (request as any).notes = note;
    await request.save();

    res.json({
      renewalId: request._id,
      status: request.status,
      closedAt: (request as any).closedAt,
      kept: Array.from(keepSet),
      removed: Array.from(removeSet),
    });
  } catch (error) {
    console.error('Erro ao finalizar ciclo:', error);
    res.status(500).json({ mensagem: 'Erro interno ao finalizar ciclo.' });
  }
});

/**
 * POST /api/personal/renovar-plano
 * FINALIZA o ciclo sem :id — fecha quaisquer 'approved'/'APPROVED' ou 'cycle_assignment_pending' pendentes do personal como 'FULFILLED'.
 * Se não houver approved, retorna 409 (NO_APPROVED_REQUEST).
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

      // Deve existir pelo menos uma approved pendente
      const approvedList = await RenewalRequest
        .find({ personalTrainerId, status: { $in: ['approved', 'APPROVED', 'cycle_assignment_pending'] } })
        .session(session);
      if (!approvedList.length) {
        const err: any = new Error('Não há solicitação aprovada pendente para este personal.');
        err.status = 409; err.code = 'NO_APPROVED_REQUEST';
        throw err;
      }

      // Plano atual ativo
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

      // 1) Inativa todos os alunos ativos e limpa slots
      await Aluno.updateMany(
        { trainerId: personalObjectId, status: 'active' },
        { $set: { status: 'inactive' }, $unset: { slotType: '', slotId: '', slotStartDate: '', slotEndDate: '' } },
        { session }
      );

      // 2) Reativa somente os selecionados, vinculando ao slot do plano
      if (alunosSelecionados.length > 0) {
        await Aluno.updateMany(
          { _id: { $in: alunosSelecionadosIds }, trainerId: personalObjectId },
          { $set: { status: 'active', slotType: 'plan', slotId: personalPlano._id, slotStartDate: personalPlano.dataInicio, slotEndDate: personalPlano.dataVencimento } },
          { session }
        );
      }

      // 3) Fecha TODAS as approved/cycle_assignment_pending pendentes (blindagem)
      const result = await RenewalRequest.updateMany(
        { personalTrainerId, status: { $in: ['approved', 'APPROVED', 'cycle_assignment_pending'] } },
        { $set: { status: 'FULFILLED', processedAt: new Date(), closedAt: new Date() } },
        { session }
      );

      if (result.modifiedCount > 0) {
        type IdOnly = { _id: mongoose.Types.ObjectId };
        const closed = await RenewalRequest
          .find({ personalTrainerId, status: 'FULFILLED' })
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
