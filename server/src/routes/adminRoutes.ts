// server/src/routes/adminRoutes.ts
import express, { Response, NextFunction, Request } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import PersonalTrainer from '../../models/PersonalTrainer.js';
import ConvitePersonal from '../../models/ConvitePersonal.js';
import Exercicio from '../../models/Exercicio.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// --- ROTAS DE GESTÃO DE PERSONAL TRAINERS ---

// POST /api/admin/personal-trainers
router.post('/personal-trainers', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { nome, email, password, role } = req.body;
    if (!nome || !email || !password) {
      return res.status(400).json({ mensagem: "Nome, email e senha são obrigatórios." });
    }
    const roleFinal = (role && role.toLowerCase() === 'admin') ? 'Admin' : 'Personal Trainer';
    const existingPersonal = await PersonalTrainer.findOne({ email: email.toLowerCase() });
    if (existingPersonal) {
      return res.status(409).json({ mensagem: `Já existe um usuário com o email: ${email}` });
    }
    const newPersonal = new PersonalTrainer({ nome, email: email.toLowerCase(), passwordHash: password, role: roleFinal });
    await newPersonal.save();
    const personalToReturn = { _id: newPersonal._id, nome: newPersonal.nome, email: newPersonal.email, role: newPersonal.role, createdAt: newPersonal.createdAt, updatedAt: newPersonal.updatedAt };
    res.status(201).json(personalToReturn);
  } catch (error) {
    console.error('[ADMIN ROUTES] Erro em POST /personal-trainers:', error);
    next(error);
  }
});

// GET /api/admin/personal-trainers
router.get('/personal-trainers', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
    const sortQuery = (req.query.sort as string)?.split(':');
    
    let sortOptions: { [key: string]: 1 | -1 } = { createdAt: -1 };
    if (sortQuery && sortQuery.length === 2) {
      sortOptions = { [sortQuery[0]]: sortQuery[1] === 'desc' ? -1 : 1 };
    }

    const personaisQuery = PersonalTrainer.find().select('-passwordHash').sort(sortOptions);

    if (limit > 0) {
      personaisQuery.limit(limit);
    }
    
    const personais = await personaisQuery.exec();
    res.status(200).json(personais);
  } catch (error) {
    console.error('[ADMIN ROUTES] Erro em GET /personal-trainers:', error);
    next(error);
  }
});

// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    try {
        const totalPersonaisPromise = PersonalTrainer.countDocuments();
        const personaisAtivosPromise = PersonalTrainer.countDocuments({ statusAssinatura: 'ativa' });
        const convitesPendentesPromise = ConvitePersonal.countDocuments({ status: 'pendente' });
        const totalExerciciosPromise = Exercicio.countDocuments();

        const [totalPersonais, personaisAtivos, convitesPendentes, totalExercicios] = await Promise.all([
            totalPersonaisPromise,
            personaisAtivosPromise,
            convitesPendentesPromise,
            totalExerciciosPromise
        ]);
        
        const finalPersonaisAtivos = personaisAtivos > 0 ? personaisAtivos : totalPersonais;

        res.status(200).json({
            totalPersonais,
            personaisAtivos: finalPersonaisAtivos,
            convitesPendentes,
            totalExercicios
        });

    } catch (error) {
        console.error('[ADMIN ROUTES] Erro em GET /dashboard/stats:', error);
        next(error);
    }
});


// GET /api/admin/personal-trainers/:id
router.get('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensagem: "ID do personal inválido." });
    }
    const personal = await PersonalTrainer.findById(id).select('-passwordHash');
    if (!personal) {
      return res.status(404).json({ mensagem: "Personal trainer não encontrado." });
    }
    
    // Import PlanoService to get updated plan status
    const PlanoService = (await import('../../services/PlanoService.js')).default;
    
    // Get current plan status to ensure data is synchronized
    let planoData = null;
    try {
      const planStatus = await PlanoService.getPersonalCurrentPlan(id);
      
      // Update the personal data with current plan information if available
      if (planStatus.plano && planStatus.personalPlano) {
        personal.planoId = planStatus.plano._id?.toString() || personal.planoId;
        personal.statusAssinatura = 'ativa';
        personal.limiteAlunos = planStatus.plano.limiteAlunos;
        personal.dataFimAssinatura = planStatus.personalPlano.dataVencimento;
        personal.dataInicioAssinatura = planStatus.personalPlano.dataInicio;
        
        // Store plan data for response
        planoData = {
          _id: planStatus.plano._id,
          nome: planStatus.plano.nome,
          descricao: planStatus.plano.descricao,
          limiteAlunos: planStatus.plano.limiteAlunos,
          preco: planStatus.plano.preco,
          duracao: planStatus.plano.duracao,
          tipo: planStatus.plano.tipo
        };
      } else if (!planStatus.plano) {
        // No active plan
        personal.statusAssinatura = 'sem_assinatura';
        personal.limiteAlunos = 0;
      }
    } catch (planError) {
      console.error('Error getting plan status for personal:', planError);
      // Continue with original personal data if plan status fetch fails
    }
    
    // Prepare response with plan data included
    const response = {
      ...personal.toObject(),
      plano: planoData
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error(`[ADMIN ROUTES] Erro em GET /personal-trainers/${req.params.id}:`, error);
    next(error);
  }
});

