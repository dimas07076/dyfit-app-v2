// server/services/PlanoService.ts
import Plano, { IPlano } from '../models/Plano.js';
import PersonalPlano, { IPersonalPlano } from '../models/PersonalPlano.js';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

// Configuração de planos iniciais
const INITIAL_PLANS = [
    {
        nome: 'Free',
        descricao: 'Plano gratuito por 7 dias com 1 aluno ativo',
        limiteAlunos: 1,
        preco: 0,
        duracao: 7,
        tipo: 'free' as const,
        ativo: true
    },
    {
        nome: 'Start',
        descricao: 'Plano inicial para até 5 alunos ativos',
        limiteAlunos: 5,
        preco: 29.90,
        duracao: 30,
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Pro',
        descricao: 'Plano profissional para até 10 alunos ativos',
        limiteAlunos: 10,
        preco: 49.90,
        duracao: 30,
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Elite',
        descricao: 'Plano elite para até 20 alunos ativos',
        limiteAlunos: 20,
        preco: 79.90,
        duracao: 30,
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Master',
        descricao: 'Plano master para até 50 alunos ativos',
        limiteAlunos: 50,
        preco: 129.90,
        duracao: 30,
        tipo: 'paid' as const,
        ativo: true
    }
];

export class PlanoService {
    /**
     * Buscar o plano atual do personal trainer
     * Modificação: alunos ativos contam vagas por slotEndDate > now
     */
    async getPersonalCurrentPlan(personalTrainerId: string): Promise<{
        plano: IPlano | null;
        personalPlano: IPersonalPlano | null;
        limiteAtual: number;
        alunosAtivos: number;
        tokensAvulsos: number;
        isExpired: boolean;
        expiredPlan?: {
            plano: IPlano | null;
            personalPlano: IPersonalPlano | null;
        };
    }> {
        try {
            // Validação de entrada
            if (!personalTrainerId) {
                throw new Error('Personal trainer ID é obrigatório');
            }

            // Buscar plano ativo
            const personalPlanoAtivo = await PersonalPlano.findOne({
                personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).populate({
                path: 'planoId',
                model: 'Plano'
            }).sort({ dataInicio: -1 });

            // Buscar plano expirado se não houver ativo
            let personalPlanoExpirado = null;
            if (!personalPlanoAtivo) {
                personalPlanoExpirado = await PersonalPlano.findOne({
                    personalTrainerId,
                    ativo: true,
                    dataVencimento: { $lte: new Date() }
                }).populate({
                    path: 'planoId',
                    model: 'Plano'
                }).sort({ dataVencimento: -1 });
            }

            // Calcular alunos que ainda ocupam vaga (slotEndDate futuro ou indefinido)
            const now = new Date();
            const alunosAtivos = await Aluno.countDocuments({
                trainerId: personalTrainerId,
                $or: [
                    { slotEndDate: { $gt: now } },
                    { slotEndDate: { $exists: false } } // Para registros antigos sem slotEndDate
                ]
            });

            // Calcular tokens ativos
            const tokensAtivos = await this.getTokensAvulsosAtivos(personalTrainerId);

            let limiteAtual = 0;
            let plano: IPlano | null = null;
            let personalPlano: IPersonalPlano | null = null;
            let isExpired = false;

            // Determinar qual plano usar
            const currentPersonalPlano = personalPlanoAtivo || personalPlanoExpirado;
            if (currentPersonalPlano && currentPersonalPlano.planoId && typeof currentPersonalPlano.planoId === 'object' && 'nome' in currentPersonalPlano.planoId) {
                plano = currentPersonalPlano.planoId as unknown as IPlano;
                personalPlano = currentPersonalPlano;

                if (personalPlanoAtivo) {
                    limiteAtual = plano.limiteAlunos || 0;
                } else {
                    limiteAtual = 0;
                    isExpired = true;
                }
            } else {
                console.log(`❌ Nenhum plano (ativo ou expirado) encontrado para personal ${personalTrainerId}`);
            }

            // Sempre acrescenta tokens ao limite, mesmo se plano expirado
            limiteAtual += tokensAtivos;

            const result: {
                plano: IPlano | null;
                personalPlano: IPersonalPlano | null;
                limiteAtual: number;
                alunosAtivos: number;
                tokensAvulsos: number;
                isExpired: boolean;
                expiredPlan?: {
                    plano: IPlano | null;
                    personalPlano: IPersonalPlano | null;
                };
            } = {
                plano,
                personalPlano,
                limiteAtual,
                alunosAtivos,
                tokensAvulsos: tokensAtivos,
                isExpired
            };

            if (personalPlanoExpirado && !personalPlanoAtivo) {
                result.expiredPlan = {
                    plano: plano,
                    personalPlano: personalPlanoExpirado
                };
            }

            return result;
        } catch (error) {
            console.error('❌ Erro ao buscar plano atual do personal:', error);
            throw error;
        }
    }

    /**
     * Verifica se é possível ativar mais alunos
     */
    async canActivateMoreStudents(personalTrainerId: string, quantidadeDesejada: number = 1): Promise<{
        canActivate: boolean;
        currentLimit: number;
        activeStudents: number;
        availableSlots: number;
    }> {
        const status = await this.getPersonalCurrentPlan(personalTrainerId);
        const availableSlots = status.limiteAtual - status.alunosAtivos;
        
        return {
            canActivate: availableSlots >= quantidadeDesejada,
            currentLimit: status.limiteAtual,
            activeStudents: status.alunosAtivos,
            availableSlots
        };
    }

    /**
     * Retorna a quantidade de tokens avulsos ativos
     */
    async getTokensAvulsosAtivos(personalTrainerId: string): Promise<number> {
        try {
            if (!personalTrainerId) {
                console.warn('⚠️  Personal trainer ID não fornecido para busca de tokens');
                return 0;
            }

            const tokens = await TokenAvulso.find({
                personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            });

            const total = tokens.reduce((total, token) => total + (token.quantidade || 0), 0);
            return total;
        } catch (error) {
            console.error('❌ Erro ao buscar tokens avulsos ativos:', error);
            return 0;
        }
    }

    /**
     * Atribui um plano ao personal trainer
     */
    async assignPlanToPersonal(
        personalTrainerId: string,
        planoId: string,
        adminId?: string | null,
        customDuration?: number,
        motivo?: string
    ): Promise<IPersonalPlano> {
        const PersonalTrainer = (await import('../models/PersonalTrainer.js')).default;
        
        await PersonalPlano.updateMany(
            { personalTrainerId, ativo: true },
            { ativo: false }
        );

        const plano = await Plano.findById(planoId);
        if (!plano) {
            throw new Error('Plano não encontrado');
        }

        const dataInicio = new Date();
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + (customDuration || plano.duracao));

        const personalPlano = new PersonalPlano({
            personalTrainerId,
            planoId,
            dataInicio,
            dataVencimento,
            atribuidoPorAdmin: adminId ?? undefined,
            motivoAtribuicao: motivo,
            ativo: true
        });

        const savedPersonalPlano = await personalPlano.save();

        await PersonalTrainer.findByIdAndUpdate(personalTrainerId, {
            planoId: planoId,
            statusAssinatura: 'ativa',
            dataInicioAssinatura: dataInicio,
            dataFimAssinatura: dataVencimento,
            limiteAlunos: plano.limiteAlunos
        });

        return savedPersonalPlano;
    }

