// server/src/routes/publicContatosRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Contato from '../../models/Contato.js';
import PersonalTrainer from '../../models/PersonalTrainer.js';
import dbConnect from '../../lib/dbConnect.js'; // <<< IMPORTAÇÃO ADICIONADA

const router = express.Router();

console.log("--- [server/src/routes/publicContatosRoutes.ts] Ficheiro carregado ---");

// Rota: POST /api/public/contatos/registrar/:tokenPersonal
router.post('/registrar/:tokenPersonal', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect(); // <<< CHAMADA ADICIONADA
  const { tokenPersonal } = req.params;
  const { nomeCompleto, email, telefone, dataNascimento, genero } = req.body;

  console.log(`[POST /registrar/${tokenPersonal}] Tentativa de registrar novo contato. Email: ${email}`);

  if (!tokenPersonal) {
    return res.status(400).json({ mensagem: "Token do personal não fornecido." });
  }

  if (!nomeCompleto || typeof nomeCompleto !== 'string' || nomeCompleto.trim().length < 3) {
    return res.status(400).json({ mensagem: "Nome completo é obrigatório e deve ter pelo menos 3 caracteres." });
  }
  if (!email || typeof email !== 'string' || !/.+\@.+\..+/.test(email)) {
    return res.status(400).json({ mensagem: "E-mail inválido." });
  }

  try {
    const personal = await PersonalTrainer.findOne({ tokenCadastroAluno: tokenPersonal }).select('nome _id');
    if (!personal) {
      console.warn(`[POST /registrar/${tokenPersonal}] Personal não encontrado com este token.`);
      return res.status(404).json({ mensagem: "Link de cadastro inválido ou personal não encontrado." });
    }

    const contatoExistente = await Contato.findOne({
        email: email.toLowerCase().trim(),
        personalId: personal._id,
        status: 'novo'
    });

    if (contatoExistente) {
        console.log(`[POST /registrar/${tokenPersonal}] Contato com email ${email} já existe para o personal ${personal._id} com status 'novo'.`);
        return res.status(200).json({ mensagem: `Você já demonstrou interesse. O personal ${personal.nome} entrará em contato.` });
    }

    const novoContato = new Contato({
      nomeCompleto: nomeCompleto.trim(),
      email: email.toLowerCase().trim(),
      telefone: telefone?.trim(),
      dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
      genero,
      personalId: personal._id,
      status: 'novo',
      origemToken: tokenPersonal,
    });

    await novoContato.save();

    console.log(`[POST /registrar/${tokenPersonal}] Novo contato ID: ${novoContato._id} registrado para Personal ID: ${personal._id}.`);

    res.status(201).json({ mensagem: "Interesse registrado com sucesso! Em breve, seu personal entrará em contato." });

  } catch (error: any) {
    console.error(`[POST /registrar/${tokenPersonal}] Erro ao registrar contato:`, error);
    if (error.status === 409) {
        return res.status(409).json({ mensagem: error.message });
    }
    if (error.name === 'ValidationError') {
      const mensagens = Object.values(error.errors).map((el: any) => el.message);
      return res.status(400).json({ mensagem: mensagens.join(', ') });
    }
    next(error);
  }
});

export default router;