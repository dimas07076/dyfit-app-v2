// server/src/routes/adminRenewalRoutes.ts
import express from 'express';
import mongoose from 'mongoose';

import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest from '../../models/RenewalRequest.js';
import PlanoService from '../../services/PlanoService.js';
import Plano from '../../models/Plano.js';
import { authenticateAdmin } from '../../middlewares/authenticateAdmin.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';

const router = express.Router();

// Todas as rotas abaixo exigem admin autenticado
router.use(authenticateAdmin);

/**
 * GET /api/admin/renewal-requests
 * Lista solicitações em estados operacionais para o admin atuar.
 * Popula o personal e o plano para exibir nome corretamente.
 */
router.get('/', async (req, res) => {
  await dbConnect();
  try {
    const { status, limit } = req.query as { status?: string; limit?: string };
    const lim = Math.max(1, Math.min(parseInt((limit as string) || '50', 10) || 50, 200));

    const baseStatuses = ['pending', 'payment_link_sent', 'payment_proof_uploaded'];
    const listStatuses = status ? (status as string).split(',').map(s => s.trim()) : baseStatuses;

    const requests = await RenewalRequest.find({ status: { $in: listStatuses } })
      .populate('personalTrainerId', 'nome email')
      .populate('planIdRequested', 'nome limiteAlunos tipo duracao')
      .sort({ createdAt: -1 })
      .limit(lim);

    res.json(requests);
  } catch (error) {
    console.error('[AdminRenewal] Erro ao listar solicitações:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar solicitações' });
  }
});

/**
 * GET /api/admin/renewal-requests/:id/proof/download
 * Baixa um comprovante (quando arquivado).
 */
router.get('/:id/proof/download', async (req, res) => {
  await dbConnect();
  try {
    const request = await RenewalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });

    if (!request.proof || request.proof.kind !== 'file' || !request.proof.fileId) {
      return res.status(404).json({ mensagem: 'Comprovante não encontrado ou é um link.' });
    }

    const bucket = await getPaymentProofBucket();
    const downloadStream = bucket.openDownloadStream(request.proof.fileId as mongoose.Types.ObjectId);

    res.set({
      'Content-Type': request.proof.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${request.proof.filename || 'comprovante.pdf'}"`,
    });

    downloadStream.pipe(res);
    downloadStream.on('error', (err) => {
      console.error('Erro no download do comprovante:', err);
      if (!res.headersSent) res.status(404).json({ mensagem: 'Arquivo não encontrado.' });
    });
  } catch (error) {
    console.error('Erro ao baixar comprovante:', error);
    res.status(500).json({ mensagem: 'Erro ao baixar comprovante' });
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/payment-link
 * Envia (ou atualiza) link de pagamento para a solicitação.
 * Body: { paymentLink: string }
 */
router.put('/:id/payment-link', async (req, res) => {
  await dbConnect();
  const { paymentLink } = req.body as { paymentLink?: string };
  try {
    if (!paymentLink || typeof paymentLink !== 'string') {
      return res.status(400).json({ mensagem: 'Link de pagamento é obrigatório e deve ser uma string.', code: 'INVALID_PAYMENT_LINK' });
    }

    const request = await RenewalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });

    if (request.status !== 'pending' && request.status !== 'requested' && request.status !== 'link_sent') {
      // Permitimos também atualizar para quem veio do fluxo antigo "requested/link_sent"
      // e o novo "pending".
      return res.status(400).json({ mensagem: `Solicitação em estado inválido: ${request.status}.`, code: 'INVALID_STATUS' });
    }

    request.paymentLink = paymentLink;
    request.status = 'payment_link_sent' as any;
    (request as any).linkSentAt = new Date();
    (request as any).adminId = (req as any).user.id;
    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      paymentLink: request.paymentLink,
      linkSentAt: (request as any).linkSentAt,
    });
  } catch (error) {
    console.error('[AdminRenewal] Erro ao salvar link de pagamento:', error);
    res.status(500).json({ mensagem: 'Erro interno ao enviar link de pagamento.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/approve
 * Aprova uma solicitação com comprovante e ativa/renova o plano do personal.
 * Body opcional: { customDuration?: number, motivo?: string }
 */
router.put('/:id/approve', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { customDuration, motivo } = req.body as { customDuration?: number; motivo?: string };

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });

    if (request.status !== 'payment_proof_uploaded' && request.status !== 'proof_submitted') {
      return res.status(400).json({
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas com comprovante enviado pode ser aprovada.`,
        code: 'INVALID_STATUS',
      });
    }

    const planId = request.planIdRequested?.toString();
    if (!planId) {
      return res.status(400).json({ mensagem: 'Plano solicitado não informado.', code: 'MISSING_PLAN_ID' });
    }

    // Garante que o plano exista (evita “Manter categoria” sem nome)
    const plano = await Plano.findById(planId);
    if (!plano) return res.status(400).json({ mensagem: 'Plano inexistente.', code: 'PLAN_NOT_FOUND' });

    // Cria/renova a vigência para o personal (o personal definirá o ciclo em seguida)
    const newPersonalPlano = await PlanoService.assignPlanToPersonal(
      request.personalTrainerId.toString(),
      planId,
      (req as any).user.id,
      customDuration,
      motivo || 'Renovação aprovada'
    );

    request.status = 'approved' as any;
    (request as any).processedAt = new Date();
    (request as any).adminId = (req as any).user.id;
    await request.save();

    res.json({
      request: {
        _id: request._id,
        status: request.status,
        processedAt: (request as any).processedAt,
        adminId: (request as any).adminId,
        planIdRequested: request.planIdRequested,
        personalTrainerId: request.personalTrainerId,
      },
      newPersonalPlano,
    });
  } catch (error) {
    console.error('[AdminRenewal] Erro ao aprovar solicitação:', error);
    res.status(500).json({ mensagem: 'Erro interno ao aprovar solicitação.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

/**
 * PATCH /api/admin/renewal-requests/:id/decision
 * Alternativa genérica: { approved: boolean, note?: string }
 */
router.patch('/:id/decision', async (req, res) => {
  await dbConnect();
  const { approved, note } = req.body as { approved?: boolean; note?: string };
  try {
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ mensagem: 'Campo "approved" deve ser true ou false.' });
    }
    const request = await RenewalRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });

    if (request.status !== 'payment_proof_uploaded' && request.status !== 'proof_submitted') {
      return res.status(400).json({ mensagem: `Estado inválido: ${request.status}.`, code: 'INVALID_STATUS' });
    }

    (request as any).paymentDecisionAt = new Date();
    if (note) (request as any).paymentDecisionNote = note;

    if (approved) {
      request.status = 'approved' as any;
      (request as any).processedAt = new Date();
      (request as any).adminId = (req as any).user.id;
    } else {
      request.status = 'rejected' as any;
      (request as any).processedAt = new Date();
      (request as any).adminId = (req as any).user.id;
    }

    await request.save();
    res.json({
      _id: request._id,
      status: request.status,
      paymentDecisionAt: (request as any).paymentDecisionAt,
      paymentDecisionNote: (request as any).paymentDecisionNote,
      processedAt: (request as any).processedAt,
    });
  } catch (error) {
    console.error('[AdminRenewal] Erro ao decidir solicitação:', error);
    res.status(500).json({ mensagem: 'Erro interno ao decidir solicitação.', code: 'INTERNAL_SERVER_ERROR' });
  }
});

export default router;
