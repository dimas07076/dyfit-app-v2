// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao, { OPCOES_PSE } from '../../models/Sessao.js';
import { startOfWeek, endOfWeek, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import PersonalPlano from '../../models/PersonalPlano.js';
import TokenAvulso from '../../models/TokenAvulso.js';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos } from '../../middlewares/checkLimiteAlunos.js';
import PlanoService from '../../services/PlanoService.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================

router.post("/convite", authenticateToken, checkLimiteAlunos, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Personal não autenticado." });
    }

    try {
        const { emailConvidado } = req.body;

        if (emailConvidado) {
            const alunoExistente = await Aluno.findOne({ 
                email: emailConvidado, 
                trainerId: new mongoose.Types.ObjectId(trainerId) 
            });
            if (alunoExistente) {
                return res.status(409).json({ message: "Este aluno já está cadastrado com você." });
            }

            const convitePendente = await ConviteAluno.findOne({
                emailConvidado,
                status: 'pendente',
                criadoPor: trainerId
            });
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

router.get("/gerenciar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    try {
        const { status } = req.query;
        const query: { trainerId: string; status?: string } = { trainerId };

        if (status && typeof status === 'string' && status.toLowerCase() !== 'all') {
            query.status = status;
        }

        const alunos = await Aluno.find(query).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    } catch (error) {
        next(error);
    }
});

router.post("/gerenciar", authenticateToken, checkLimiteAlunos, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id!;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { nome, email, password, ...outrosDados } = req.body;

        if (!nome || !email || !password) {
            await session.abortTransaction();
            return res.status(400).json({ message: "Nome, email e senha são obrigatórios." });
        }

        const alunoExistente = await Aluno.findOne({ email: email.toLowerCase() }).session(session);
        if (alunoExistente) {
            await session.abortTransaction();
            return res.status(409).json({ message: "Já existe um aluno com este email." });
        }

        const planStatus = await PlanoService.getPersonalCurrentPlan(trainerId);
        const limiteBasePlano = planStatus.isExpired ? 0 : (planStatus.plano?.limiteAlunos || 0);
        const alunosAtivosNoPlano = await Aluno.countDocuments({
            trainerId, status: 'active', slotType: 'plan'
        }).session(session);

        let slotType: 'plan' | 'token';
        let slotId: mongoose.Types.ObjectId;
        let slotStartDate: Date;
        let slotEndDate: Date;

        if (alunosAtivosNoPlano < limiteBasePlano) {
            slotType = 'plan';
            slotId = new mongoose.Types.ObjectId(planStatus.personalPlano!._id as any);
            slotStartDate = planStatus.personalPlano!.dataInicio;
            slotEndDate = planStatus.personalPlano!.dataVencimento;
        } else {
            slotType = 'token';
            const token = await TokenAvulso.findOne({
                personalTrainerId: trainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).sort({ dataVencimento: 1 }).session(session);

            if (!token) {
                await session.abortTransaction();
                return res.status(403).json({ message: "Não há vagas de plano ou tokens avulsos disponíveis." });
            }
            
            slotId = new mongoose.Types.ObjectId(token._id as any);
            slotStartDate = new Date();
            slotEndDate = token.dataVencimento;

            if (token.quantidade > 1) {
                token.quantidade -= 1;
                await token.save({ session });
            } else {
                await TokenAvulso.deleteOne({ _id: token._id }).session(session);
            }
        }
        
        const novoAluno = new Aluno({
            nome,
            email: email.toLowerCase(),
            passwordHash: password,
            trainerId: new mongoose.Types.ObjectId(trainerId),
            ...outrosDados,
            status: 'active',
            slotType,
            slotId,
            slotStartDate,
            slotEndDate,
        });

        await novoAluno.save({ session });
        await session.commitTransaction();

        const alunoResponse = novoAluno.toObject();
        delete (alunoResponse as any).passwordHash;

        res.status(201).json({
            message: "Aluno criado e vaga associada com sucesso!",
            aluno: alunoResponse
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
});

router.get("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const alunoId = req.params.id;

    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    if (!mongoose.Types.ObjectId.isValid(alunoId)) {
        return res.status(400).json({ erro: "ID do aluno inválido." });
    }

    try {
        const aluno = await Aluno.findOne({
            _id: new mongoose.Types.ObjectId(alunoId),
            trainerId: new mongoose.Types.ObjectId(trainerId)
        }).select('-passwordHash');

        if (!aluno) {
            return res.status(404).json({ erro: "Aluno não encontrado ou não pertence a você." });
        }

        res.status(200).json(aluno);

    } catch (error) {
        next(error);
    }
});

router.put("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const alunoId = req.params.id;

    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    if (!mongoose.Types.ObjectId.isValid(alunoId)) {
        return res.status(400).json({ erro: "ID do aluno inválido." });
    }

    try {
        const { slotType, slotId, slotStartDate, slotEndDate, ...updateData } = req.body;

        if (!updateData.nome || !updateData.email) {
            return res.status(400).json({ erro: "Nome e email são obrigatórios." });
        }

        const alunoAtualizado = await Aluno.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(alunoId), trainerId: new mongoose.Types.ObjectId(trainerId) },
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-passwordHash');
        
        if (!alunoAtualizado) {
            return res.status(404).json({ erro: "Aluno não encontrado ou não pertence a você." });
        }

        res.status(200).json({
            mensagem: "Aluno atualizado com sucesso!",
            aluno: alunoAtualizado
        });

    } catch (error) {
        next(error);
    }
});

