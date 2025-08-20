// server/services/PlanoService.ts
import mongoose from 'mongoose';
import Plano, { IPlano } from '../models/Plano.js';
import PersonalPlano, { IPersonalPlano } from '../models/PersonalPlano.js';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Aluno from '../models/Aluno.js';

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
     * Retorna a quantidade de tokens avulsos ativos
     */
    async getTokensAvulsosAtivos(personalTrainerId: string): Promise<number> {
        try {
            if (!personalTrainerId) {
                console.warn('⚠️  Personal trainer ID não fornecido para busca de tokens');
                return 0;
            }

            // Debug: log the search criteria
            const now = new Date();
            console.log(`🔍 Buscando tokens para personalTrainerId: ${personalTrainerId}`);
            console.log(`🔍 Data atual: ${now.toISOString()}`);

            const tokens = await TokenAvulso.find({
                personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now }
            });

            console.log(`🔍 Tokens encontrados: ${tokens.length}`);
            tokens.forEach((token, index) => {
                console.log(`🔍 Token ${index + 1}: quantidade=${token.quantidade}, vencimento=${token.dataVencimento?.toISOString()}, ativo=${token.ativo}`);
            });

            const total = tokens.reduce((total, token) => total + (token.quantidade || 0), 0);
            console.log(`🔍 Total de tokens ativos: ${total}`);
            return total;
        } catch (error) {
            console.error('❌ Erro ao buscar tokens avulsos ativos:', error);
            return 0;
        }
    }

    /**
     * Busca o plano atual do personal trainer
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
            if (!personalTrainerId) {
                throw new Error('Personal trainer ID é obrigatório');
            }
            
            const trainerObjectId = new mongoose.Types.ObjectId(personalTrainerId);

            const [personalPlanoAtivo, tokensAtivos] = await Promise.all([
                PersonalPlano.findOne({
                    personalTrainerId: trainerObjectId,
                    ativo: true,
                    dataVencimento: { $gt: new Date() }
                }).populate('planoId').sort({ dataInicio: -1 }).lean(),
                this.getTokensAvulsosAtivos(personalTrainerId)
            ]);
            
            let personalPlanoExpirado = null;
            if (!personalPlanoAtivo) {
                personalPlanoExpirado = await PersonalPlano.findOne({
                    personalTrainerId: trainerObjectId,
                    ativo: true,
                }).populate('planoId').sort({ dataVencimento: -1 }).lean();
            }

            const currentPersonalPlano = personalPlanoAtivo || personalPlanoExpirado;
            
            const plano: IPlano | null =
                currentPersonalPlano &&
                currentPersonalPlano.planoId &&
                typeof currentPersonalPlano.planoId === 'object' &&
                'nome' in (currentPersonalPlano.planoId as any)
                    ? (currentPersonalPlano.planoId as unknown as IPlano)
                    : null;

            const isExpired = !personalPlanoAtivo && !!personalPlanoExpirado;

            const limiteBaseDoPlano = !isExpired && plano ? plano.limiteAlunos : 0;
            const limiteAtual = limiteBaseDoPlano + tokensAtivos;

            // <<< INÍCIO DA ALTERAÇÃO CRÍTICA >>>
            // Contagem de alunos agora se baseia em quem tem um slot VÁLIDO do plano ATUAL,
            // independentemente do status ('active' ou 'inactive') do aluno.
            let alunosAtivos = 0;
            if (personalPlanoAtivo) {
                alunosAtivos = await Aluno.countDocuments({
                    trainerId: trainerObjectId,
                    slotId: personalPlanoAtivo._id
                });
            }
            // <<< FIM DA ALTERAÇÃO CRÍTICA >>>

            const result = {
                plano: plano,
                personalPlano: currentPersonalPlano,
                limiteAtual,
                alunosAtivos,
                tokensAvulsos: tokensAtivos,
                isExpired,
                ...(isExpired && { expiredPlan: { plano, personalPlano: personalPlanoExpirado } })
            };

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
            if (existingPlansCount > 0 && existingPlansCount === INITIAL_PLANS.length) {
                return true;
            }

            for (const planData of INITIAL_PLANS) {
                await Plano.findOneAndUpdate({ nome: planData.nome }, planData, { upsert: true, new: true });
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
                { $set: { ativo: false } }
            ),
            TokenAvulso.updateMany(
                { dataVencimento: { $lt: now }, ativo: true },
                { $set: { ativo: false } }
            )
        ]);

        return {
            plansDeactivated: plansResult.modifiedCount,
            tokensDeactivated: tokensResult.modifiedCount
        };
    }
}

export default new PlanoService();