// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import WorkoutLog from '../../models/WorkoutLog.js'; // <-- 1. IMPORTAÇÃO DO WORKOUTLOG
import { startOfWeek, endOfWeek, differenceInCalendarDays, parseISO } from 'date-fns';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos, checkCanActivateStudent } from '../../middlewares/checkLimiteAlunos.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================
// ... (rotas existentes de gerenciamento de alunos foram omitidas por brevidade, mas estão preservadas)
router.post("/convite", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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

    } catch (error) {
        next(error);
    }
});
router.get("/gerenciar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const trainerId = req.user?.id; if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." }); try { const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash'); res.status(200).json(alunos); } catch (error) { next(error); } });
router.post("/gerenciar", authenticateToken, checkLimiteAlunos, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    
    try {
        const { password, ...alunoDataBody } = req.body;
        if (!password) return res.status(400).json({ erro: "O campo de senha é obrigatório." });
        
        const alunoData = {
            ...alunoDataBody,
            trainerId: new mongoose.Types.ObjectId(trainerId),
            passwordHash: password
        };
        
        const novoAluno = new Aluno(alunoData);
        const alunoSalvo = await novoAluno.save();
        const alunoParaRetornar = { ...alunoSalvo.toObject() };
        delete (alunoParaRetornar as any).passwordHash;
        
        res.status(201).json(alunoParaRetornar);
    } catch (error) {
        next(error);
    }
});
router.get("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const trainerId = req.user?.id; const { id } = req.params; if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." }); if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido" }); try { const aluno = await Aluno.findOne({ _id: id, trainerId }).select('-passwordHash'); if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou você não tem permissão." }); res.status(200).json(aluno); } catch (error) { next(error); } });
router.get('/:alunoId/rotinas', authenticateToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const trainerId = req.user?.id; const { alunoId } = req.params; if (!trainerId) return res.status(401).json({ erro: 'Personal não autenticado.' }); if (!mongoose.Types.ObjectId.isValid(alunoId)) return res.status(400).json({ erro: 'ID do aluno inválido.' }); try { const aluno = await Aluno.findOne({ _id: alunoId, trainerId }); if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado ou não pertence a este personal.' }); const rotinas = await Treino.find({ alunoId: new mongoose.Types.ObjectId(alunoId), criadorId: new mongoose.Types.ObjectId(trainerId), tipo: 'individual' }).select('titulo descricao criadoEm atualizadoEm').sort({ atualizadoEm: -1 }); res.status(200).json(rotinas); } catch (error) { next(error); } });
router.put("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const { id } = req.params;
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." });
    
    try {
        const { password, status, ...updateData } = req.body;
        const aluno = await Aluno.findOne({ _id: id, trainerId });
        if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou você não tem permissão." });
        
        // Check limits if trying to activate student
        if (status === 'active' && aluno.status === 'inactive') {
            const PlanoService = (await import('../../services/PlanoService.js')).default;
            const limitStatus = await PlanoService.canActivateMoreStudents(trainerId, 1);
            
            if (!limitStatus.canActivate) {
                return res.status(403).json({
                    erro: 'Limite de alunos ativos excedido',
                    code: 'STUDENT_LIMIT_EXCEEDED',
                    data: {
                        currentLimit: limitStatus.currentLimit,
                        activeStudents: limitStatus.activeStudents,
                        availableSlots: limitStatus.availableSlots
                    }
                });
            }
        }
        
        Object.assign(aluno, updateData);
        if (status) aluno.status = status;
        if (password && password.trim() !== "") {
            aluno.passwordHash = password;
        }
        
        const alunoAtualizado = await aluno.save();
        const alunoParaRetornar = { ...alunoAtualizado.toObject() };
        delete (alunoParaRetornar as any).passwordHash;
        
        res.status(200).json(alunoParaRetornar);
    } catch (error) {
        next(error);
    }
});
router.delete("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const trainerId = req.user?.id; const { id } = req.params; if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." }); if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." }); try { const result = await Aluno.findOneAndDelete({ _id: id, trainerId }); if (!result) return res.status(404).json({ erro: "Aluno não encontrado ou sem permissão." }); res.status(200).json({ mensagem: "Aluno removido com sucesso" }); } catch (error) { next(error); } });

