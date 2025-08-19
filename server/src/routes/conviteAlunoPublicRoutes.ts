// server/src/routes/conviteAlunoPublicRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import ConviteAluno from '../../models/ConviteAluno.js';
import Aluno from '../../models/Aluno.js';
import PersonalTrainer from '../../models/PersonalTrainer.js'; // Importa o modelo PersonalTrainer
import mongoose from 'mongoose';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// GET /api/public/convite-aluno/:token - Valida o token do convite
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
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

    } catch (error) {
        next(error);
    }
});

// POST /api/public/convite-aluno/registrar - Finaliza o cadastro do aluno
router.post('/registrar', async (req: Request, res: Response, next: NextFunction) => {
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
        
        // Importar PlanoService aqui para evitar dependência circular
        const { default: PlanoService } = await import('../../services/PlanoService.js');
        const { default: PersonalPlano } = await import('../../models/PersonalPlano.js');
        const { default: TokenAvulso } = await import('../../models/TokenAvulso.js');

        // Verificar se o personal tem slots disponíveis (usando a mesma lógica do route de criação)
        const canActivate = await PlanoService.canActivateMoreStudents(trainerId, 1);
        if (!canActivate.canActivate) {
            await session.abortTransaction();
            return res.status(403).json({ 
                erro: 'O personal trainer não possui vagas disponíveis no plano atual ou tokens avulsos.'
            });
        }

        // Alocar slot (mesma lógica da criação manual)
        const planStatus = await PlanoService.getPersonalCurrentPlan(trainerId);
        const limiteBasePlano = planStatus.isExpired ? 0 : (planStatus.plano?.limiteAlunos || 0);
        const alunosAtivosNoPlano = await Aluno.countDocuments({
            trainerId: convite.criadoPor, status: 'active', slotType: 'plan'
        }).session(session);

        let slotType: 'plan' | 'token';
        let slotId: mongoose.Types.ObjectId;
        let slotStartDate: Date;
        let slotEndDate: Date;

        if (alunosAtivosNoPlano < limiteBasePlano) {
            // Usar slot do plano
            slotType = 'plan';
            slotId = new mongoose.Types.ObjectId(planStatus.personalPlano!._id as any);
            slotStartDate = planStatus.personalPlano!.dataInicio;
            slotEndDate = planStatus.personalPlano!.dataVencimento;
        } else {
            // Usar token avulso
            slotType = 'token';
            const token = await TokenAvulso.findOne({
                personalTrainerId: trainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).sort({ dataVencimento: 1 }).session(session);

            if (!token) {
                await session.abortTransaction();
                return res.status(403).json({ erro: "Não há vagas de plano ou tokens avulsos disponíveis." });
            }
            
            slotId = new mongoose.Types.ObjectId(token._id as any);
            slotStartDate = new Date();
            slotEndDate = token.dataVencimento;

            // Consumir o token
            if (token.quantidade > 1) {
                token.quantidade -= 1;
                await token.save({ session });
            } else {
                await TokenAvulso.deleteOne({ _id: token._id }).session(session);
            }
        }
        
        // Obter o ciclo atual para controle anti-abuso
        const currentCycleId = await PlanoService.getCurrentCycleId(trainerId);

        const novoAluno = new Aluno({
            nome,
            email: emailFinal,
            passwordHash: password,
            trainerId: convite.criadoPor,
            status: 'active',
            slotType,
            slotId,
            slotStartDate,
            slotEndDate,
            cycleId: currentCycleId,
            tokenReservedForCycle: slotType === 'token', // Reserve token apenas se for token avulso
            ...outrosDados,
        });

        await novoAluno.save({ session });

        convite.status = 'utilizado';
        convite.usadoPor = novoAluno._id as mongoose.Types.ObjectId;
        await convite.save({ session });

        await session.commitTransaction();
        res.status(201).json({ mensagem: 'Aluno registrado com sucesso!' });

    } catch (error: any) {
        if (session.inTransaction()) await session.abortTransaction();
        if (error.code === 11000) {
            return res.status(409).json({ erro: 'Este endereço de e-mail já está em uso.' });
        }
        next(error);
    } finally {
        session.endSession();
    }
});

export default router;