// PUT /api/admin/personal-trainers/:id
router.put('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id } = req.params;
    const { nome, email, role } = req.body;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensagem: 'ID do personal inválido.' });
    }
    if (!nome || !email || !role) {
      return res.status(400).json({ mensagem: 'Nome, email e função são obrigatórios.' });
    }
    const personal = await PersonalTrainer.findById(id);
    if (!personal) {
      return res.status(404).json({ mensagem: 'Personal trainer não encontrado.' });
    }
    personal.nome = nome;
    personal.email = email.toLowerCase();
    personal.role = (role.toLowerCase() === 'admin') ? 'Admin' : 'Personal Trainer';
    const updatedPersonal = await personal.save();
    const personalToReturn = { _id: updatedPersonal._id, nome: updatedPersonal.nome, email: updatedPersonal.email, role: updatedPersonal.role, createdAt: updatedPersonal.createdAt, updatedAt: updatedPersonal.updatedAt };
    res.status(200).json(personalToReturn);
  } catch (error) {
    console.error(`[ADMIN ROUTES] Erro em PUT /personal-trainers/${req.params.id}:`, error);
    next(error);
  }
});

// DELETE /api/admin/personal-trainers/:id
router.delete('/personal-trainers/:id', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { id: personalIdToDelete } = req.params;
    if (!mongoose.isValidObjectId(personalIdToDelete)) {
      return res.status(400).json({ mensagem: "ID do personal inválido." });
    }
    const personal = await PersonalTrainer.findByIdAndDelete(personalIdToDelete);
    if (!personal) {
      return res.status(404).json({ mensagem: "Personal trainer não encontrado." });
    }
    res.status(200).json({ mensagem: `Personal trainer ${personal.nome} excluído com sucesso.` });
  } catch (error) {
    console.error(`[ADMIN ROUTES] Erro em DELETE /personal-trainers/${req.params.id}:`, error);
    next(error);
  }
});

// --- ROTAS DE GESTÃO DE CONVITES ---
const conviteRouter = express.Router();

conviteRouter.post('/personal', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const { emailConvidado, roleConvidado, diasParaExpirar } = req.body;
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ mensagem: "Administrador não autenticado." });
    }

    if (emailConvidado) {
        const convitePendente = await ConvitePersonal.findOne({ 
            emailConvidado: emailConvidado.toLowerCase().trim(), 
            status: 'pendente',
            criadoPor: new mongoose.Types.ObjectId(adminId),
        });
        if (convitePendente) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const linkConvite = `${frontendUrl}/cadastrar-personal/convite/${convitePendente.token}`;
            return res.status(200).json({ mensagem: "Já existe um convite pendente para este email.", linkConvite });
        }
    }

    const token = crypto.randomBytes(20).toString('hex');
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + (diasParaExpirar || 7));
    
    const novoConvite = new ConvitePersonal({
      token,
      emailConvidado: emailConvidado ? emailConvidado.toLowerCase().trim() : undefined,
      roleConvidado: roleConvidado || 'Personal Trainer',
      status: 'pendente',
      dataExpiracao,
      criadoPor: new mongoose.Types.ObjectId(adminId),
    });
    
    await novoConvite.save();
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkConvite = `${frontendUrl}/cadastrar-personal/convite/${token}`;
    res.status(201).json({ mensagem: "Convite criado com sucesso!", convite: novoConvite, linkConvite });

  } catch (error) {
    next(error);
  }
});

conviteRouter.get('/personal', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ mensagem: "Administrador não autenticado." });
    }
    const convites = await ConvitePersonal.find({ criadoPor: new mongoose.Types.ObjectId(adminId) })
      .populate('usadoPor', 'nome email')
      .sort({ createdAt: -1 });
    res.status(200).json(convites);
  } catch (error) {
    next(error);
  }
});

conviteRouter.delete('/personal/:conviteId', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  try {
    const adminId = req.user?.id;
    const { conviteId } = req.params;
    if (!adminId) {
      return res.status(401).json({ mensagem: "Administrador não autenticado." });
    }
    if (!mongoose.isValidObjectId(conviteId)) {
      return res.status(400).json({ mensagem: "ID do convite inválido." });
    }
    const convite = await ConvitePersonal.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(conviteId),
      criadoPor: new mongoose.Types.ObjectId(adminId),
      status: 'pendente',
    });
    if (!convite) {
      return res.status(404).json({ mensagem: "Convite não encontrado ou já utilizado." });
    }
    res.status(200).json({ mensagem: "Convite revogado com sucesso." });
  } catch (error) {
    next(error);
  }
});

router.use('/convites', conviteRouter);

export default router;