import express from 'express';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';
import RenewalRequest from '../../models/RenewalRequest.js';
import { sendNotification } from '../../services/NotificationService.js';

const router = express.Router();
router.use(authenticateToken);

// POST: personal cria uma nova solicitação
router.post('/', async (req, res) => {
  await dbConnect();
  try {
    const personalTrainerId = (req as any).user.id;
    const { planIdRequested } = req.body;

    const newRequest = new RenewalRequest({
      personalTrainerId,
      planIdRequested,
      status: 'pending'
    });

    await newRequest.save();

    // Notifica admin (id do admin pode ser salvo em config ou buscado)
    // Ex.: sendNotification(adminId, `${personalTrainer.nome} solicitou renovação de plano.`);
    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ mensagem: 'Erro ao solicitar renovação' });
  }
});

// PUT: personal envia comprovante de pagamento
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

export default router;
