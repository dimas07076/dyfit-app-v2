// server/src/routes/convitePublicRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PersonalTrainer from '../../models/PersonalTrainer.js';
import ConvitePersonal from '../../models/ConvitePersonal.js';
import dbConnect from '../../lib/dbConnect.js';
import PlanoService from '../../services/PlanoService.js'; // <- A importação permanece, caso seja usada em outro lugar

const router = express.Router();

// Rota: GET /api/convites/validar/:tokenDeConvite
router.get('/validar/:tokenDeConvite', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  const { tokenDeConvite } = req.params;

  if (!tokenDeConvite) {
    return res.status(400).json({ mensagem: "Token de convite não fornecido." });
  }

  try {
    const convite = await ConvitePersonal.findOne({ token: tokenDeConvite });

    if (!convite) {
      return res.status(404).json({ mensagem: "Convite inválido ou não encontrado." });
    }

    if (convite.status === 'utilizado') {
      return res.status(400).json({ mensagem: "Este convite já foi utilizado." });
    }

    if (convite.status === 'expirado' || (convite.dataExpiracao && convite.dataExpiracao < new Date())) {
      if (convite.status === 'pendente') {
        convite.status = 'expirado';
        await convite.save();
      }
      return res.status(400).json({ mensagem: "Este convite expirou." });
    }
    
    res.status(200).json({
      mensagem: "Convite válido.",
      emailConvidado: convite.emailConvidado,
      roleConvidado: convite.roleConvidado,
    });

  } catch (error: any) {
    next(error);
  }
});

// Rota: POST /api/convites/registrar/:tokenDeConvite
router.post('/registrar/:tokenDeConvite', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect();
  const { tokenDeConvite } = req.params;
  const { nome, email, password } = req.body;

  if (!tokenDeConvite) {
    return res.status(400).json({ mensagem: "Token de convite não fornecido." });
  }
  if (!nome || !password) {
    return res.status(400).json({ mensagem: "Nome e senha são obrigatórios." });
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const convite = await ConvitePersonal.findOne({ token: tokenDeConvite }).session(session);

    if (!convite) {
      await session.abortTransaction();
      return res.status(404).json({ mensagem: "Convite inválido ou não encontrado." });
    }

    if (convite.status === 'utilizado') {
      await session.abortTransaction();
      return res.status(400).json({ mensagem: "Este convite já foi utilizado." });
    }

    if (convite.status === 'expirado' || (convite.dataExpiracao && convite.dataExpiracao < new Date())) {
      if (convite.status === 'pendente') {
        convite.status = 'expirado';
        await convite.save({ session });
      }
      await session.abortTransaction();
      return res.status(400).json({ mensagem: "Este convite expirou." });
    }

    const emailFinal = convite.emailConvidado || email;
    if (!emailFinal) {
        await session.abortTransaction();
        return res.status(400).json({ mensagem: "O e-mail é obrigatório para o cadastro." });
    }

    const existingPersonal = await PersonalTrainer.findOne({ email: emailFinal.toLowerCase() }).session(session);
    if (existingPersonal) {
      await session.abortTransaction();
      return res.status(409).json({ mensagem: `Já existe um usuário com o email: ${emailFinal}` });
    }

    const novoPersonal = new PersonalTrainer({
      nome,
      email: emailFinal.toLowerCase(),
      passwordHash: password, 
      role: convite.roleConvidado,
    });
    await novoPersonal.save({ session });

    convite.status = 'utilizado';
    convite.usadoPor = novoPersonal._id as mongoose.Types.ObjectId;
    convite.dataUtilizacao = new Date();
    await convite.save({ session });

    await session.commitTransaction();

    // <<< INÍCIO DA ALTERAÇÃO >>>
    // O bloco que atribuía o Plano Free automaticamente foi REMOVIDO daqui.
    // O personal será criado sem plano, e o frontend o guiará para a escolha.
    // <<< FIM DA ALTERAÇÃO >>>

    res.status(201).json({ mensagem: "Personal registrado com sucesso! Você já pode fazer login." });

  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error);
  } finally {
    session.endSession();
  }
});

export default router;