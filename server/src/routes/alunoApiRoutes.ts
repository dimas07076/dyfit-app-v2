// server/src/routes/alunoApiRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Treino from '../../models/Treino.js';
import Sessao, { OPCOES_PSE } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import ConviteAluno from '../../models/ConviteAluno.js';
import WorkoutLog from '../../models/WorkoutLog.js';
import { startOfWeek, endOfWeek, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import dbConnect from '../../lib/dbConnect.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import { checkLimiteAlunos, checkCanActivateStudent } from '../../middlewares/checkLimiteAlunos.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL (PARA GERENCIAR ALUNOS)
// =======================================================

// POST /api/aluno/convite - Gera um link de convite para aluno
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

// GET /api/aluno/gerenciar - Lista todos os alunos do personal
router.get("/gerenciar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const trainerId = req.user?.id;
    if (!trainerId) {
        return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    try {
        const alunos = await Aluno.find({ trainerId }).sort({ nome: 1 }).select('-passwordHash');
        res.status(200).json(alunos);
    } catch (error) {
        next(error);
    }
});

// POST /api/aluno/gerenciar - Criar um novo aluno
router.post("/gerenciar", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
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

        // Import SlotManagementService
        const { default: SlotManagementService } = await import('../../services/SlotManagementService.js');

        // Check for available slots
        const slotResult = await SlotManagementService.verificarSlotDisponivel(trainerId);
        
        if (!slotResult.slotsDisponiveis) {
            return res.status(403).json({ 
                erro: slotResult.message,
                code: 'STUDENT_LIMIT_EXCEEDED',
                details: slotResult.details
            });
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

        const alunoSalvo = await novoAluno.save();

        // Associate student with slot
        if (slotResult.slotInfo) {
            await SlotManagementService.associarAlunoASlot((alunoSalvo._id as mongoose.Types.ObjectId).toString(), slotResult.slotInfo);
        }

        const alunoResponse = alunoSalvo.toObject();
        delete alunoResponse.passwordHash;

        res.status(201).json({
            mensagem: "Aluno criado com sucesso!",
            aluno: alunoResponse,
            consumoInfo: {
                fonte: slotResult.slotInfo?.fonte,
                validadeAcesso: slotResult.slotInfo?.validadeAcesso
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/aluno/gerenciar/:id - Buscar um aluno específico
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
        // Verificar se o aluno pertence ao personal trainer autenticado
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

// PUT /api/aluno/gerenciar/:id - Atualizar um aluno existente
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
        const { nome, email, phone, birthDate, gender, goal, weight, height, startDate, status, notes } = req.body;

        // Validação de campos obrigatórios
        if (!nome || !email || !birthDate || !gender || !goal || !startDate || !status) {
            return res.status(400).json({ erro: "Nome, email, data de nascimento, gênero, objetivo, data de início e status são obrigatórios." });
        }

        // Verificar se o aluno pertence ao personal trainer autenticado
        const alunoExistente = await Aluno.findOne({ 
            _id: new mongoose.Types.ObjectId(alunoId),
            trainerId: new mongoose.Types.ObjectId(trainerId)
        });

        if (!alunoExistente) {
            return res.status(404).json({ erro: "Aluno não encontrado ou não pertence a você." });
        }

        // Verificar se email já existe (exceto para este aluno)
        if (email.toLowerCase() !== alunoExistente.email) {
            const emailExistente = await Aluno.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: new mongoose.Types.ObjectId(alunoId) }
            });
            if (emailExistente) {
                return res.status(409).json({ erro: "Já existe outro aluno com este email." });
            }
        }

        // Preparar dados para atualização
        const updateData: any = {
            nome,
            email: email.toLowerCase(),
            phone,
            birthDate: new Date(birthDate),
            gender,
            goal,
            startDate: new Date(startDate),
            status,
            notes
        };

        // Handle status change logic
        const statusMudou = alunoExistente.status !== status;
        const tentandoAtivar = statusMudou && status === 'active' && alunoExistente.status === 'inactive';
        
        // Import SlotManagementService for activation check
        if (tentandoAtivar) {
            const { default: SlotManagementService } = await import('../../services/SlotManagementService.js');
            
            // Check if student can be reactivated with existing association
            const reactivationResult = await SlotManagementService.podeReativarAluno(alunoId);
            
            if (!reactivationResult.podeReativar && !reactivationResult.novaAssociacaoNecessaria) {
                return res.status(403).json({ 
                    erro: reactivationResult.motivoNegacao || 'Não é possível reativar este aluno',
                    code: 'REACTIVATION_DENIED'
                });
            }
            
            // If new association is needed, check for available slots
            if (reactivationResult.novaAssociacaoNecessaria) {
                const slotResult = await SlotManagementService.verificarSlotDisponivel(trainerId);
                
                if (!slotResult.slotsDisponiveis) {
                    return res.status(403).json({ 
                        erro: 'Não é possível reativar: ' + slotResult.message,
                        code: 'STUDENT_LIMIT_EXCEEDED',
                        details: slotResult.details
                    });
                }
                
                // Create new association after successful update
                updateData.newSlotAssociation = slotResult.slotInfo;
            }
        }

        // Adicionar peso e altura se fornecidos
        if (weight !== null && weight !== undefined && weight !== '') {
            updateData.weight = parseFloat(weight);
        }
        if (height !== null && height !== undefined && height !== '') {
            updateData.height = parseInt(height);
        }

        // Remove the slot association data from updateData before saving
        const newSlotAssociation = updateData.newSlotAssociation;
        delete updateData.newSlotAssociation;

        // Atualizar o aluno
        const alunoAtualizado = await Aluno.findByIdAndUpdate(
            new mongoose.Types.ObjectId(alunoId),
            updateData,
            { new: true, runValidators: true }
        ).select('-passwordHash');

        // If new slot association is needed, apply it now
        if (tentandoAtivar && newSlotAssociation) {
            const { default: SlotManagementService } = await import('../../services/SlotManagementService.js');
            await SlotManagementService.associarAlunoASlot(alunoId, newSlotAssociation);
            
            // Refetch updated student data
            const alunoComAssociacao = await Aluno.findById(alunoId).select('-passwordHash');
            
            res.status(200).json({
                mensagem: "Aluno atualizado e reativado com sucesso!",
                aluno: alunoComAssociacao,
                consumoInfo: {
                    fonte: newSlotAssociation.fonte,
                    validadeAcesso: newSlotAssociation.validadeAcesso
                }
            });
            return;
        }

        res.status(200).json({
            mensagem: "Aluno atualizado com sucesso!",
            aluno: alunoAtualizado
        });

    } catch (error) {
        next(error);
    }
});

