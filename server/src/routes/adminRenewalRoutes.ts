// server/src/routes/adminRenewalRoutes.ts
import express from 'express';
import RenewalRequest from '../../models/RenewalRequest.js';
import PlanoService from '../../services/PlanoService.js';
import Plano from '../../models/Plano.js';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateAdmin } from '../../middlewares/authenticateAdmin.js'; // Import ajustado
import mongoose from 'mongoose';
import { sendNotification } from '../../services/NotificationService.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';

const router = express.Router();

// Aplica a verificação de administrador para todas as rotas abaixo
router.use(authenticateAdmin);

/**
 * GET /api/admin/renewal-requests
 * Lista todas as solicitações de renovação pendentes ou em processamento.
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
 * PATCH /api/admin/renewal-requests/:id/status
 * Atualiza status da solicitação (APPROVED|REJECTED|FULFILLED)
 */
router.patch('/:id/status', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { status, notes } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
    }

    // Validação de status
    const validStatuses = ['APPROVED', 'REJECTED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ mensagem: 'Status inválido.' });
    }

    request.status = status;
    if (notes) request.notes = notes;
    request.processedAt = new Date();
    request.adminId = (req as any).admin.id;

    // Se aprovado, ativa o plano (ponto de injeção)
    if (status === 'APPROVED') {
      try {
        // Aqui você conecta com sua lógica de ativação existente
        // await activatePlanForPersonal(request.personalTrainerId.toString(), request.planIdRequested?.toString());
        console.log(`[ATIVAÇÃO] Plano aprovado para personal ${request.personalTrainerId}`);
      } catch (activationError) {
        console.error('Erro na ativação do plano:', activationError);
        // Não falha a requisição, apenas loga
      }
    }

    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      notes: request.notes,
      processedAt: request.processedAt
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar status' });
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/payment-link
 * Admin envia o link de pagamento ao personal após a solicitação.
 * Expecta corpo { paymentLink: string }
 */
router.put('/:id/payment-link', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { paymentLink } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ mensagem: 'Solicitação não encontrada ou em estado inválido.' });
    }

    request.paymentLink = paymentLink;
    request.status = 'payment_link_sent';
    request.adminId = (req as any).admin.id;
    await request.save();

    // Notificar o personal informando que o link está disponível (opcional)
    // await sendNotification(request.personalTrainerId.toString(), 'Seu link de pagamento está disponível.');

    res.json(request);
  } catch (error) {
    console.error('Erro ao enviar link de pagamento:', error);
    res.status(500).json({ mensagem: 'Erro ao enviar link de pagamento' });
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/approve
 * Aprova a renovação após o personal anexar o comprovante.
 * body opcional: { customDuration?: number, motivo?: string }
 */
router.put('/:id/approve', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { customDuration, motivo } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request || request.status !== 'payment_proof_uploaded') {
      return res.status(400).json({ mensagem: 'Solicitação não encontrada ou em estado inválido.' });
    }

    // Verifica se o plano desejado existe
    const planId = request.planIdRequested?.toString();
    if (!planId) {
      return res.status(400).json({ mensagem: 'Plano solicitado não informado.' });
    }

    // Cria/renova o plano para o personal (o personal decidirá depois quais alunos continuam)
    const newPersonalPlano = await PlanoService.assignPlanToPersonal(
      request.personalTrainerId.toString(),
      planId,
      (req as any).admin.id,
      customDuration,
      motivo || 'Renovação aprovada'
    );

    // Atualiza a solicitação
    request.status = 'approved';
    request.processedAt = new Date();
    request.adminId = (req as any).admin.id;
    await request.save();

    // Notificar o personal para escolher os alunos no novo ciclo (opcional)
    // await sendNotification(request.personalTrainerId.toString(), 'Seu plano foi renovado! Selecione quais alunos continuarão.');

    res.json({ request, newPersonalPlano });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    res.status(500).json({ mensagem: 'Erro ao aprovar solicitação' });
  }
});

export default router;
