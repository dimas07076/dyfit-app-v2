// server/src/routes/alunoApiRoutes.ts
import express from 'express';
import mongoose from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao, { OPCOES_PSE } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import { startOfWeek, endOfWeek, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos } from '../../middlewares/checkLimiteAlunos.js';
import { check, validationResult } from 'express-validator'; // Importação adicionada
const router = express.Router();
// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================
// POST /api/aluno/convite - Gera um link de convite para aluno
router.post("/convite", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Personal não autenticado." });
    }
    try {
        const { emailConvidado } = req.body;
        if (emailConvidado) {
            const alunoExistente = await Aluno.findOne({ email: emailConvidado, trainerId });
            if (alunoExistente) {
                return res.status(409).json({ erro: "Este aluno já está cadastrado com você." });
            }
            const convitePendente = await ConviteAluno.findOne({ emailConvidado, status: 'pendente', criadoPor: trainerId });
            if (convitePendente) {
                const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${convitePendente.token}`;
                return res.status(200).json({ mensagem: "Já existe um convite pendente para este email.", linkConvite });
            }
        }
        const novoConvite = new ConviteAluno({
            emailConvidado: emailConvidado || undefined,
            criadoPor: new mongoose.Types.ObjectId(trainerId)
        });
        await novoConvite.save();
        const linkConvite = `${process.env.FRONTEND_URL}/convite/aluno/${novoConvite.token}`;
        res.status(201).json({ mensagem: "Link de convite gerado com sucesso!", linkConvite });
    }
    catch (error) {
        next(error);
    }
});
// GET /api/aluno/gerenciar - Lista todos os alunos do personal
router.get("/gerenciar", authenticateToken, async (req, res, next) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    try {
        const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    }
    catch (error) {
        next(error);
    }
});
// POST /api/aluno/gerenciar - Criar um novo aluno
router.post("/gerenciar", authenticateToken, checkLimiteAlunos, async (req, res, next) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    try {
        const { nome, email, password, phone, birthDate, goal, weight, height, startDate } = req.body;
        if (!nome || !email || !password) {
            return res.status(400).json({ erro: "Nome, email e senha são obrigatórios." });
        }
        const alunoExistente = await Aluno.findOne({ email: email.toLowerCase() });
        if (alunoExistente) {
            return res.status(409).json({ erro: "Já existe um aluno com este email." });
        }
        const novoAluno = new Aluno({
            nome,
            email: email.toLowerCase(),
            passwordHash: password,
            trainerId: new mongoose.Types.ObjectId(trainerId),
            phone,
            birthDate: birthDate ? new Date(birthDate) : undefined,
            goal,
            weight: weight ? parseFloat(weight) : undefined,
            height: height ? parseInt(height) : undefined,
            startDate: startDate ? new Date(startDate) : new Date(),
            status: 'active'
        });
        await novoAluno.save();
        const alunoResponse = novoAluno.toObject();
        delete alunoResponse.passwordHash;
        res.status(201).json({
            mensagem: "Aluno criado com sucesso!",
            aluno: alunoResponse
        });
    }
    catch (error) {
        next(error);
    }
});
// Rota para buscar um único aluno pelo ID.
router.get('/:id', authenticateToken, async (req, res, next) => {
    try {
        const personalId = req.user?.id;
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de aluno inválido.' });
        }
        const aluno = await Aluno.findOne({ _id: id, trainerId: personalId });
        if (!aluno) {
            return res.status(404).json({ message: 'Aluno não encontrado.' });
        }
        res.json(aluno);
    }
    catch (error) {
        next(error);
    }
});
// Rota para atualizar um aluno
router.put('/gerenciar/:id', authenticateToken, [
    check('nome', 'O nome é obrigatório').not().isEmpty(),
    check('email', 'Por favor, inclua um email válido').isEmail(),
], async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { nome, email, goal, status } = req.body;
        const personalId = req.user?.id;
        const { id } = req.params;
        const aluno = await Aluno.findOneAndUpdate({ _id: id, trainerId: personalId }, { nome, email, goal, status }, { new: true });
        if (!aluno) {
            return res.status(404).json({ message: 'Aluno não encontrado.' });
        }
        res.json(aluno);
    }
    catch (error) {
        next(error);
    }
});
// Rota para desativar (ou reativar) um aluno
router.delete('/gerenciar/:id', authenticateToken, async (req, res, next) => {
    try {
        const personalId = req.user?.id;
        const { id } = req.params;
        const aluno = await Aluno.findOne({ _id: id, trainerId: personalId });
        if (!aluno) {
            return res.status(404).json({ message: 'Aluno não encontrado.' });
        }
        aluno.status = aluno.status === 'active' ? 'inactive' : 'active';
        await aluno.save();
        res.json({ message: `Aluno ${aluno.status === 'active' ? 'reativado' : 'desativado'} com sucesso.` });
    }
    catch (error) {
        next(error);
    }
});
// =======================================================
// ROTAS DO ALUNO (DASHBOARD, FICHAS, HISTÓRICO)
// =======================================================
// GET /api/aluno/meus-treinos - Lista as rotinas do aluno logado
router.get('/meus-treinos', authenticateAlunoToken, async (req, res, next) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId)
        return res.status(401).json({ erro: "Aluno não autenticado." });
    try {
        const rotinas = await Treino.find({ alunoId: new mongoose.Types.ObjectId(alunoId), tipo: 'individual' })
            .populate('criadorId', 'nome email')
            .populate({
            path: 'diasDeTreino.exerciciosDoDia.exercicioId',
            model: 'Exercicio',
            select: 'nome grupoMuscular urlVideo descricao categoria tipo'
        })
            .sort({ atualizadoEm: -1 })
            .lean();
        res.status(200).json(rotinas);
    }
    catch (error) {
        console.error("Erro ao buscar treinos do aluno:", error);
        next(error);
    }
});
// GET /api/aluno/meus-treinos/:id - Retorna uma rotina específica do aluno
router.get('/meus-treinos/:id', authenticateAlunoToken, async (req, res, next) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    const rotinaId = req.params.id;
    if (!alunoId)
        return res.status(401).json({ erro: "Aluno não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) {
        return res.status(400).json({ erro: 'ID da rotina inválido.' });
    }
    try {
        const rotina = await Treino.findOne({
            _id: new mongoose.Types.ObjectId(rotinaId),
            alunoId: new mongoose.Types.ObjectId(alunoId)
        })
            .populate({
            path: 'diasDeTreino.exerciciosDoDia.exercicioId',
            model: 'Exercicio',
            select: 'nome urlVideo'
        })
            .lean();
        if (!rotina) {
            return res.status(404).json({ erro: 'Rotina de treino não encontrada ou não pertence a este aluno.' });
        }
        res.status(200).json(rotina);
    }
    catch (error) {
        console.error(`Erro ao buscar detalhes da rotina ${rotinaId} para o aluno ${alunoId}:`, error);
        next(error);
    }
});
// GET /api/aluno/minhas-sessoes-concluidas-na-semana - Retorna sessões da semana para o gráfico de frequência
router.get('/minhas-sessoes-concluidas-na-semana', authenticateAlunoToken, async (req, res, next) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId)
        return res.status(401).json({ erro: "Aluno não autenticado." });
    try {
        const hoje = new Date();
        const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 });
        const fimSemana = endOfWeek(hoje, { weekStartsOn: 0 });
        const sessoes = await Sessao.find({
            alunoId: new mongoose.Types.ObjectId(alunoId),
            status: 'completed',
            concluidaEm: {
                $gte: inicioSemana,
                $lte: fimSemana,
            },
        }).select('_id sessionDate tipoCompromisso concluidaEm').lean();
        res.status(200).json(sessoes);
    }
    catch (error) {
        console.error("Erro ao buscar sessões da semana do aluno:", error);
        next(error);
    }
});
// GET /api/aluno/stats-progresso - Retorna estatísticas de progresso do aluno
router.get('/stats-progresso', authenticateAlunoToken, async (req, res, next) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId)
        return res.status(401).json({ erro: "Aluno não autenticado." });
    try {
        const sessoesConcluidas = await Sessao.find({
            alunoId: new mongoose.Types.ObjectId(alunoId),
            status: 'completed'
        }).select('concluidaEm pseAluno').lean();
        const totalTreinosConcluidos = sessoesConcluidas.length;
        const pseMap = OPCOES_PSE.reduce((acc, val, i) => ({ ...acc, [val]: i + 1 }), {});
        const sessoesComPSE = sessoesConcluidas.filter(s => s.pseAluno && pseMap[s.pseAluno]);
        let mediaPSE = 'N/D';
        if (sessoesComPSE.length > 0) {
            const somaPSE = sessoesComPSE.reduce((acc, s) => acc + pseMap[s.pseAluno], 0);
            const mediaNumerica = Math.round(somaPSE / sessoesComPSE.length);
            mediaPSE = OPCOES_PSE[mediaNumerica - 1] || 'N/D';
        }
        let diasConsecutivos = 0;
        if (sessoesConcluidas.length > 0) {
            const datasDeTreinoUnicas = [...new Set(sessoesConcluidas.map(s => startOfDay(s.concluidaEm).toISOString()))]
                .map(d => parseISO(d))
                .sort((a, b) => a.getTime() - b.getTime());
            if (datasDeTreinoUnicas.length > 0) {
                let streakAtual = 0;
                const hoje = startOfDay(new Date());
                const ontem = startOfDay(new Date(hoje.setDate(hoje.getDate() - 1)));
                hoje.setDate(hoje.getDate() + 1);
                let ultimaData = startOfDay(new Date(2000, 0, 1));
                for (const data of datasDeTreinoUnicas) {
                    if (differenceInCalendarDays(data, ultimaData) === 1) {
                        streakAtual++;
                    }
                    else {
                        streakAtual = 1;
                    }
                    diasConsecutivos = Math.max(diasConsecutivos, streakAtual);
                    ultimaData = data;
                }
            }
        }
        res.status(200).json({
            totalTreinosConcluidos,
            mediaPSE,
            diasConsecutivos
        });
    }
    catch (error) {
        console.error("Erro ao calcular stats de progresso do aluno:", error);
        next(error);
    }
});
// GET /api/aluno/meu-historico-sessoes - Retorna o histórico paginado de sessões do aluno
router.get('/meu-historico-sessoes', authenticateAlunoToken, async (req, res, next) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId)
        return res.status(401).json({ erro: "Aluno não autenticado." });
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const query = {
            alunoId: new mongoose.Types.ObjectId(alunoId),
            status: 'completed'
        };
        const totalSessoes = await Sessao.countDocuments(query);
        const totalPages = Math.ceil(totalSessoes / limit);
        const sessoes = await Sessao.find(query)
            .sort({ concluidaEm: -1 })
            .skip(skip)
            .limit(limit)
            .populate('rotinaId', 'titulo')
            .populate('personalId', 'nome')
            .lean();
        res.status(200).json({
            sessoes,
            currentPage: page,
            totalPages,
            totalSessoes
        });
    }
    catch (error) {
        console.error("Erro ao buscar histórico de sessões do aluno:", error);
        next(error);
    }
});
export default router;
