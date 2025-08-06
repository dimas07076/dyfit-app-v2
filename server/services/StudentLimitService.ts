// server/services/StudentLimitService.ts
import PlanoService from './PlanoService.js';
import Aluno from '../models/Aluno.js';

export interface StudentLimitStatus {
    canActivate: boolean;
    currentLimit: number;
    activeStudents: number;
    availableSlots: number;
    planInfo: {
        plano: any;
        personalPlano: any;
        tokensAvulsos: number;
        isExpired: boolean;
    } | null;
    tokenInfo: {
        availableTokens: number;
        consumedTokens: number;
        totalTokens: number;
    };
    limitExceeded: boolean;
    blockedActions: {
        canActivateStudents: boolean;
        canSendInvites: boolean;
    };
    message?: string;
    recommendations?: string[];
}

export interface StudentLimitValidation {
    isValid: boolean;
    message: string;
    errorCode: string;
    status: StudentLimitStatus;
}

export class StudentLimitService {
    /**
     * Get comprehensive student limit status for a personal trainer
     */
    async getStudentLimitStatus(personalTrainerId: string): Promise<StudentLimitStatus> {
        try {
            console.log(`[StudentLimitService] 🎯 Getting status for personal trainer: ${personalTrainerId}`);
            
            // Get current plan status from PlanoService
            const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
            console.log(`[StudentLimitService] 📊 Plan status:`, {
                limiteAtual: planStatus.limiteAtual,
                alunosAtivos: planStatus.alunosAtivos,
                tokensAvulsos: planStatus.tokensAvulsos,
                isExpired: planStatus.isExpired,
                planName: planStatus.plano?.nome,
                planLimit: planStatus.plano?.limiteAlunos
            });
            
            // Get token assignment details
            const TokenAssignmentService = (await import('./TokenAssignmentService.js')).default;
            const tokenAssignmentStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
            
            console.log(`[StudentLimitService] 🎫 Token assignment status:`, tokenAssignmentStatus);
            
            const canActivateStatus = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
            console.log(`[StudentLimitService] 🔍 Can activate status:`, canActivateStatus);

            const limitExceeded = !canActivateStatus.canActivate;
            console.log(`[StudentLimitService] 🚨 Limit exceeded: ${limitExceeded}`);
            
            // Debug breakdown
            const planLimit = planStatus.plano?.limiteAlunos || 0;
            const availableTokens = tokenAssignmentStatus.availableTokens; // Use available tokens from assignment service
            const totalLimit = planLimit + availableTokens; // Only count available tokens for limit
            const activeStudents = planStatus.alunosAtivos;
            const availableSlots = totalLimit - activeStudents;
            
            console.log(`[StudentLimitService] 🧮 Calculation breakdown:`, {
                planLimit,
                availableTokens,
                totalLimit,
                activeStudents,
                availableSlots: Math.max(0, availableSlots),
                shouldAllowActivation: availableSlots > 0,
                consumedTokens: tokenAssignmentStatus.consumedTokens,
                totalTokens: tokenAssignmentStatus.totalTokens
            });
            
            let message = '';
            const recommendations: string[] = [];

            if (limitExceeded) {
                if (planStatus.limiteAtual === 0) {
                    message = 'Você não possui um plano ativo ou tokens disponíveis. Não é possível ativar alunos.';
                    recommendations.push('Contrate um plano para começar a ativar alunos');
                    recommendations.push('Adquira tokens avulsos entrando em contato com o Suporte DyFit');
                } else {
                    message = `Limite de ${planStatus.limiteAtual} alunos ativos atingido. Você possui ${planStatus.alunosAtivos} alunos ativos.`;
                    recommendations.push('Faça upgrade do seu plano para mais slots');
                    recommendations.push('Adquira tokens avulsos entrando em contato com o Suporte DyFit');
                }
            } else {
                const availableSlots = canActivateStatus.availableSlots;
                if (availableSlots === 1) {
                    message = `Você pode ativar mais 1 aluno. ${planStatus.alunosAtivos}/${planStatus.limiteAtual} alunos ativos.`;
                } else {
                    message = `Você pode ativar mais ${availableSlots} alunos. ${planStatus.alunosAtivos}/${planStatus.limiteAtual} alunos ativos.`;
                }
            }

            const result = {
                canActivate: canActivateStatus.canActivate,
                currentLimit: canActivateStatus.currentLimit,
                activeStudents: canActivateStatus.activeStudents,
                availableSlots: canActivateStatus.availableSlots,
                planInfo: {
                    plano: planStatus.plano,
                    personalPlano: planStatus.personalPlano,
                    tokensAvulsos: planStatus.tokensAvulsos, // Keep this for backward compatibility
                    isExpired: planStatus.isExpired,
                },
                tokenInfo: {
                    availableTokens: tokenAssignmentStatus.availableTokens,
                    consumedTokens: tokenAssignmentStatus.consumedTokens,
                    totalTokens: tokenAssignmentStatus.totalTokens,
                },
                limitExceeded,
                blockedActions: {
                    canActivateStudents: canActivateStatus.canActivate,
                    canSendInvites: canActivateStatus.canActivate, // Same logic for now
                },
                message,
                recommendations: recommendations.length > 0 ? recommendations : undefined,
            };

            console.log(`[StudentLimitService] Final result:`, result);
            return result;
        } catch (error) {
            console.error('❌ Error getting student limit status:', error);
            
            // Return safe defaults on error
            return {
                canActivate: false,
                currentLimit: 0,
                activeStudents: 0,
                availableSlots: 0,
                planInfo: null,
                tokenInfo: {
                    availableTokens: 0,
                    consumedTokens: 0,
                    totalTokens: 0,
                },
                limitExceeded: true,
                blockedActions: {
                    canActivateStudents: false,
                    canSendInvites: false,
                },
                message: 'Erro ao verificar limite de alunos. Tente novamente.',
                recommendations: ['Verifique sua conexão e tente novamente'],
            };
        }
    }

