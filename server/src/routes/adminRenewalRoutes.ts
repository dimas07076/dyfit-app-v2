// server/src/routes/adminRenewalRoutes.ts
import express from 'express';
import mongoose from 'mongoose';

import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest, { RStatus } from '../../models/RenewalRequest.js';
import PlanoService from '../../services/PlanoService.js';
import Plano from '../../models/Plano.js';
import { authenticateAdmin } from '../../middlewares/authenticateAdmin.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';

const router = express.Router();

// Todas as rotas abaixo exigem que o usuário seja um administrador autenticado.
router.use(authenticateAdmin);

/**
 * GET /api/admin/renewal-requests
 * Lista solicitações que requerem ação do administrador.
 * Popula os dados do personal e do plano para exibição na interface.
 */
router.get('/', async (req, res, next) => {
  await dbConnect();
  try {
    const { status, limit } = req.query as { status?: string; limit?: string };
    const lim = Math.max(1, Math.min(parseInt(limit || '50', 10) || 50, 200));

    // Por padrão, busca solicitações que precisam de alguma ação do admin.
    const defaultStatuses = [
      RStatus.REQUESTED, 
      RStatus.PROOF_SUBMITTED,
      // Status legados para garantir compatibilidade
      'pending', 
      'payment_proof_uploaded'
    ];
    
    const listStatuses = status ? status.split(',').map(s => s.trim()) : defaultStatuses;

    const requests = await RenewalRequest.find({ status: { $in: listStatuses } })
      .populate('personalTrainerId', 'nome email')
      .populate('planIdRequested', 'nome limiteAlunos tipo duracao')
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();

    // Enriquecer resposta com campos derivados para melhor exibição no admin
    const enrichedRequests = requests.map(doc => ({
      ...doc,
      requestKind: doc.planIdRequested ? 'PLAN' : 'TOKEN',
      requestLabel: (doc.planIdRequested as any)?.nome ?? 'Token avulso (30 dias)',
      requestBadge: doc.planIdRequested ? 'Plano' : 'Token',
      requestDescription: doc.planIdRequested ? undefined : 'Crédito de 1 token com validade de 30 dias',
    }));

    res.json(enrichedRequests);
  } catch (error) {
    console.error('[AdminRenewal] Erro ao listar solicitações:', error);
    next(error);
  }
});

/**
 * GET /api/admin/renewal-requests/:id/proof/download
 * Permite que o administrador baixe um comprovante que foi enviado como arquivo.
 */
router.get('/:id/proof/download', async (req, res, next) => {
  await dbConnect();
  try {
    const request = await RenewalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
    }

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
    console.error('Erro ao baixar comprovante:', error);
    next(error);
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/payment-link
 * Admin envia o link de pagamento para o personal.
 * Body: { paymentLink: string }
 */
router.put('/:id/payment-link', async (req, res, next) => {
  await dbConnect();
  const { paymentLink } = req.body as { paymentLink?: string };
  try {
    if (!paymentLink || typeof paymentLink !== 'string') {
      return res.status(400).json({ mensagem: 'Link de pagamento é obrigatório.', code: 'INVALID_PAYMENT_LINK' });
    }

    const request = await RenewalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });
    }

    if (request.status !== RStatus.REQUESTED) {
      return res.status(400).json({ mensagem: `A solicitação não está mais aguardando um link (status atual: ${request.status}).`, code: 'INVALID_STATUS' });
    }

    request.paymentLink = paymentLink;
    request.status = RStatus.LINK_SENT;
    request.linkSentAt = new Date();
    request.adminId = new mongoose.Types.ObjectId((req as any).user.id);
    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      paymentLink: request.paymentLink,
      linkSentAt: request.linkSentAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/renewal-requests/:id/approve
 * Aprova uma solicitação de renovação (plano ou token).
 * Para planos: ativa o novo plano e o personal precisará finalizar o ciclo.
 * Para tokens: adiciona 1 token com validade de 30 dias.
 * Body (opcional): { customDuration?: number, motivo?: string }
 */
router.put('/:id/approve', async (req, res, next) => {
  await dbConnect();
  const requestId = req.params.id;
  const { customDuration, motivo } = req.body as { customDuration?: number; motivo?: string };

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.', code: 'REQUEST_NOT_FOUND' });
    }

    if (request.status !== RStatus.PROOF_SUBMITTED) {
      return res.status(400).json({
        mensagem: `Apenas solicitações com comprovante enviado podem ser aprovadas (status atual: ${request.status}).`,
        code: 'INVALID_STATUS',
      });
    }

    const adminId = (req as any).user.id;
    let responseData: any = {};

    // Verifica se é uma solicitação de token (sem planIdRequested) ou de plano
    if (!request.planIdRequested) {
      // Solicitação de TOKEN AVULSO
      const newToken = await PlanoService.addTokensToPersonal(
        request.personalTrainerId.toString(),
        1, // 1 token
        adminId,
        customDuration || 30, // 30 dias por padrão
        motivo || 'Token avulso aprovado via solicitação de renovação'
      );

      responseData = {
        message: "Token avulso adicionado com sucesso!",
        request,
        newToken,
        type: 'token'
      };
    } else {
      // Solicitação de PLANO
      const planId = request.planIdRequested.toString();
      const plano = await Plano.findById(planId);
      if (!plano) {
        return res.status(400).json({ mensagem: 'O plano solicitado não existe mais no sistema.', code: 'PLAN_NOT_FOUND' });
      }

      // Atribui o novo plano (isso desativa o antigo)
      const newPersonalPlano = await PlanoService.assignPlanToPersonal(
        request.personalTrainerId.toString(),
        planId,
        adminId,
        customDuration,
        motivo || 'Renovação de plano aprovada'
      );

      responseData = {
        message: "Plano renovado e ativado com sucesso. Aguardando o personal definir o ciclo de alunos.",
        request,
        newPersonalPlano,
        type: 'plan'
      };
    }

    // Atualiza o status da solicitação para indicar que foi aprovada
    request.status = RStatus.APPROVED;
    request.paymentDecisionAt = new Date();
    request.adminId = new mongoose.Types.ObjectId(adminId);
    await request.save();

    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/renewal-requests/:id/decision
 * Rota para REJEITAR uma solicitação.
 * Body: { approved: false, note?: string }
 */
router.patch('/:id/decision', async (req, res, next) => {
  await dbConnect();
  const { approved, note } = req.body as { approved?: boolean; note?: string };
  try {
    if (approved === true) {
      return res.status(400).json({ mensagem: 'Para aprovar, use a rota PUT /:id/approve.' });
    }

    const request = await RenewalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
    }

    if (request.status !== RStatus.PROOF_SUBMITTED) {
      return res.status(400).json({ mensagem: `Não é possível rejeitar uma solicitação com status "${request.status}".`, code: 'INVALID_STATUS' });
    }

    request.status = RStatus.REJECTED;
    request.paymentDecisionAt = new Date();
    request.paymentDecisionNote = note;
    request.adminId = new mongoose.Types.ObjectId((req as any).user.id);

    await request.save();
    res.json(request);
  } catch (error) {
    next(error);
  }
});

export default router;