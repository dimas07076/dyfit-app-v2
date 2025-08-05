// server/src/routes/sessionsRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { authenticateAlunoToken } from '../../middlewares/authenticateAlunoToken.js';
import Sessao, { ISessaoLean, ISessaoDocument, TipoCompromisso, TIPOS_COMPROMISSO, OpcaoPSE, DetalheAumentoCarga } from '../../models/Sessao.js';
import Aluno from '../../models/Aluno.js';
import Treino, { ITreino } from '../../models/Treino.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

// =======================================================
// ROTAS DO PERSONAL
// =======================================================
// (Rotas do personal omitidas por brevidade, permanecem inalteradas)
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... código original inalterado ...
});
router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... código original inalterado ...
});
router.put('/:sessionId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... código original inalterado ...
});
router.delete('/:sessionId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... código original inalterado ...
});


// =======================================================
// ROTAS DO ALUNO
// =======================================================

router.post('/aluno/concluir-dia', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    const alunoId = req.aluno?.id;
    // <-- 1. MUDANÇA: Recebe 'dataInicio' do corpo da requisição -->
    const { rotinaId, diaDeTreinoId, pseAluno, comentarioAluno, duracaoSegundos, cargas, dataInicio } = req.body;

    if (!alunoId) return res.status(401).json({ message: "Aluno não autenticado." });
    if (!rotinaId || !diaDeTreinoId) return res.status(400).json({ message: "ID da rotina e do dia de treino são obrigatórios." });

    // <-- 2. MUDANÇA: Validação para o novo campo 'dataInicio' -->
    if (!dataInicio) {
        return res.status(400).json({ message: "A data de início do treino é obrigatória." });
    }
    const dataInicioValida = new Date(dataInicio);
    if (isNaN(dataInicioValida.getTime())) {
        return res.status(400).json({ message: "Formato de data de início inválido." });
    }


    const mongoTransactionSession = await mongoose.startSession();
    try {
        mongoTransactionSession.startTransaction();
        const rotina = await Treino.findOne({ _id: rotinaId, alunoId }).session(mongoTransactionSession);
        if (!rotina) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: "Rotina não encontrada ou não pertence a este aluno." });
        }
        const diaDeTreino = rotina.diasDeTreino.id(diaDeTreinoId);
        if (!diaDeTreino) {
            await mongoTransactionSession.abortTransaction();
            return res.status(404).json({ message: "Dia de treino não encontrado nesta rotina." });
        }

        const diaConcluidoIndex = rotina.diasDeTreino.findIndex(d => d._id.toString() === diaDeTreinoId);

        if (diaConcluidoIndex > -1) {
            const [diaMovido] = rotina.diasDeTreino.splice(diaConcluidoIndex, 1);
            rotina.diasDeTreino.push(diaMovido);
            rotina.diasDeTreino.forEach((dia, index) => {
                dia.ordemNaRotina = index;
            });
        }

        // Buscar sessão anterior do mesmo aluno/rotina/dia para comparar cargas
        let aumentouCarga = false;
        let detalhesAumentoCarga: DetalheAumentoCarga[] = [];

        if (cargas && Object.keys(cargas).length > 0) {
            try {
                const sessaoAnterior = await Sessao.findOne({
                    alunoId: new Types.ObjectId(alunoId),
                    rotinaId: rotina._id,
                    diaDeTreinoId: diaDeTreino._id,
                    status: 'completed'
                })
                .sort({ concluidaEm: -1 })
                .session(mongoTransactionSession);

                if (sessaoAnterior && sessaoAnterior.cargasExecutadas) {
                    const cargasAnteriores = sessaoAnterior.cargasExecutadas;
                    
                    // Comparar cargas exercício por exercício
                    for (const [exercicioId, cargaAtual] of Object.entries(cargas)) {
                        // Lidar com Map ou objeto plano
                        let cargaAnterior: string | undefined;
                        if (cargasAnteriores instanceof Map) {
                            cargaAnterior = cargasAnteriores.get(exercicioId);
                        } else {
                            cargaAnterior = (cargasAnteriores as any)[exercicioId];
                        }
                        
                        // Considerar aumento apenas se havia carga anterior e a atual é maior
                        if (cargaAnterior && typeof cargaAnterior === 'string' && cargaAnterior.trim() && 
                            cargaAtual && typeof cargaAtual === 'string' && cargaAtual.trim()) {
                            const cargaAnteriorNum = parseFloat(cargaAnterior.replace(/[^\d.,]/g, '').replace(',', '.'));
                            const cargaAtualNum = parseFloat(cargaAtual.replace(/[^\d.,]/g, '').replace(',', '.'));
                            
                            if (!isNaN(cargaAnteriorNum) && !isNaN(cargaAtualNum) && cargaAtualNum > cargaAnteriorNum) {
                                aumentouCarga = true;
                                detalhesAumentoCarga.push({
                                    exercicioId,
                                    cargaAnterior: cargaAnterior,
                                    cargaAtual: cargaAtual
                                });
                            }
                        }
                    }
                }
            } catch (comparisonError) {
                console.warn('Erro ao comparar cargas:', comparisonError);
                // Continua sem interromper o fluxo principal
            }
        }

        const novaSessao = new Sessao({
            personalId: rotina.criadorId,
            alunoId: new Types.ObjectId(alunoId),
            sessionDate: dataInicioValida,
            concluidaEm: new Date(),
            status: 'completed',
            tipoCompromisso: 'treino',
            rotinaId: rotina._id,
            diaDeTreinoId: diaDeTreino._id,
            diaDeTreinoIdentificador: diaDeTreino.identificadorDia,
            pseAluno: pseAluno || null,
            comentarioAluno: comentarioAluno || null,
            duracaoSegundos: duracaoSegundos || 0,
            cargasExecutadas: cargas || {},
            aumentouCarga,
            detalhesAumentoCarga
        });
        await novaSessao.save({ session: mongoTransactionSession });
        
        rotina.sessoesRotinaConcluidas = (rotina.sessoesRotinaConcluidas || 0) + 1;
        await rotina.save({ session: mongoTransactionSession });
        
        await mongoTransactionSession.commitTransaction();
        res.status(201).json({ message: "Dia de treino concluído com sucesso!", _id: novaSessao._id, status: novaSessao.status, concluidaEm: novaSessao.concluidaEm });
    } catch (error) {
        if (mongoTransactionSession.inTransaction()) await mongoTransactionSession.abortTransaction();
        next(error);
    } finally {
        await mongoTransactionSession.endSession();
    }
});

router.patch('/:sessionId/feedback', authenticateAlunoToken, async (req: Request, res: Response, next: NextFunction) => {
    // ... código original inalterado ...
});

export default router;