// DELETE /api/aluno/gerenciar/:id - Excluir um aluno
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
        // Verificar se o aluno pertence ao personal trainer autenticado
        const alunoExistente = await Aluno.findOne({ 
            _id: new mongoose.Types.ObjectId(alunoId),
            trainerId: new mongoose.Types.ObjectId(trainerId)
        });

        if (!alunoExistente) {
            return res.status(404).json({ erro: "Aluno não encontrado ou não pertence a você." });
        }

        // Import SlotManagementService
        const { default: SlotManagementService } = await import('../../services/SlotManagementService.js');

        // Free any consumed slots/tokens before deletion
        await SlotManagementService.liberarSlotPorExclusao(alunoId, true);

        // Excluir o aluno
        await Aluno.findByIdAndDelete(new mongoose.Types.ObjectId(alunoId));

        res.status(200).json({
            mensagem: "Aluno excluído com sucesso!"
        });

    } catch (error) {
        next(error);
    }
});


// =======================================================
// ROTAS DO ALUNO (DASHBOARD, FICHAS, HISTÓRICO)
// =======================================================

// GET /api/aluno/meus-treinos - Lista as rotinas do aluno logado
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

// <<< NOVA ROTA >>>
// GET /api/aluno/meus-treinos/:id - Retorna uma rotina específica do aluno
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


// GET /api/aluno/minhas-sessoes-concluidas-na-semana - Retorna sessões da semana para o gráfico de frequência
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

// GET /api/aluno/stats-progresso - Retorna estatísticas de progresso do aluno
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
                // Verifique se a data de hoje está na lista ou se a de ontem está para contar o streak atual.
                const hoje = startOfDay(new Date());
                const ontem = startOfDay(new Date(hoje.setDate(hoje.getDate() - 1)));
                hoje.setDate(hoje.getDate() + 1); // Reset 'hoje'
                
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

// PATCH /api/aluno/meus-treinos/:id/cargas - Atualiza as cargas de exercícios no treino
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
        // Verificar se a rotina pertence ao aluno
        const rotina = await Treino.findOne({
            _id: new mongoose.Types.ObjectId(rotinaId),
            alunoId: new mongoose.Types.ObjectId(alunoId),
            tipo: 'individual'
        });

        if (!rotina) {
            return res.status(404).json({ erro: 'Rotina não encontrada ou não pertence a este aluno.' });
        }

        // Encontrar o dia de treino
        const diaDeTreino = rotina.diasDeTreino.find(dia => dia._id.toString() === diaDeTreinoId);
        if (!diaDeTreino) {
            return res.status(404).json({ erro: 'Dia de treino não encontrado na rotina.' });
        }

        // Atualizar as cargas dos exercícios
        let exerciciosAtualizados = 0;
        
        for (const [exercicioId, novaCarga] of Object.entries(cargas)) {
            const exercicio = diaDeTreino.exerciciosDoDia?.find(ex => ex._id.toString() === exercicioId);
            if (exercicio) {
                // Só atualizar se a nova carga não estiver vazia/nula
                // Preservar carga existente se nova carga for vazia
                if (novaCarga && typeof novaCarga === 'string' && novaCarga.trim()) {
                    exercicio.carga = novaCarga.trim();
                    exerciciosAtualizados++;
                }
                // Se nova carga estiver vazia, manter a carga atual (não sobrescrever)
            }
        }

        if (exerciciosAtualizados === 0) {
            return res.status(400).json({ erro: 'Nenhum exercício foi encontrado para atualizar.' });
        }

        // Salvar as mudanças
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

// <<< NOVA ROTA >>>
// GET /api/aluno/meu-historico-sessoes - Retorna o histórico paginado de sessões do aluno
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