    /**
     * Validate if personal trainer can activate specified number of students
     */
    async validateStudentActivation(
        personalTrainerId: string, 
        quantidadeDesejada: number = 1
    ): Promise<StudentLimitValidation> {
        try {
            const status = await this.getStudentLimitStatus(personalTrainerId);
            
            if (status.availableSlots >= quantidadeDesejada) {
                return {
                    isValid: true,
                    message: `Ativação permitida. ${quantidadeDesejada} slot(s) disponível(eis).`,
                    errorCode: 'SUCCESS',
                    status,
                };
            } else {
                return {
                    isValid: false,
                    message: status.message || 'Limite de alunos excedido',
                    errorCode: 'STUDENT_LIMIT_EXCEEDED',
                    status,
                };
            }
        } catch (error) {
            console.error('Error validating student activation:', error);
            const errorStatus = await this.getStudentLimitStatus(personalTrainerId);
            
            return {
                isValid: false,
                message: 'Erro interno ao validar limite de alunos',
                errorCode: 'INTERNAL_ERROR',
                status: errorStatus,
            };
        }
    }

    /**
     * Validate if personal trainer can send invites
     */
    async validateSendInvite(personalTrainerId: string): Promise<StudentLimitValidation> {
        // For now, invite validation uses the same logic as activation
        // In the future, this could have different logic (e.g., allow sending invites even if at limit)
        return this.validateStudentActivation(personalTrainerId, 1);
    }

    /**
     * Get detailed breakdown for admin/debug purposes
     */
    async getDetailedLimitBreakdown(personalTrainerId: string): Promise<{
        status: StudentLimitStatus;
        breakdown: {
            planLimit: number;
            tokensLimit: number;
            totalLimit: number;
            activeStudents: number;
            inactiveStudents: number;
            planDetails: any;
            tokenDetails: any;
        };
    }> {
        try {
            const status = await this.getStudentLimitStatus(personalTrainerId);
            const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
            
            // Get inactive students count
            const inactiveStudents = await Aluno.countDocuments({
                trainerId: personalTrainerId,
                status: 'inactive'
            });

            const planLimit = planStatus.plano?.limiteAlunos || 0;
            const tokensLimit = planStatus.tokensAvulsos || 0;

            return {
                status,
                breakdown: {
                    planLimit,
                    tokensLimit,
                    totalLimit: planLimit + tokensLimit,
                    activeStudents: status.activeStudents,
                    inactiveStudents,
                    planDetails: planStatus.plano,
                    tokenDetails: {
                        total: tokensLimit,
                        expired: planStatus.isExpired,
                    },
                },
            };
        } catch (error) {
            console.error('Error getting detailed limit breakdown:', error);
            throw error;
        }
    }
}

export default new StudentLimitService();