// Route to activate/deactivate student with limit check
router.patch("/gerenciar/:id/status", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;
    
    if (!trainerId) return res.status(401).json({ erro: "Usuário não autenticado." });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ erro: "ID do aluno inválido." });
    if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ erro: "Status deve ser 'active' ou 'inactive'." });
    }
    
    try {
        const aluno = await Aluno.findOne({ _id: id, trainerId });
        if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado ou você não tem permissão." });
        
        // If trying to activate and student is currently inactive, check limits
        if (status === 'active' && aluno.status === 'inactive') {
            // Use the limit checking middleware functionality
            const PlanoService = (await import('../../services/PlanoService.js')).default;
            const limitStatus = await PlanoService.canActivateMoreStudents(trainerId, 1);
            
            if (!limitStatus.canActivate) {
                return res.status(403).json({
                    erro: 'Limite de alunos ativos excedido',
                    code: 'STUDENT_LIMIT_EXCEEDED',
                    data: {
                        currentLimit: limitStatus.currentLimit,
                        activeStudents: limitStatus.activeStudents,
                        availableSlots: limitStatus.availableSlots
                    }
                });
            }
        }
        
        aluno.status = status;
        const alunoAtualizado = await aluno.save();
        const alunoParaRetornar = { ...alunoAtualizado.toObject() };
        delete (alunoParaRetornar as any).passwordHash;
        
        res.status(200).json({
            mensagem: `Aluno ${status === 'active' ? 'ativado' : 'desativado'} com sucesso`,
            aluno: alunoParaRetornar
        });
    } catch (error) {
        next(error);
    }
});


// =======================================================
// ROTAS DO ALUNO (PARA ACESSO PRÓPRIO)
// =======================================================

// <-- 2. NOVA ROTA PARA CRIAR O LOG DE TREINO -->
router.post('/workout-log', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) {
        return res.status(401).json({ message: 'Aluno não autenticado.' });
    }

    try {
        const aluno = await Aluno.findById(alunoId);
        if (!aluno || !aluno.trainerId) {
            return res.status(404).json({ message: 'Aluno ou Personal Trainer associado não encontrado.' });
        }
        
        const personalId = aluno.trainerId;

        const {
            treinoId,
            treinoTitulo,
            dataInicio,
            dataFim,
            duracaoTotalMinutos,
            nivelTreino,
            comentarioAluno,
            aumentoCarga,
        } = req.body;

        // Validação básica dos campos obrigatórios
        if (!treinoId || !treinoTitulo || !dataInicio || !dataFim || !duracaoTotalMinutos || !nivelTreino) {
            return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser fornecidos.' });
        }
        
        const newLog = new WorkoutLog({
            ...req.body,
            alunoId: new Types.ObjectId(alunoId),
            personalId: personalId, // <-- Ponto chave: Adiciona o ID do personal
        });

        await newLog.save();

        res.status(201).json({ message: 'Feedback do treino salvo com sucesso!', log: newLog });

    } catch (error) {
        console.error("Erro ao salvar o log de treino:", error);
        next(error);
    }
});


router.get('/meus-treinos', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    try {
        const rotinasDoAlunoDocs = await Treino.find({ alunoId: new Types.ObjectId(alunoId), tipo: 'individual' })
            .sort({ atualizadoEm: -1, criadoEm: -1 })
            .populate({ path: 'criadorId', select: 'nome email _id' })
            .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' });
        
        const rotinasDoAluno = rotinasDoAlunoDocs.map(doc => doc.toObject());
        res.status(200).json(rotinasDoAluno);
    } catch (error) {
        next(error);
    }
});

router.get('/meus-treinos/:id', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    const { id: treinoId } = req.params;
    if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    if (!mongoose.Types.ObjectId.isValid(treinoId)) return res.status(400).json({ message: "ID da rotina inválido." });
    try {
        const rotinaDoc = await Treino.findOne({ _id: new mongoose.Types.ObjectId(treinoId), alunoId: new mongoose.Types.ObjectId(alunoId) })
            .populate({ path: 'criadorId', select: 'nome email _id' })
            .populate({ path: 'diasDeTreino.exerciciosDoDia.exercicioId', select: 'nome grupoMuscular urlVideo tipo categoria descricao _id' });
            
        if (!rotinaDoc) {
            return res.status(404).json({ message: "Rotina não encontrada ou não pertence a este aluno." });
        }

        const rotina = rotinaDoc.toObject();
        res.status(200).json(rotina);
    } catch (error) {
        next(error);
    }
});

