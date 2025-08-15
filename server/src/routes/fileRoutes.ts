// server/src/routes/fileRoutes.ts
import express from 'express';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest from '../../models/RenewalRequest.js';

const router = express.Router();

/**
 * GET /api/files/sign?proofId=...
 * Generate a signed download URL for a file attachment
 */
router.get('/sign', authenticateToken, async (req, res) => {
  await dbConnect();
  
  try {
    const { proofId } = req.query;
    const userRole = (req as any).user.role;

    if (!proofId) {
      return res.status(400).json({ 
        mensagem: 'ProofId é obrigatório.',
        code: 'MISSING_PROOF_ID'
      });
    }

    // Find the renewal request containing this proof
    const request = await RenewalRequest.findById(proofId);

    if (!request) {
      return res.status(404).json({ 
        mensagem: 'Comprovante não encontrado.',
        code: 'PROOF_NOT_FOUND'
      });
    }

    // Check permissions
    const personalTrainerId = (req as any).user.id;
    const isAdmin = userRole === 'admin';
    const isOwner = request.personalTrainerId.toString() === personalTrainerId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ 
        mensagem: 'Acesso negado.',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if proof exists and is a file
    if (!request.proof || request.proof.kind !== 'file') {
      return res.status(404).json({ 
        mensagem: 'Arquivo não encontrado ou é um link.',
        code: 'FILE_NOT_FOUND'
      });
    }

    // For backward compatibility, check if it's an old GridFS file
    if (request.proof.fileId) {
      // Redirect to the old download endpoint
      const downloadUrl = isAdmin 
        ? `/api/admin/renewal-requests/${request._id}/proof/download`
        : `/api/personal/renewal-requests/${request._id}/proof/download`;
      
      return res.json({ 
        downloadUrl,
        filename: request.proof.filename,
        isLegacyFile: true
      });
    }

    // For new Vercel Blob files, return the direct URL
    // The URL from Vercel Blob is already signed and secure
    if (request.paymentProofUrl && request.paymentProofUrl.startsWith('https://')) {
      return res.json({ 
        downloadUrl: request.paymentProofUrl,
        filename: request.proof.filename,
        isLegacyFile: false
      });
    }

    return res.status(404).json({ 
      mensagem: 'URL do arquivo não encontrada.',
      code: 'FILE_URL_NOT_FOUND'
    });

  } catch (error) {
    console.error('Erro ao gerar URL de download:', error);
    res.status(500).json({ 
      mensagem: 'Erro interno do servidor.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;