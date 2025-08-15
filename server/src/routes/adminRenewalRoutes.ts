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
 * GET /api/admin/renewal-requests/:id/proof/sign
 * Generate signed download URL for admin to download proof files
 * Handles both Vercel Blob (new) and GridFS (legacy) files
 */
router.get('/:id/proof/sign', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;

    // findById(:id) and validate existence of renewalRequest.proof
    const request = await RenewalRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ 
        mensagem: 'Solicitação não encontrada.',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    if (!request.proof) {
      return res.status(404).json({ 
        mensagem: 'Comprovante não encontrado.',
        code: 'PROOF_NOT_FOUND'
      });
    }

    // Read { url, filename, mime, size, legacyId } from proof
    const { url, filename, mime, size, legacyId } = {
      url: request.paymentProofUrl,
      filename: request.proof.filename || 'comprovante.pdf',
      mime: request.proof.contentType || 'application/octet-stream',
      size: request.proof.size,
      legacyId: request.proof.fileId
    };

    // If url starts with http (Blob)
    if (url && url.startsWith('http')) {
      // For public blobs, return direct URL
      // For this implementation, we assume Vercel Blob files are public
      return res.status(200).json({
        downloadUrl: url,
        filename,
        mime,
        isLegacyFile: false
      });
    }

    // If arquivo for legado (legacyId or absence of url)
    if (legacyId || !url) {
      if (!legacyId) {
        return res.status(404).json({ 
          mensagem: 'Arquivo legado não possui ID.',
          code: 'LEGACY_FILE_ID_MISSING'
        });
      }

      // Return legacy download endpoint URL
      return res.status(200).json({
        downloadUrl: `/api/admin/renewal-requests/${requestId}/proof/download`,
        filename,
        mime,
        isLegacyFile: true
      });
    }

    return res.status(404).json({ 
      mensagem: 'URL do arquivo não encontrada.',
      code: 'FILE_URL_NOT_FOUND'
    });

  } catch (error) {
    console.error('Erro ao gerar URL de download:', error);
    // Never return 500, always return specific error codes
    return res.status(503).json({ 
      mensagem: 'Serviço temporariamente indisponível.',
      code: 'SERVICE_TEMPORARILY_UNAVAILABLE'
    });
  }
});

/**
 * GET /api/admin/renewal-requests/:id/proof/download
 * Admin baixa comprovante de pagamento (arquivo) - Legacy GridFS files
 */