// ... (resto das rotas existentes foram omitidas por brevidade, mas estão preservadas)
router.get('/minhas-sessoes-concluidas-na-semana', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const alunoId = req.aluno?.id; if (!alunoId) return res.status(401).json({ message: 'ID do aluno não encontrado no token.' }); try { const hoje = new Date(); const inicioDaSemana = startOfWeek(hoje, { weekStartsOn: 1 }); const fimDaSemana = endOfWeek(hoje, { weekStartsOn: 1 }); const sessoesConcluidas = await Sessao.find({ alunoId: new Types.ObjectId(alunoId), status: 'completed', concluidaEm: { $gte: inicioDaSemana, $lte: fimDaSemana }, }).select('_id sessionDate concluidaEm tipoCompromisso').sort({ concluidaEm: 1 }).lean(); res.status(200).json(sessoesConcluidas); } catch (error) { next(error); } });
router.get('/meu-historico-sessoes', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const alunoId = req.aluno?.id; if (!alunoId) { return res.status(401).json({ message: 'ID do aluno não encontrado no token.' }); } const page = parseInt(req.query.page as string) || 1; const limit = parseInt(req.query.limit as string) || 5; const skip = (page - 1) * limit; try { const query = { alunoId: new Types.ObjectId(alunoId), status: 'completed' }; const totalSessoes = await Sessao.countDocuments(query); const sessoes = await Sessao.find(query).sort({ concluidaEm: -1 }).skip(skip).limit(limit).populate({ path: 'rotinaId', select: 'titulo' }).lean(); res.status(200).json({ sessoes, currentPage: page, totalPages: Math.ceil(totalSessoes / limit), totalSessoes, }); } catch (error) { next(error); } });
router.patch('/meus-treinos/:rotinaId/cargas', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => { await dbConnect(); const alunoId = req.aluno?.id; const { rotinaId } = req.params; const { diaDeTreinoId, cargas } = req.body; if (!alunoId) return res.status(401).json({ message: "Aluno não autenticado." }); if (!mongoose.Types.ObjectId.isValid(rotinaId) || !mongoose.Types.ObjectId.isValid(diaDeTreinoId)) { return res.status(400).json({ message: "IDs inválidos." }); } if (!cargas || typeof cargas !== 'object' || Object.keys(cargas).length === 0) { return res.status(400).json({ message: "Nenhuma carga para atualizar." }); } try { const rotina = await Treino.findOne({ _id: rotinaId, alunoId }); if (!rotina) { return res.status(404).json({ message: "Rotina não encontrada ou não pertence a este aluno." }); } const diaDeTreino = rotina.diasDeTreino.id(diaDeTreinoId); if (!diaDeTreino) { return res.status(404).json({ message: "Dia de treino não encontrado na rotina." }); } let atualizacoes = 0; diaDeTreino.exerciciosDoDia?.forEach(exercicio => { const exercicioIdString = exercicio._id.toString(); if (cargas[exercicioIdString] && exercicio.carga !== cargas[exercicioIdString]) { exercicio.carga = cargas[exercicioIdString]; atualizacoes++; } }); if (atualizacoes > 0) { await rotina.save(); return res.status(200).json({ message: `${atualizacoes} carga(s) atualizada(s) com sucesso na ficha.` }); } return res.status(200).json({ message: "Nenhuma carga precisou ser atualizada." }); } catch (error) { next(error); } });

const pseMap = new Map([
  ['Muito Leve', 1],
  ['Leve', 2],
  ['Moderado', 3],
  ['Intenso', 4],
  ['Muito Intenso', 5],
  ['Máximo Esforço', 6]
]);

router.get('/stats-progresso', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) {
        return res.status(401).json({ message: 'ID do aluno não encontrado no token.' });
    }

    try {
        const sessoesConcluidas = await Sessao.find({
            alunoId: new Types.ObjectId(alunoId),
            status: 'completed'
        }).sort({ concluidaEm: -1 }).lean();
        const totalTreinosConcluidos = sessoesConcluidas.length;
        const sessoesComPSE = sessoesConcluidas
            .map(s => s.pseAluno ? pseMap.get(s.pseAluno) : undefined)
            .filter((v): v is number => v !== undefined);
        
        const mediaPSE = sessoesComPSE.length > 0
            ? (sessoesComPSE.reduce((sum, val) => sum + val, 0) / sessoesComPSE.length).toFixed(1)
            : 'N/D';
        let diasConsecutivos = 0;
        if (sessoesConcluidas.length > 0) {
            const datasUnicas = [...new Set(sessoesConcluidas.map(s => s.concluidaEm!.toISOString().split('T')[0]))]
                                .map(dateStr => parseISO(dateStr))
                                .sort((a, b) => b.getTime() - a.getTime());
            
            if (datasUnicas.length > 0) {
                let rachaAtual = 1;
                let rachaMaxima = 1;
                const hoje = new Date();
                const diffPrimeiroDia = differenceInCalendarDays(hoje, datasUnicas[0]);

                if (diffPrimeiroDia <= 1) {
                    for (let i = 0; i < datasUnicas.length - 1; i++) {
                        const diff = differenceInCalendarDays(datasUnicas[i], datasUnicas[i+1]);
                        if (diff === 1) {
                            rachaAtual++;
                        } else {
                            break; 
                        }
                    }
                    rachaMaxima = rachaAtual;
                } else {
                    rachaMaxima = 0;
                }
                diasConsecutivos = rachaMaxima;
            }
        }
        
        res.status(200).json({
            totalTreinosConcluidos,
            mediaPSE,
            diasConsecutivos
        });

    } catch (error) {
        next(error);
    }
});
export default router;