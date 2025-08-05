// server/services/PlanoService.ts
import Plano, { IPlano } from '../models/Plano.js';
import PersonalPlano, { IPersonalPlano } from '../models/PersonalPlano.js';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

// Initial plans configuration
const INITIAL_PLANS = [
    {
        nome: 'Free',
        descricao: 'Plano gratuito por 7 dias com 1 aluno ativo',
        limiteAlunos: 1,
        preco: 0,
        duracao: 7, // 7 days
        tipo: 'free' as const,
        ativo: true
    },
    {
        nome: 'Start',
        descricao: 'Plano inicial para até 5 alunos ativos',
        limiteAlunos: 5,
        preco: 29.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Pro',
        descricao: 'Plano profissional para até 10 alunos ativos',
        limiteAlunos: 10,
        preco: 49.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Elite',
        descricao: 'Plano elite para até 20 alunos ativos',
        limiteAlunos: 20,
        preco: 79.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Master',
        descricao: 'Plano master para até 50 alunos ativos',
        limiteAlunos: 50,
        preco: 129.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    }
];

export class PlanoService {
    /**
     * Get current active plan for a personal trainer
     * Enhanced to also return expired plan information for admin visibility
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
            // Validate input
            if (!personalTrainerId) {
                throw new Error('Personal trainer ID é obrigatório');
            }

            // First, try to find an active plan
            const personalPlanoAtivo = await PersonalPlano.findOne({
                personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).populate({
                path: 'planoId',
                model: 'Plano'
            }).sort({ dataInicio: -1 });

            // If no active plan, look for the most recent expired plan
            let personalPlanoExpirado = null;
            if (!personalPlanoAtivo) {
                personalPlanoExpirado = await PersonalPlano.findOne({
                    personalTrainerId,
                    ativo: true, // Still marked as active but expired by date
                    dataVencimento: { $lte: new Date() }
                }).populate({
                    path: 'planoId',
                    model: 'Plano'
                }).sort({ dataVencimento: -1 }); // Most recent expired plan
            }

            // --- DIAGNOSTIC LOG ---
            console.log(`[PlanoService] personalPlanoAtivo para ${personalTrainerId}:`, personalPlanoAtivo);
            console.log(`[PlanoService] personalPlanoExpirado para ${personalTrainerId}:`, personalPlanoExpirado);
            if ((personalPlanoAtivo || personalPlanoExpirado)?.planoId) {
                const planoRef = (personalPlanoAtivo || personalPlanoExpirado)?.planoId;
                console.log(`[PlanoService] Populated planoId type: ${typeof planoRef}`);
                console.log(`[PlanoService] Populated planoId content:`, planoRef);
            }
            // --- END DIAGNOSTIC LOG ---

            const alunosAtivos = await Aluno.countDocuments({
                trainerId: personalTrainerId,
                status: 'active'
            });

            const tokensAtivos = await this.getTokensAvulsosAtivos(personalTrainerId);
            
            let limiteAtual = 0;
            let plano: IPlano | null = null;
            let personalPlano: IPersonalPlano | null = null;
            let isExpired = false;

            // Determine which plan to use for current status
            const currentPersonalPlano = personalPlanoAtivo || personalPlanoExpirado;
            
            if (currentPersonalPlano && currentPersonalPlano.planoId && typeof currentPersonalPlano.planoId === 'object' && 'nome' in currentPersonalPlano.planoId) {
                plano = currentPersonalPlano.planoId as unknown as IPlano;
                personalPlano = currentPersonalPlano;
                
                // For active plans, use full limit. For expired plans, limit is 0
                if (personalPlanoAtivo) {
                    limiteAtual = plano.limiteAlunos || 0;
                } else {
                    // Plan is expired - no student limit from base plan
                    limiteAtual = 0;
                    isExpired = true;
                }
            } else {
                console.log(`❌ No plan document found (active or expired) for personal ${personalTrainerId}`);
            }

            // Always add active tokens to limit (even if base plan is expired)
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

            // Include expired plan info if we have one but no active plan
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
     * Check if personal trainer can activate more students
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
     * Get active tokens for a personal trainer
     */
    async getTokensAvulsosAtivos(personalTrainerId: string): Promise<number> {
        try {
            // Validate input
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
            
            if (total > 0) {
                console.log(`✅ Encontrados ${total} tokens ativos para personal ${personalTrainerId}`);
            }
            
            return total;
        } catch (error) {
            console.error('❌ Erro ao buscar tokens avulsos ativos:', error);
            return 0; // Return 0 instead of throwing to prevent cascade failures
        }
    }