router.get('/:id/proof/download', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;

    const request = await RenewalRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ 
        mensagem: 'Solicitação não encontrada.',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    if (!request.proof || request.proof.kind !== 'file' || !request.proof.fileId) {
      return res.status(404).json({ 
        mensagem: 'Comprovante não encontrado ou é um link.',
        code: 'PROOF_NOT_FOUND'
      });
    }

    const bucket = getPaymentProofBucket();
    
    // Fazer stream do GridFS/FS with proper headers
    const downloadStream = bucket.openDownloadStream(request.proof.fileId);

    res.setHeader('Content-Type', request.proof.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${request.proof.filename || 'comprovante.pdf'}"`);

    downloadStream.pipe(res);
    
    downloadStream.on('error', (error) => {
      console.error('Erro ao baixar arquivo:', error);
      if (!res.headersSent) {
        res.status(404).json({ 
          mensagem: 'Arquivo não encontrado.',
          code: 'FILE_NOT_FOUND'
        });
      }
    });
  } catch (error) {
    console.error('Erro ao baixar comprovante:', error);
    // Return specific error code instead of 500
    if (!res.headersSent) {
      res.status(503).json({ 
        mensagem: 'Serviço temporariamente indisponível.',
        code: 'SERVICE_TEMPORARILY_UNAVAILABLE'
      });
    }
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
      return res.status(404).json({ 
        mensagem: 'Solicitação não encontrada.',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    // Validação de status
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
    request.adminId = (req as any).user.id; // Fix: use req.user.id instead of req.admin.id

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
    // Validação do paymentLink
    if (!paymentLink || typeof paymentLink !== 'string') {
      return res.status(400).json({ 
        mensagem: 'Link de pagamento é obrigatório e deve ser uma string.',
        code: 'INVALID_PAYMENT_LINK'
      });
    }

    // Validação de URL
    try {
      new URL(paymentLink);
    } catch (urlError) {
      return res.status(400).json({ 
        mensagem: 'Link de pagamento deve ser uma URL válida.',
        code: 'INVALID_URL_FORMAT'
      });
    }

    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ 
        mensagem: 'Solicitação não encontrada.',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas solicitações pendentes podem receber link de pagamento.`,
        code: 'INVALID_STATUS'
      });
    }

    request.paymentLink = paymentLink;
    request.status = 'payment_link_sent';
    request.linkSentAt = new Date(); // Add timestamp when link is sent
    request.adminId = (req as any).user.id; // Fix: use req.user.id instead of req.admin.id
    await request.save();

    // Notificar o personal informando que o link está disponível (opcional)
    // await sendNotification(request.personalTrainerId.toString(), 'Seu link de pagamento está disponível.');

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
 * Aprova a renovação após o personal anexar o comprovante.
 * body opcional: { customDuration?: number, motivo?: string }
 */
router.put('/:id/approve', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { customDuration, motivo } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ 
        mensagem: 'Solicitação não encontrada.',
        code: 'REQUEST_NOT_FOUND'
      });
    }

    if (request.status !== 'payment_proof_uploaded') {
      return res.status(400).json({ 
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas solicitações com comprovante enviado podem ser aprovadas.`,
        code: 'INVALID_STATUS'
      });
    }

    // Verifica se o plano desejado existe
    const planId = request.planIdRequested?.toString();
    if (!planId) {
      return res.status(400).json({ 
        mensagem: 'Plano solicitado não informado.',
        code: 'MISSING_PLAN_ID'
      });
    }

    // Cria/renova o plano para o personal (o personal decidirá depois quais alunos continuam)
    const newPersonalPlano = await PlanoService.assignPlanToPersonal(
      request.personalTrainerId.toString(),
      planId,
      (req as any).user.id, // Fix: use req.user.id instead of req.admin.id
      customDuration,
      motivo || 'Renovação aprovada'
    );

    // Atualiza a solicitação
    request.status = 'approved';
    request.processedAt = new Date();
    request.adminId = (req as any).user.id; // Fix: use req.user.id instead of req.admin.id
    await request.save();

    // Notificar o personal para escolher os alunos no novo ciclo (opcional)
    // await sendNotification(request.personalTrainerId.toString(), 'Seu plano foi renovado! Selecione quais alunos continuarão.');

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
 * Admin decide (aprovar/rejeitar) após comprovante enviado
 * Body: { approved: boolean, note?: string }
 */
router.patch('/:id/decision', async (req, res) => {
  await dbConnect();
  const requestId = req.params.id;
  const { approved, note } = req.body;

  try {
    const request = await RenewalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ 
        mensagem: 'Solicitação não encontrada.',
        code: 'REQUEST_NOT_FOUND'
      });
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

    request.status = approved ? 'approved' : 'rejected';
    request.paymentDecisionAt = new Date();
    request.paymentDecisionNote = note || '';
    request.processedAt = new Date();
    request.adminId = (req as any).user.id;

    // Se aprovado, ativar plano (ponto de injeção)
    if (approved) {
      try {
        // Conectar com lógica de ativação existente
        console.log(`[ATIVAÇÃO] Plano aprovado para personal ${request.personalTrainerId}`);
      } catch (activationError) {
        console.error('Erro na ativação do plano:', activationError);
      }
    }

    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      paymentDecisionAt: request.paymentDecisionAt,
      paymentDecisionNote: request.paymentDecisionNote,
      processedAt: request.processedAt,
      adminId: request.adminId
    });
  } catch (error) {
    console.error('Erro ao processar decisão:', error);
    res.status(500).json({ 
      mensagem: 'Erro interno do servidor ao processar decisão.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;
