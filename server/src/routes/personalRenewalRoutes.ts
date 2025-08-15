import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest from '../../models/RenewalRequest.js';
import { sendNotification } from '../../services/NotificationService.js';
import { getPaymentProofBucket } from '../../utils/gridfs.js';
import mongoose from 'mongoose';

const router = express.Router();
router.use(authenticateToken);

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceita apenas JPEG, PNG e PDF
    if (file.mimetype.match(/^(image\/(jpeg|png)|application\/pdf)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JPEG, PNG e PDF são permitidos'));
    }
  }
});

// POST: personal cria uma nova solicitação com link OU arquivo
router.post('/', upload.single('paymentProof'), async (req, res) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;
    const { planIdRequested, paymentLink, notes } = req.body;
    const file = req.file;

    // Validação: link OU arquivo são opcionais na criação inicial
    // Personal pode solicitar renovação sem comprovante (admin enviará link)
    // OU pode anexar comprovante se já pagou antecipadamente
    if (paymentLink && file) {
      return res.status(400).json({ 
        mensagem: 'Erro de validação: Forneça apenas um link OU um arquivo, não ambos.',
        code: 'CONFLICTING_PAYMENT_PROOF'
      });
    }

    let proof = undefined;
    let initialStatus = 'pending'; // Default: aguardando admin enviar link

    // Se um arquivo foi enviado, salva no GridFS
    if (file) {
      try {
        const bucket = getPaymentProofBucket();
        const uploadStream = bucket.openUploadStream(file.originalname, {
          metadata: {
            contentType: file.mimetype,
            personalId: personalTrainerId,
            uploadedAt: new Date()
          }
        });

        uploadStream.end(file.buffer);
        
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });

        proof = {
          kind: 'file' as const,
          fileId: uploadStream.id,
          filename: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        };
        
        // Se anexou comprovante, já está aguardando aprovação
        initialStatus = 'payment_proof_uploaded';
      } catch (uploadError) {
        console.error('Erro ao fazer upload do arquivo:', uploadError);
        return res.status(500).json({ 
          mensagem: 'Erro ao processar o arquivo enviado.',
          code: 'FILE_UPLOAD_ERROR'
        });
      }
    }

    // Se um link foi fornecido (caso raro, mas mantido para compatibilidade)
    if (paymentLink) {
      proof = {
        kind: 'link' as const,
        url: paymentLink,
        uploadedAt: new Date()
      };
      
      // Se forneceu link de comprovante, já está aguardando aprovação
      initialStatus = 'payment_proof_uploaded';
    }

    const newRequest = new RenewalRequest({
      personalTrainerId,
      personalId: personalTrainerId, // Novo campo
      planIdRequested,
      planId: planIdRequested, // Novo campo
      status: initialStatus,
      notes,
      proof,
      // Se anexou comprovante na criação, marcar timestamp
      proofUploadedAt: proof ? new Date() : undefined,
      // Compatibilidade com campos legados
      paymentLink: paymentLink || undefined,
      paymentProofUrl: proof?.kind === 'file' ? `file:${proof.fileId}` : undefined
    });

    await newRequest.save();

    // Notifica admin (id do admin pode ser salvo em config ou buscado)
    // Ex.: sendNotification(adminId, `${personalTrainer.nome} solicitou renovação de plano.`);
    
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
    console.error('Erro ao criar solicitação:', error);
    
    // Verifica se é erro de validação do Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        mensagem: 'Dados inválidos fornecidos.',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    // Verifica se é erro de multer (arquivo)
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        mensagem: `Erro no upload: ${error.message}`,
        code: 'UPLOAD_ERROR'
      });
    }
    
    res.status(500).json({ 
      mensagem: 'Erro interno do servidor ao solicitar renovação.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// GET: personal baixa comprovante próprio
router.get('/:id/proof/download', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;
    const personalTrainerId = (req as any).user.id;

    const request = await RenewalRequest.findOne({
      _id: requestId,
      personalTrainerId: personalTrainerId,
    });

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

// PUT: personal envia comprovante de pagamento (endpoint legado mantido para compatibilidade)
router.put('/:id/payment-proof', async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;
    const { paymentProofUrl } = req.body; // pode ser URL de upload; para upload real use multer

    const request = await RenewalRequest.findOne({
      _id: requestId,
      personalTrainerId: (req as any).user.id,
    });

    if (!request || request.status !== 'payment_link_sent') {
      return res.status(400).json({ mensagem: 'Solicitação não encontrada ou em estado inválido.' });
    }

    request.paymentProofUrl = paymentProofUrl;
    request.status = 'payment_proof_uploaded';
    request.proofUploadedAt = new Date(); // Add timestamp when proof is uploaded
    
    // Atualiza também o novo campo proof
    request.proof = {
      kind: 'link',
      url: paymentProofUrl,
      uploadedAt: new Date()
    };
    
    await request.save();

    // Notifica admin que o comprovante foi enviado
    // sendNotification(adminId, `${personalTrainer.nome} enviou comprovante de pagamento.`);
    res.json(request);
  } catch (error) {
    console.error('Erro ao anexar comprovante:', error);
    res.status(500).json({ mensagem: 'Erro ao anexar comprovante' });
  }
});

// GET: personal lista as próprias solicitações
router.get('/', async (req, res) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;
    const requests = await RenewalRequest.find({ personalTrainerId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar solicitações' });
  }
});

// POST: personal envia comprovante após receber link de pagamento (novo endpoint dedicado)
router.post('/:id/proof', upload.single('paymentProof'), async (req, res) => {
  await dbConnect();
  try {
    const requestId = req.params.id;
    const personalTrainerId = (req as any).user.id;
    const { paymentProofUrl } = req.body; // Para URL, se não enviou arquivo
    const file = req.file; // Para arquivo

    // Validação: pelo menos link OU arquivo deve estar presente
    if (!paymentProofUrl && !file) {
      return res.status(400).json({ 
        mensagem: 'É necessário fornecer um link de comprovante ou anexar um arquivo.',
        code: 'MISSING_PAYMENT_PROOF'
      });
    }

    if (paymentProofUrl && file) {
      return res.status(400).json({ 
        mensagem: 'Forneça apenas um link OU um arquivo, não ambos.',
        code: 'CONFLICTING_PAYMENT_PROOF'
      });
    }

    const request = await RenewalRequest.findOne({
      _id: requestId,
      personalTrainerId: personalTrainerId,
    });

    if (!request) {
      return res.status(404).json({ mensagem: 'Solicitação não encontrada.' });
    }

    if (request.status !== 'payment_link_sent') {
      return res.status(400).json({ 
        mensagem: `Solicitação em estado inválido: ${request.status}. Apenas solicitações com link enviado podem receber comprovante.`,
        code: 'INVALID_STATUS'
      });
    }

    let proof = undefined;

    // Se um arquivo foi enviado, salva no GridFS
    if (file) {
      try {
        const bucket = getPaymentProofBucket();
        const uploadStream = bucket.openUploadStream(file.originalname, {
          metadata: {
            contentType: file.mimetype,
            personalId: personalTrainerId,
            uploadedAt: new Date()
          }
        });

        uploadStream.end(file.buffer);
        
        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });

        proof = {
          kind: 'file' as const,
          fileId: uploadStream.id,
          filename: file.originalname,
          contentType: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        };
      } catch (uploadError) {
        console.error('Erro ao fazer upload do arquivo:', uploadError);
        return res.status(500).json({ 
          mensagem: 'Erro ao processar o arquivo enviado.',
          code: 'FILE_UPLOAD_ERROR'
        });
      }
    }

    // Se um link foi fornecido
    if (paymentProofUrl) {
      proof = {
        kind: 'link' as const,
        url: paymentProofUrl,
        uploadedAt: new Date()
      };
    }

    // Atualiza a solicitação
    request.paymentProofUrl = paymentProofUrl || `file:${proof?.fileId}`;
    request.status = 'payment_proof_uploaded';
    request.proofUploadedAt = new Date();
    request.proof = proof;
    
    await request.save();

    res.json({
      _id: request._id,
      status: request.status,
      proofUploadedAt: request.proofUploadedAt,
      proof: request.proof
    });
  } catch (error: any) {
    console.error('Erro ao enviar comprovante:', error);
    
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        mensagem: `Erro no upload: ${error.message}`,
        code: 'UPLOAD_ERROR'
      });
    }
    
    res.status(500).json({ 
      mensagem: 'Erro interno do servidor ao enviar comprovante.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;
