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

            console.log(`[PlanoService] 🎯 Starting plan calculation for personal: ${personalTrainerId}`);

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

            // --- ENHANCED DIAGNOSTIC LOG ---
            console.log(`[PlanoService] 📋 Plan query results:`, {
                personalId: personalTrainerId,
                activeFound: !!personalPlanoAtivo,
                activePlanId: personalPlanoAtivo?.planoId,
                expiredFound: !!personalPlanoExpirado,
                expiredPlanId: personalPlanoExpirado?.planoId,
                timestamp: new Date().toISOString()
            });
            
            if (personalPlanoAtivo?.planoId) {
                console.log(`[PlanoService] 📝 Active plan details:`, {
                    planoId: personalPlanoAtivo.planoId,
                    planoType: typeof personalPlanoAtivo.planoId,
                    planoData: personalPlanoAtivo.planoId
                });
            }
            
            if (personalPlanoExpirado?.planoId) {
                console.log(`[PlanoService] 📝 Expired plan details:`, {
                    planoId: personalPlanoExpirado.planoId,
                    planoType: typeof personalPlanoExpirado.planoId,
                    planoData: personalPlanoExpirado.planoId
                });
            }
            // --- END ENHANCED DIAGNOSTIC LOG ---

            const alunosAtivos = await Aluno.countDocuments({
                trainerId: personalTrainerId,
                status: 'active'
            });
            console.log(`[PlanoService] 👥 Active students count: ${alunosAtivos}`);

            const tokensAtivos = await this.getTokensAvulsosAtivos(personalTrainerId);
            console.log(`[PlanoService] 🎫 Active tokens count: ${tokensAtivos}`);
            
            let limiteAtual = 0;
            let plano: IPlano | null = null;
            let personalPlano: IPersonalPlano | null = null;
            let isExpired = false;

            // Determine which plan to use for current status
            const currentPersonalPlano = personalPlanoAtivo || personalPlanoExpirado;
            
            if (currentPersonalPlano && currentPersonalPlano.planoId && typeof currentPersonalPlano.planoId === 'object' && 'nome' in currentPersonalPlano.planoId) {
                plano = currentPersonalPlano.planoId as unknown as IPlano;
                personalPlano = currentPersonalPlano;
                
                console.log(`[PlanoService] 📊 Using plan: ${plano.nome} (limit: ${plano.limiteAlunos})`);
                
                // For active plans, use full limit. For expired plans, limit is 0
                if (personalPlanoAtivo) {
                    limiteAtual = plano.limiteAlunos || 0;
                    console.log(`[PlanoService] ✅ Plan is active, using plan limit: ${limiteAtual}`);
                } else {
                    // Plan is expired - no student limit from base plan
                    limiteAtual = 0;
                    isExpired = true;
                    console.log(`[PlanoService] ⚠️ Plan is expired, plan limit set to 0`);
                }
            } else {
                console.log(`[PlanoService] ❌ No plan document found (active or expired) for personal ${personalTrainerId}`);
            }

            // Get token information for proper calculation
            const TokenAssignmentService = (await import('./TokenAssignmentService.js')).default;
            const tokenAssignmentStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
            
            // Always add total valid tokens to limit (even if base plan is expired)
            // This includes both available and consumed tokens for display purposes
            const oldLimit = limiteAtual;
            limiteAtual += tokenAssignmentStatus.totalTokens;
            console.log(`[PlanoService] 🧮 Final calculation: ${oldLimit} (plan) + ${tokenAssignmentStatus.totalTokens} (total tokens) = ${limiteAtual} (total limit)`);
            console.log(`[PlanoService] 🎫 Token breakdown: ${tokenAssignmentStatus.availableTokens} available + ${tokenAssignmentStatus.consumedTokens} consumed = ${tokenAssignmentStatus.totalTokens} total`);

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
                tokensAvulsos: tokenAssignmentStatus.availableTokens, // Use available tokens for backward compatibility
                isExpired
            };

            // Include expired plan info if we have one but no active plan
            if (personalPlanoExpirado && !personalPlanoAtivo) {
                result.expiredPlan = {
                    plano: plano,
                    personalPlano: personalPlanoExpirado
                };
            }

            console.log(`[PlanoService] 🎯 Final result summary:`, {
                personalId: personalTrainerId,
                totalLimit: result.limiteAtual,
                activeStudents: result.alunosAtivos,
                tokensAvulsos: result.tokensAvulsos,
                isExpired: result.isExpired,
                planName: result.plano?.nome,
                availableSlots: result.limiteAtual - result.alunosAtivos
            });

            return result;
        } catch (error) {
            console.error('❌ Erro ao buscar plano atual do personal:', error);
            throw error;
        }
    }

    /**
     * Check if personal trainer can activate more students
     * Updated to properly account for permanently assigned tokens
     */
    async canActivateMoreStudents(personalTrainerId: string, quantidadeDesejada: number = 1): Promise<{
        canActivate: boolean;
        currentLimit: number;
        activeStudents: number;
        availableSlots: number;
    }> {
        const status = await this.getPersonalCurrentPlan(personalTrainerId);
        
        // Import TokenAssignmentService to get accurate token counts
        const TokenAssignmentService = (await import('./TokenAssignmentService.js')).default;
        const tokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        
        console.log(`[PlanoService.canActivateMoreStudents] 📊 Calculating slots for ${personalTrainerId}:`, {
            planLimit: status.plano?.limiteAlunos || 0,
            activeStudents: status.alunosAtivos,
            availableTokens: tokenStatus.availableTokens,
            consumedTokens: tokenStatus.consumedTokens,
            totalTokens: tokenStatus.totalTokens,
            oldLimitCalculation: status.limiteAtual
        });
        
        // CORRECTED LOGIC: Available slots = only unassigned tokens (plan slots are irrelevant with permanent token assignment)
        const planLimit = status.plano?.limiteAlunos || 0;
        const isExpired = status.isExpired;
        
        // Get all students for this personal trainer to count token-based vs plan-based students
        const Aluno = (await import('../models/Aluno.js')).default;
        const allStudents = await Aluno.find({ trainerId: personalTrainerId });
        
        // Count students with assigned tokens (these are "token-based" students regardless of status)
        let tokenBasedActiveStudents = 0;
        let tokenBasedInactiveStudents = 0;
        let planBasedActiveStudents = 0;
        let planBasedInactiveStudents = 0;
        
        for (const student of allStudents) {
            const studentToken = await TokenAssignmentService.getStudentAssignedToken((student._id as mongoose.Types.ObjectId).toString());
            if (studentToken) {
                // This student has a token (regardless of status)
                if (student.status === 'active') {
                    tokenBasedActiveStudents++;
                } else {
                    tokenBasedInactiveStudents++;
                }
            } else {
                // This student does NOT have a token (plan-based)
                if (student.status === 'active') {
                    planBasedActiveStudents++;
                } else {
                    planBasedInactiveStudents++;
                }
            }
        }
        
        // CRITICAL: Plan-based active students should NOT include ANY students with tokens
        // This ensures that deactivating a token-based student doesn't free up plan slots
        
        console.log(`[PlanoService.canActivateMoreStudents] 🧮 FIXED student breakdown:`, {
            totalActiveStudents: status.alunosAtivos,
            tokenBasedActiveStudents,
            tokenBasedInactiveStudents,
            planBasedActiveStudents,
            planBasedInactiveStudents,
            totalStudentsWithTokens: tokenBasedActiveStudents + tokenBasedInactiveStudents,
            totalPlanBasedStudents: planBasedActiveStudents + planBasedInactiveStudents,
            verification: {
                activeStudentsMatch: status.alunosAtivos === (tokenBasedActiveStudents + planBasedActiveStudents),
                totalStudentsMatch: allStudents.length === (tokenBasedActiveStudents + tokenBasedInactiveStudents + planBasedActiveStudents + planBasedInactiveStudents)
            }
        });
        
        // Calculate available slots
        // 1. Plan-based slots: plan limit minus ALL plan-based students (active + inactive) - PERMANENT CONSUMPTION
        const totalPlanBasedStudents = planBasedActiveStudents + planBasedInactiveStudents;
        const planBasedSlots = isExpired ? 0 : Math.max(0, planLimit - totalPlanBasedStudents);
        
        // 2. Token-based slots: only unassigned tokens (permanently assigned tokens don't free up)
        const tokenBasedSlots = tokenStatus.availableTokens;
        
        const availableSlots = planBasedSlots + tokenBasedSlots;
        
        // Current limit includes all valid capacity (plan + all valid tokens)
        const currentLimit = planLimit + tokenStatus.totalTokens;
        
        console.log(`[PlanoService.canActivateMoreStudents] 🧮 CRITICAL FIX: Plan slots now permanently consumed like tokens:`, {
            planLimit,
            isExpired,
            activeStudents: status.alunosAtivos,
            planBasedActiveStudents,
            planBasedInactiveStudents,
            totalPlanBasedStudents,
            tokenBasedActiveStudents,
            tokenBasedInactiveStudents,
            planBasedSlots: planBasedSlots,
            tokenBasedSlots: tokenBasedSlots,
            totalAvailableSlots: availableSlots,
            currentLimit,
            canActivate: availableSlots >= quantidadeDesejada,
            criticalFix: "PERMANENT PLAN CONSUMPTION: Plan slots permanently consumed by ALL plan-based students (active + inactive), matching token behavior"
        });
        
        return {
            canActivate: availableSlots >= quantidadeDesejada,
            currentLimit,
            activeStudents: status.alunosAtivos,
            availableSlots
        };
    }

    /**
     * Get available (unassigned) tokens for a personal trainer
     * Updated to use new token assignment logic
     */
    async getTokensAvulsosAtivos(personalTrainerId: string): Promise<number> {
        try {
            // Import the new TokenAssignmentService
            const TokenAssignmentService = (await import('./TokenAssignmentService.js')).default;
            
            // Use the new service to get available tokens count
            const availableTokens = await TokenAssignmentService.getAvailableTokensCount(personalTrainerId);
            console.log(`[PlanoService] 💯 Available (unassigned) tokens for ${personalTrainerId}: ${availableTokens}`);
            
            return availableTokens;
        } catch (error) {
            console.error('❌ Erro ao buscar tokens avulsos ativos:', error);
            return 0; // Return 0 instead of throwing to prevent cascade failures
        }
    }

    /**
     * Assign a plan to a personal trainer with transition logic
     */
    async assignPlanToPersonal(
        personalTrainerId: string,
        planoId: string,
        adminId: string,
        customDuration?: number,
        motivo?: string
    ): Promise<IPersonalPlano> {
        // Import PersonalTrainer model and PlanTransitionService
        const PersonalTrainer = (await import('../models/PersonalTrainer.js')).default;
        const PlanTransitionService = (await import('./PlanTransitionService.js')).default;
        
        console.log(`[PlanoService] 🚀 Assigning plan ${planoId} to personal ${personalTrainerId}`);
        
        // Process plan transition first (this handles student reactivation logic)
        const transitionResult = await PlanTransitionService.processPlanTransition(
            personalTrainerId,
            planoId
        );
        
        console.log(`[PlanoService] 📊 Transition result:`, transitionResult);
        
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

        console.log(`[PlanoService] ✅ Plan assigned successfully. Transition: ${transitionResult.transitionType}, Students reactivated: ${transitionResult.studentsReactivated}`);
        
        // Return enhanced result with transition info
        (savedPersonalPlano as any).transitionResult = transitionResult;

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
