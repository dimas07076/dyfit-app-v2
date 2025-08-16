// server/src/routes/adminRenewalRoutes.ts
import express from 'express';
import RenewalRequest from '../../models/RenewalRequest.js';
import PlanoService from '../../services/PlanoService.js';
import Plano from '../../models/Plano.js';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateAdmin } from '../../middlewares/authenticateAdmin.js';
import mongoose from 'mongoose';
import { sendNotification } from '../../services/NotificationService.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';

const router = express.Router();

// Todas as rotas exigem admin autenticado
router.use(authenticateAdmin);

/**
 * GET /api/admin/renewal-requests
 * Lista solicitações PENDENTES/EM PROCESSO
 */
router.get('/', async (req, res) => {
  await dbConnect();
  try {
    const requests = await RenewalRequest.find({
      status: { $in: ['pending', 'payment_link_sent', 'payment_proof_uploaded'] }
    }).populate('personalTrainerId planIdRequested');
    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar solicitações' });
  }
});

/**
 * GET /api/admin/renewal-requests/:id/proof/download
 * Admin baixa comprovante de pagamento (arquivo)
 */
router.get('/:id/proof/download', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;

    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
    }

    if (!request.proof || request.proof.kind !== 'file' || !request.proof.fileId) {
      return res.status(404).json({ mensagem: 'Comprovante não encontrado ou é um link.' });
    }

    const bucket = getPaymentProofBucket();
    const downloadStream = bucket.openDownloadStream(request.proof.fileId);

    res.set({
      'Content-Type': request.proof.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${request.proof.filename || 'comprovante.pdf'}"`
    });

    downloadStream.pipe(res);

    downloadStream.on('error', (error) => {
      console.error('Erro ao baixar arquivo:', error);
      if (!res.headersSent) {
        res.status(404).json({ mensagem: 'Arquivo não encontrado.' });
      }
    });
  } catch (error) {
    console.error('Erro ao baixar comprovante:', error);
    res.status(500).json({ mensagem: 'Erro ao baixar comprovante' });
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/payment-link
 * Envia link de pagamento ao personal
 */
router.put('/:id/payment-link', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { paymentLink } = req.body;

  try {
    if (!paymentLink || typeof paymentLink !== 'string') {
      return res.status(400).json({
        mensagem: 'Link de pagamento é obrigatório e deve ser uma string.',
        code: 'INVALID_PAYMENT_LINK'
      });
    }

    try {
      new URL(paymentLink);
    } catch {
      return res.status(400).json({
        mensagem: 'Link de pagamento deve ser uma URL válida.',
        code: 'INVALID_URL_FORMAT'
      });
    }

    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas solicitações pendentes podem receber link de pagamento.`,
        code: 'INVALID_STATUS'
      });
    }

    request.paymentLink = paymentLink;
    request.status = 'payment_link_sent';
    request.linkSentAt = new Date();
    request.adminId = (req as any).user.id;
    await request.save();

    res.json({
      _id: request._id,
      paymentLink: request.paymentLink,
      status: request.status,
      linkSentAt: request.linkSentAt,
      adminId: request.adminId,
      updatedAt: request.updatedAt
    });
  } catch (error) {
    console.error('Erro ao enviar link de pagamento:', error);
    res.status(500).json({
      mensagem: 'Erro interno do servidor ao enviar link de pagamento.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/approve
 * Aprova a renovação e ATIVA o plano solicitado
 * body opcional: { customDuration?: number, motivo?: string }
 */
router.put('/:id/approve', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { customDuration, motivo } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });
    }

    if (request.status !== 'payment_proof_uploaded') {
      return res.status(400).json({
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas solicitações com comprovante enviado podem ser aprovadas.`,
        code: 'INVALID_STATUS'
      });
    }

    const planId = request.planIdRequested?.toString();
    if (!planId) {
      return res.status(400).json({ mensagem: 'Plano solicitado não informado.', code: 'MISSING_PLAN_ID' });
    }

    const newPersonalPlano = await PlanoService.assignPlanToPersonal(
      request.personalTrainerId.toString(),
      planId,
      (req as any).user.id,
      customDuration,
      motivo || 'Renovação aprovada'
    );

    request.status = 'approved';
    request.processedAt = new Date();
    request.adminId = (req as any).user.id;
    await request.save();

    res.json({
      request: {
        _id: request._id,
        status: request.status,
        processedAt: request.processedAt,
        adminId: request.adminId
      },
      newPersonalPlano
    });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({
      mensagem: 'Erro interno do servidor ao aprovar solicitação.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * PATCH /api/admin/renewal-requests/:id/decision
 * Fallback idempotente: se approved=true, também ATIVA o plano (mesma lógica da /approve)
 * Body: { approved: boolean, note?: string }
 */
router.patch('/:id/decision', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { approved, note } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });
    }

    if (request.status !== 'payment_proof_uploaded') {
      return res.status(400).json({
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas solicitações com comprovante enviado podem ser decididas.`,
        code: 'INVALID_STATUS'
      });
    }

    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        mensagem: 'Campo "approved" deve ser true ou false.',
        code: 'INVALID_DECISION'
      });
    }

    let newPersonalPlano: any = null;

    if (approved) {
      const planId = request.planIdRequested?.toString();
      if (!planId) {
        return res.status(400).json({ mensagem: 'Plano solicitado não informado.', code: 'MISSING_PLAN_ID' });
      }

      newPersonalPlano = await PlanoService.assignPlanToPersonal(
        request.personalTrainerId.toString(),
        planId,
        (req as any).user.id,
        undefined,
        note || 'Renovação aprovada'
      );

      request.status = 'approved';
    } else {
      request.status = 'rejected';
    }

    request.paymentDecisionAt = new Date();
    request.paymentDecisionNote = note || '';
    request.processedAt = new Date();
    request.adminId = (req as any).user.id;

    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      notes: request.notes,
      paymentDecisionAt: request.paymentDecisionAt,
      paymentDecisionNote: request.paymentDecisionNote,
      processedAt: request.processedAt,
      adminId: request.adminId,
      newPersonalPlano
    });
  } catch (error) {
    console.error('Erro ao processar decisão:', error);
    res.status(500).json({
      mensagem: 'Erro interno do servidor ao processar decisão.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * PATCH /api/admin/renewal-requests/:id/status
 * (permanece disponível, mas sem ativar plano)
 */
router.patch('/:id/status', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { status, notes } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });
    }

    const validStatuses = ['APPROVED', 'REJECTED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        mensagem: `Status inválido: ${status}. Status válidos: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }

    request.status = status;
    if (notes) request.notes = notes;
    request.processedAt = new Date();
    request.adminId = (req as any).user.id;

    // intencionalmente não ativa plano aqui
    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      notes: request.notes,
      processedAt: request.processedAt,
      adminId: request.adminId
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      mensagem: 'Erro interno do servidor ao atualizar status.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;
