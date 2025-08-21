// server/src/routes/conviteAlunoPublicRoutes.ts
import express from 'express';
import ConviteAluno from '../../models/ConviteAluno.js';
import Aluno from '../../models/Aluno.js';
import PersonalTrainer from '../../models/PersonalTrainer.js'; // Importa o modelo PersonalTrainer
import mongoose from 'mongoose';
import dbConnect from '../../lib/dbConnect.js';
// Imports adicionados para a lógica de negócio
import PlanoService from '../../services/PlanoService.js';
import TokenAvulso from '../../models/TokenAvulso.js';
const router = express.Router();
// GET /api/public/convite-aluno/:token - Valida o token do convite (sem alterações)
router.get('/:token', async (req, res, next) => {
    await dbConnect();
    try {
        const { token } = req.params;
        const convite = await ConviteAluno.findOne({ token, status: 'pendente' });
        if (!convite || convite.dataExpiracao < new Date()) {
            if (convite) {
                convite.status = 'expirado';
                await convite.save();
            }
            return res.status(404).json({ erro: 'Convite inválido ou expirado.' });
        }
        const personal = await PersonalTrainer.findById(convite.criadoPor).select('nome');
        if (!personal) {
            return res.status(404).json({ erro: 'Personal trainer associado ao convite não encontrado.' });
        }
        // Retorna o e-mail (que pode ser undefined) e o nome do personal
        res.status(200).json({ email: convite.emailConvidado, personalName: personal.nome });
    }
    catch (error) {
        next(error);
    }
});
// POST /api/public/convite-aluno/registrar - Finaliza o cadastro do aluno (LÓGICA ALTERADA)
router.post('/registrar', async (req, res, next) => {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { token, nome, password, email, ...outrosDados } = req.body;
        if (!token || !nome || !password) {
            await session.abortTransaction();
            return res.status(400).json({ erro: 'Dados insuficientes para o registro.' });
        }
        const convite = await ConviteAluno.findOne({ token, status: 'pendente' }).session(session);
        if (!convite || convite.dataExpiracao < new Date()) {
            if (convite) {
                convite.status = 'expirado';
                await convite.save({ session });
            }
            await session.abortTransaction();
            return res.status(404).json({ erro: 'Convite inválido ou expirado.' });
        }
        const emailFinal = convite.emailConvidado || email;
        if (!emailFinal) {
            await session.abortTransaction();
            return res.status(400).json({ erro: 'O e-mail é obrigatório para o cadastro.' });
        }
        const trainerId = convite.criadoPor.toString();
        // --- INÍCIO DA NOVA LÓGICA DE VALIDAÇÃO E CONSUMO DE VAGA ---
        // 1. Verifica se o personal tem vagas disponíveis
        const limitCheck = await PlanoService.canActivateMoreStudents(trainerId, 1);
        if (!limitCheck.canActivate) {
            await session.abortTransaction();
            return res.status(403).json({
                message: "O personal trainer atingiu o limite de alunos ativos e não pode aceitar novos cadastros no momento.",
                code: 'STUDENT_LIMIT_EXCEEDED'
            });
        }
        // 2. Determina qual vaga usar (plano ou token)
        const planStatus = await PlanoService.getPersonalCurrentPlan(trainerId);
        const limiteBasePlano = planStatus.isExpired ? 0 : (planStatus.plano?.limiteAlunos || 0);
        const alunosAtivosNoPlano = await Aluno.countDocuments({
            trainerId: convite.criadoPor, status: 'active', slotType: 'plan'
        }).session(session);
        let slotType;
        let slotId;
        let slotStartDate;
        let slotEndDate;
        if (alunosAtivosNoPlano < limiteBasePlano && planStatus.personalPlano) {
            // Usa uma vaga do plano principal
            slotType = 'plan';
            slotId = new mongoose.Types.ObjectId(planStatus.personalPlano._id);
            slotStartDate = planStatus.personalPlano.dataInicio;
            slotEndDate = planStatus.personalPlano.dataVencimento;
        }
        else {
            // Usa um token avulso
            slotType = 'token';
            const token = await TokenAvulso.findOne({
                personalTrainerId: convite.criadoPor,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).sort({ dataVencimento: 1 }).session(session);
            if (!token) {
                await session.abortTransaction();
                return res.status(403).json({ message: "Não há vagas de plano ou tokens avulsos disponíveis." });
            }
            slotId = new mongoose.Types.ObjectId(token._id);
            slotStartDate = new Date();
            slotEndDate = token.dataVencimento;
            // Consome o token
            if (token.quantidade > 1) {
                token.quantidade -= 1;
                await token.save({ session });
            }
            else {
                token.ativo = false; // Marca como consumido
                await token.save({ session });
            }
        }
        // --- FIM DA NOVA LÓGICA ---
        const novoAluno = new Aluno({
            nome,
            email: emailFinal,
            passwordHash: password,
            trainerId: convite.criadoPor,
            status: 'active',
            ...outrosDados,
            // Adiciona as informações da vaga consumida
            slotType,
            slotId,
            slotStartDate,
            slotEndDate,
        });
        await novoAluno.save({ session });
        convite.status = 'utilizado';
        convite.usadoPor = novoAluno._id;
        await convite.save({ session });
        await session.commitTransaction();
        res.status(201).json({ mensagem: 'Aluno registrado com sucesso!' });
    }
    catch (error) {
        if (session.inTransaction())
            await session.abortTransaction();
        if (error.code === 11000) {
            return res.status(409).json({ erro: 'Este endereço de e-mail já está em uso.' });
        }
        next(error);
    }
    finally {
        session.endSession();
    }
});
export default router;