    /**
     * Adiciona tokens ao personal trainer
     */
    async addTokensToPersonal(
        personalTrainerId: string,
        quantidade: number,
        adminId: string,
        customDays?: number,
        motivo?: string
    ): Promise<ITokenAvulso> {
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + (customDays || 30));

        const token = new TokenAvulso({
            personalTrainerId,
            quantidade,
            dataVencimento,
            adicionadoPorAdmin: adminId,
            motivoAdicao: motivo,
            ativo: true
        });

        return await token.save();
    }

    /**
     * Garante que os planos iniciais existam no banco
     */
    async ensureInitialPlansExist(): Promise<boolean> {
        try {
            const existingPlansCount = await Plano.countDocuments({ ativo: true });
            if (existingPlansCount > 0) {
                return true;
            }

            for (const planData of INITIAL_PLANS) {
                const existingPlan = await Plano.findOne({ nome: planData.nome });
                if (!existingPlan) {
                    const newPlan = new Plano(planData);
                    await newPlan.save();
                }
            }
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar/criar planos iniciais:', error);
            return false;
        }
    }

    /**
     * Busca todos os planos
     */
    async getAllPlans(): Promise<IPlano[]> {
        try {
            await this.ensureInitialPlansExist();
            const plans = await Plano.find({ ativo: true }).sort({ preco: 1 });
            return plans;
        } catch (error) {
            console.error('❌ Erro ao buscar planos:', error);
            throw error;
        }
    }

    /**
     * Cria ou atualiza um plano
     */
    async createOrUpdatePlan(planData: Partial<IPlano>): Promise<IPlano> {
        if (planData._id) {
            const plan = await Plano.findByIdAndUpdate(planData._id, planData, { new: true });
            if (!plan) throw new Error('Plano não encontrado');
            return plan;
        } else {
            return await Plano.create(planData);
        }
    }

    /**
     * Retorna os tokens detalhados para admin
     */
    async getDetailedTokensForAdmin(personalTrainerId: string): Promise<{
        activeTokens: ITokenAvulso[];
        expiredTokens: ITokenAvulso[];
        totalActiveQuantity: number;
    }> {
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const [activeTokens, expiredTokens] = await Promise.all([
                TokenAvulso.find({
                    personalTrainerId,
                    ativo: true,
                    dataVencimento: { $gt: now }
                }).populate('adicionadoPorAdmin', 'nome').sort({ dataVencimento: 1 }),
                TokenAvulso.find({
                    personalTrainerId,
                    ativo: true,
                    dataVencimento: { $lte: now, $gte: thirtyDaysAgo }
                }).populate('adicionadoPorAdmin', 'nome').sort({ dataVencimento: -1 })
            ]);

            const totalActiveQuantity = activeTokens.reduce((sum, token) => sum + token.quantidade, 0);

            return {
                activeTokens,
                expiredTokens,
                totalActiveQuantity
            };
        } catch (error) {
            console.error('❌ Erro ao buscar tokens detalhados:', error);
            return {
                activeTokens: [],
                expiredTokens: [],
                totalActiveQuantity: 0
            };
        }
    }

    /**
     * Busca o status do personal para admin
     */
    async getPersonalStatusForAdmin(personalTrainerId: string): Promise<{
        personalInfo: any;
        currentPlan: any;
        activeTokens: ITokenAvulso[];
        expiredTokens: ITokenAvulso[];
        totalActiveTokens: number;
        activeStudents: number;
        totalLimit: number;
        planHistory: IPersonalPlano[];
    }> {
        const [currentStatus, tokenDetails, planHistory] = await Promise.all([
            this.getPersonalCurrentPlan(personalTrainerId),
            this.getDetailedTokensForAdmin(personalTrainerId),
            PersonalPlano.find({ personalTrainerId })
                .populate('planoId')
                .populate('atribuidoPorAdmin', 'nome')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        return {
            personalInfo: null,
            currentPlan: currentStatus,
            activeTokens: tokenDetails.activeTokens,
            expiredTokens: tokenDetails.expiredTokens,
            totalActiveTokens: tokenDetails.totalActiveQuantity,
            activeStudents: currentStatus.alunosAtivos,
            totalLimit: currentStatus.limiteAtual,
            planHistory
        };
    }

    /**
     * Desativa planos e tokens expirados
     */
    async cleanupExpired(): Promise<{ plansDeactivated: number; tokensDeactivated: number }> {
        const now = new Date();

        const [plansResult, tokensResult] = await Promise.all([
            PersonalPlano.updateMany(
                { dataVencimento: { $lt: now }, ativo: true },
                { ativo: false }
            ),
            TokenAvulso.updateMany(
                { dataVencimento: { $lt: now }, ativo: true },
                { ativo: false }
            )
        ]);

        return {
            plansDeactivated: plansResult.modifiedCount,
            tokensDeactivated: tokensResult.modifiedCount
        };
    }
}

export default new PlanoService();
