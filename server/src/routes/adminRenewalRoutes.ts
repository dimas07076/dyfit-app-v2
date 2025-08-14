// server/src/routes/adminRenewalRoutes.ts
import express from 'express';
import RenewalRequest from '../../models/RenewalRequest.js';
import PlanoService from '../../services/PlanoService.js';
import Plano from '../../models/Plano.js';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateAdmin } from '../../middlewares/authenticateAdmin.js'; // Import ajustado
import mongoose from 'mongoose';
import { sendNotification } from '../../services/NotificationService.js';

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