    /**
     * Assign a plan to a personal trainer
     */
    async assignPlanToPersonal(
        personalTrainerId: string,
        planoId: string,
        adminId: string,
        customDuration?: number,
        motivo?: string
    ): Promise<IPersonalPlano> {
        // Import PersonalTrainer model
        const PersonalTrainer = (await import('../models/PersonalTrainer.js')).default;
        
        // Deactivate current plan
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
            atribuidoPorAdmin: adminId,
            motivoAtribuicao: motivo,
            ativo: true
        });

        // Save the PersonalPlano first
        const savedPersonalPlano = await personalPlano.save();

        // Update PersonalTrainer model fields to keep them synchronized
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
     * Add tokens to a personal trainer
     */
    async addTokensToPersonal(
        personalTrainerId: string,
        quantidade: number,
        adminId: string,
        customDays?: number,
        motivo?: string
    ): Promise<ITokenAvulso> {
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + (customDays || 30)); // Default 30 days

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
     * Ensure initial plans exist in database
     */
    async ensureInitialPlansExist(): Promise<boolean> {
        try {
            console.log('🔍 Verificando se planos iniciais existem...');
            
            const existingPlansCount = await Plano.countDocuments({ ativo: true });
            
            if (existingPlansCount > 0) {
                console.log(`ℹ️  Encontrados ${existingPlansCount} planos existentes.`);
                return true;
            }

            console.log('📝 Criando planos iniciais...');
            
            const createdPlans = [];
            for (const planData of INITIAL_PLANS) {
                try {
                    const existingPlan = await Plano.findOne({ nome: planData.nome });
                    
                    if (existingPlan) {
                        console.log(`✅ Plano '${planData.nome}' já existe.`);
                    } else {
                        const newPlan = new Plano(planData);
                        await newPlan.save();
                        createdPlans.push(newPlan);
                        console.log(`✅ Plano '${planData.nome}' criado com sucesso.`);
                    }
                } catch (error) {
                    console.error(`❌ Erro ao criar plano '${planData.nome}':`, error);
                }
            }

            if (createdPlans.length > 0) {
                console.log(`🎉 ${createdPlans.length} planos iniciais criados com sucesso!`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar/criar planos iniciais:', error);
            return false;
        }
    }

    /**
     * Get all plans - ensures plans exist first
     */
    async getAllPlans(): Promise<IPlano[]> {
        try {
            // First ensure plans exist
            await this.ensureInitialPlansExist();
            
            const plans = await Plano.find({ ativo: true }).sort({ preco: 1 });
            
            if (plans.length === 0) {
                console.warn('⚠️  Nenhum plano encontrado após verificação inicial!');
            }
            
            return plans;
        } catch (error) {
            console.error('❌ Erro ao buscar planos:', error);
            throw error;
        }
    }

    /**
     * Create or update a plan
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
     * Get detailed tokens for admin view (active + recently expired for audit)
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
                // Active tokens (not expired)
                TokenAvulso.find({
                    personalTrainerId,
                    ativo: true,
                    dataVencimento: { $gt: now }
                }).populate('adicionadoPorAdmin', 'nome').sort({ dataVencimento: 1 }),
                
                // Recently expired tokens (for audit trail) - last 30 days
                TokenAvulso.find({
                    personalTrainerId,
                    ativo: true,
                    dataVencimento: { $lte: now, $gte: thirtyDaysAgo }
                }).populate('adicionadoPorAdmin', 'nome').sort({ dataVencimento: -1 })
            ]);

            const totalActiveQuantity = activeTokens.reduce((sum, token) => sum + token.quantidade, 0);

            console.log(`📊 Tokens detalhados para ${personalTrainerId}: ${activeTokens.length} ativos, ${expiredTokens.length} expirados recentes`);

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
     * Get personal trainer status for admin view
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
            personalInfo: null, // Will be populated by the controller
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
     * Remove current active plan from personal trainer
     */
    async removePersonalPlan(personalTrainerId: string, removedByAdminId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Validate input
            if (!personalTrainerId) {
                throw new Error('Personal trainer ID é obrigatório');
            }
            
            if (!removedByAdminId) {
                throw new Error('Admin ID é obrigatório');
            }

            // Find current active plan
            const currentPlan = await PersonalPlano.findOne({
                personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).populate('planoId', 'nome');

            if (!currentPlan) {
                return {
                    success: false,
                    message: 'Nenhum plano ativo encontrado para este personal trainer'
                };
            }

            // Deactivate the plan
            currentPlan.ativo = false;
            await currentPlan.save();

            // Clear the PersonalTrainer model fields to ensure UI reflects no plan status
            const PersonalTrainer = (await import('../models/PersonalTrainer.js')).default;
            await PersonalTrainer.findByIdAndUpdate(personalTrainerId, {
                planoId: null,
                statusAssinatura: 'sem_assinatura',
                dataInicioAssinatura: null,
                dataFimAssinatura: null,
                limiteAlunos: 0
            });

            console.log(`✅ Plano removido: ${(currentPlan.planoId as any)?.nome} do personal ${personalTrainerId} por admin ${removedByAdminId}`);

            return {
                success: true,
                message: `Plano ${(currentPlan.planoId as any)?.nome} removido com sucesso`
            };
        } catch (error) {
            console.error('❌ Erro ao remover plano:', error);
            throw error;
        }
    }

    /**
     * Delete specific token
     */
    async deletePersonalToken(personalTrainerId: string, tokenId: string, deletedByAdminId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Validate input
            if (!personalTrainerId || !tokenId) {
                throw new Error('Personal trainer ID e Token ID são obrigatórios');
            }
            
            if (!deletedByAdminId) {
                throw new Error('Admin ID é obrigatório');
            }

            // Find the specific token
            const token = await TokenAvulso.findOne({
                _id: tokenId,
                personalTrainerId,
                ativo: true
            });

            if (!token) {
                return {
                    success: false,
                    message: 'Token não encontrado ou já foi removido'
                };
            }

            // Deactivate the token (soft delete to maintain history)
            token.ativo = false;
            await token.save();

            console.log(`✅ Token removido: ${token.quantidade} token(s) do personal ${personalTrainerId} por admin ${deletedByAdminId}`);

            return {
                success: true,
                message: `Token de ${token.quantidade} unidade(s) removido com sucesso`
            };
        } catch (error) {
            console.error('❌ Erro ao remover token:', error);
            throw error;
        }
    }

    /**
     * Cleanup expired plans and tokens
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