router.delete("/gerenciar/:id", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    const alunoId = req.params.id;

    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    if (!mongoose.Types.ObjectId.isValid(alunoId)) {
        return res.status(400).json({ erro: "ID do aluno inválido." });
    }

    try {
        const alunoInativado = await Aluno.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(alunoId), trainerId: new mongoose.Types.ObjectId(trainerId) },
            { 
              $set: { status: 'inactive' }, 
              $unset: { slotType: "", slotId: "", slotStartDate: "", slotEndDate: "" }
            },
            { new: true }
        ).select('-passwordHash');

        if (!alunoInativado) {
            return res.status(404).json({ message: "Aluno não encontrado ou não pertence a você." });
        }
        
        res.status(200).json({
            message: "Aluno marcado como inativo e vaga liberada com sucesso!",
            aluno: alunoInativado
        });
    } catch (error) {
        next(error);
    }
});


// =======================================================
// ROTAS DO ALUNO (DASHBOARD, FICHAS, HISTÓRICO)
// =======================================================
router.get('/meus-treinos', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ erro: "Aluno não autenticado." });

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
    } catch (error) {
        console.error("Erro ao buscar treinos do aluno:", error);
        next(error);
    }
});
router.get('/meus-treinos/:id', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    const rotinaId = req.params.id;

    if (!alunoId) return res.status(401).json({ erro: "Aluno não autenticado." });
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
    } catch (error) {
        console.error(`Erro ao buscar detalhes da rotina ${rotinaId} para o aluno ${alunoId}:`, error);
        next(error);
    }
});
router.get('/minhas-sessoes-concluidas-na-semana', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ erro: "Aluno não autenticado." });

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
    } catch (error) {
        console.error("Erro ao buscar sessões da semana do aluno:", error);
        next(error);
    }
});
router.get('/stats-progresso', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ erro: "Aluno não autenticado." });

    try {
        const sessoesConcluidas = await Sessao.find({
            alunoId: new mongoose.Types.ObjectId(alunoId),
            status: 'completed'
        }).select('concluidaEm pseAluno').lean();

        const totalTreinosConcluidos = sessoesConcluidas.length;

        const pseMap: { [key: string]: number } = OPCOES_PSE.reduce((acc, val, i) => ({ ...acc, [val]: i + 1 }), {});
        const sessoesComPSE = sessoesConcluidas.filter(s => s.pseAluno && pseMap[s.pseAluno]);
        let mediaPSE = 'N/D';
        if (sessoesComPSE.length > 0) {
            const somaPSE = sessoesComPSE.reduce((acc, s) => acc + pseMap[s.pseAluno!], 0);
            const mediaNumerica = Math.round(somaPSE / sessoesComPSE.length);
            mediaPSE = OPCOES_PSE[mediaNumerica - 1] || 'N/D';
        }

        let diasConsecutivos = 0;
        if (sessoesConcluidas.length > 0) {
            const datasDeTreinoUnicas = [...new Set(sessoesConcluidas.map(s => startOfDay(s.concluidaEm!).toISOString()))]
                                          .map(d => parseISO(d))
                                          .sort((a, b) => a.getTime() - b.getTime());
            
            if (datasDeTreinoUnicas.length > 0) {
                let streakAtual = 0;
                const hoje = startOfDay(new Date());
                const ontem = startOfDay(new Date(hoje.setDate(hoje.getDate() - 1)));
                hoje.setDate(hoje.getDate() + 1);
                
                let ultimaData = startOfDay(new Date(2000, 0, 1));
                for(const data of datasDeTreinoUnicas) {
                    if (differenceInCalendarDays(data, ultimaData) === 1) {
                        streakAtual++;
                    } else {
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

    } catch (error) {
        console.error("Erro ao calcular stats de progresso do aluno:", error);
        next(error);
    }
});
router.patch('/meus-treinos/:id/cargas', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    const rotinaId = req.params.id;
    const { diaDeTreinoId, cargas } = req.body;

    if (!alunoId) return res.status(401).json({ erro: "Aluno não autenticado." });
    
    if (!mongoose.Types.ObjectId.isValid(rotinaId)) {
        return res.status(400).json({ erro: 'ID da rotina inválido.' });
    }

    if (!diaDeTreinoId || !cargas || typeof cargas !== 'object') {
        return res.status(400).json({ erro: 'diaDeTreinoId e cargas são obrigatórios.' });
    }

    try {
        const rotina = await Treino.findOne({
            _id: new mongoose.Types.ObjectId(rotinaId),
            alunoId: new mongoose.Types.ObjectId(alunoId),
            tipo: 'individual'
        });

        if (!rotina) {
            return res.status(404).json({ erro: 'Rotina não encontrada ou não pertence a este aluno.' });
        }

        const diaDeTreino = rotina.diasDeTreino.find(dia => dia._id.toString() === diaDeTreinoId);
        if (!diaDeTreino) {
            return res.status(404).json({ erro: 'Dia de treino não encontrado na rotina.' });
        }

        let exerciciosAtualizados = 0;
        
        for (const [exercicioId, novaCarga] of Object.entries(cargas)) {
            const exercicio = diaDeTreino.exerciciosDoDia?.find(ex => ex._id.toString() === exercicioId);
            if (exercicio) {
                if (novaCarga && typeof novaCarga === 'string' && novaCarga.trim()) {
                    exercicio.carga = novaCarga.trim();
                    exerciciosAtualizados++;
                }
            }
        }

        if (exerciciosAtualizados === 0) {
            return res.status(400).json({ erro: 'Nenhum exercício foi encontrado para atualizar.' });
        }

        await rotina.save();

        res.status(200).json({
            mensagem: `${exerciciosAtualizados} carga(s) atualizada(s) com sucesso.`,
            exerciciosAtualizados
        });

    } catch (error) {
        console.error(`Erro ao atualizar cargas da rotina ${rotinaId}:`, error);
        next(error);
    }
});
router.get('/meu-historico-sessoes', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    if (!alunoId) return res.status(401).json({ erro: "Aluno não autenticado." });
    
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 5;
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

    } catch (error) {
        console.error("Erro ao buscar histórico de sessões do aluno:", error);
        next(error);
    }
});

export default router;