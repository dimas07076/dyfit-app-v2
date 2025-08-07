// server/services/StudentResourceValidationService.ts
import PlanoService from './PlanoService.js';
import TokenAssignmentService, { getTokenExpirationDate } from './TokenAssignmentService.js';
import mongoose from 'mongoose';

export interface ResourceValidationResult {
    isValid: boolean;
    message: string;
    errorCode: string;
    resourceType: 'plan' | 'token' | 'none';
    status: {
        currentLimit: number;
        activeStudents: number;
        availableSlots: number;
        planInfo: {
            plano: any;
            personalPlano: any;
            planSlots: number;
            planSlotsUsed: number;
            planSlotsAvailable: number;
            isExpired: boolean;
        } | null;
        tokenInfo: {
            availableTokens: number;
            consumedTokens: number;
            totalTokens: number;
        };
        recommendations: string[];
    };
}

export interface ResourceAssignmentResult {
    success: boolean;
    message: string;
    resourceType: 'plan' | 'token';
    assignedResourceId?: string;
}

/**
 * Unified service for validating and assigning student resources (plans and tokens)
 * Implements the priority logic: active plans first, then tokens
 * Maintains permanent resource consumption pattern from Etapa 1
 */
export class StudentResourceValidationService {
    
    /**
     * Validate if personal trainer can create/activate students
     * Implements unified logic for plans and tokens with proper priority
     */
    async validateStudentCreation(
        personalTrainerId: string,
        quantityRequested: number = 1
    ): Promise<ResourceValidationResult> {
        try {
            console.log(`[StudentResourceValidation] 🎯 Validating creation of ${quantityRequested} student(s) for personal ${personalTrainerId}`);

            // Get current plan status
            const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
            
            // Get token assignment status
            const tokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);

            // Get detailed breakdown using PlanoService logic
            const canActivateStatus = await PlanoService.canActivateMoreStudents(personalTrainerId, quantityRequested);

            console.log(`[StudentResourceValidation] 📊 Current status:`, {
                planLimit: planStatus.plano?.limiteAlunos || 0,
                planExpired: planStatus.isExpired,
                activeStudents: planStatus.alunosAtivos,
                availableTokens: tokenStatus.availableTokens,
                canActivate: canActivateStatus.canActivate,
                availableSlots: canActivateStatus.availableSlots
            });

            // Calculate plan-based and token-based availability
            const planLimit = planStatus.plano?.limiteAlunos || 0;
            const isExpired = planStatus.isExpired;
            
            // Get student breakdown (plan-based vs token-based)
            const studentBreakdown = await this.getStudentResourceBreakdown(personalTrainerId);
            
            // Calculate available plan slots (only if plan is active)
            const planSlotsUsed = studentBreakdown.planBasedStudents;
            const planSlotsAvailable = isExpired ? 0 : Math.max(0, planLimit - planSlotsUsed);
            
            // Token slots are always the available unassigned tokens
            const tokenSlotsAvailable = tokenStatus.availableTokens;
            
            const totalAvailableSlots = planSlotsAvailable + tokenSlotsAvailable;

            console.log(`[StudentResourceValidation] 🧮 Resource breakdown:`, {
                planSlotsAvailable,
                tokenSlotsAvailable,
                totalAvailableSlots,
                quantityRequested,
                canFulfillRequest: totalAvailableSlots >= quantityRequested
            });

            // Determine which resource type would be used
            let resourceType: 'plan' | 'token' | 'none' = 'none';
            if (totalAvailableSlots >= quantityRequested) {
                if (planSlotsAvailable >= quantityRequested) {
                    resourceType = 'plan';
                } else if (tokenSlotsAvailable >= (quantityRequested - planSlotsAvailable)) {
                    resourceType = planSlotsAvailable > 0 ? 'plan' : 'token'; // Mixed or token-only
                }
            }

            // Generate recommendations
            const recommendations = this.generateRecommendations(
                planStatus,
                tokenStatus,
                totalAvailableSlots,
                quantityRequested
            );

            // Generate message
            let message = '';
            let errorCode = 'SUCCESS';
            let isValid = true;

            if (totalAvailableSlots < quantityRequested) {
                isValid = false;
                errorCode = 'INSUFFICIENT_RESOURCES';
                
                if (totalAvailableSlots === 0) {
                    message = 'Você não possui recursos disponíveis para criar novos alunos. Contrate um plano ou adquira tokens.';
                } else {
                    message = `Recursos insuficientes. Você possui ${totalAvailableSlots} slot(s) disponível(eis), mas precisa de ${quantityRequested}.`;
                }
            } else {
                message = `Recursos suficientes disponíveis. ${totalAvailableSlots} slot(s) disponível(eis) para ${quantityRequested} aluno(s).`;
            }

            const result: ResourceValidationResult = {
                isValid,
                message,
                errorCode,
                resourceType,
                status: {
                    currentLimit: canActivateStatus.currentLimit,
                    activeStudents: canActivateStatus.activeStudents,
                    availableSlots: totalAvailableSlots,
                    planInfo: planStatus.plano ? {
                        plano: planStatus.plano,
                        personalPlano: planStatus.personalPlano,
                        planSlots: planLimit,
                        planSlotsUsed,
                        planSlotsAvailable,
                        isExpired
                    } : null,
                    tokenInfo: tokenStatus,
                    recommendations
                }
            };

            console.log(`[StudentResourceValidation] ✅ Validation complete:`, {
                isValid: result.isValid,
                resourceType: result.resourceType,
                availableSlots: result.status.availableSlots
            });

            return result;

        } catch (error) {
            console.error('[StudentResourceValidation] ❌ Error validating student creation:', error);
            
            return {
                isValid: false,
                message: 'Erro interno ao validar recursos disponíveis',
                errorCode: 'INTERNAL_ERROR',
                resourceType: 'none',
                status: {
                    currentLimit: 0,
                    activeStudents: 0,
                    availableSlots: 0,
                    planInfo: null,
                    tokenInfo: {
                        availableTokens: 0,
                        consumedTokens: 0,
                        totalTokens: 0
                    },
                    recommendations: ['Tente novamente ou entre em contato com o suporte']
                }
            };
        }
    }

    /**
     * Assign appropriate resource to a student after creation/activation
     * Implements priority: plan slots first, then tokens
     */
    async assignResourceToStudent(
        personalTrainerId: string,
        studentId: string
    ): Promise<ResourceAssignmentResult> {
        try {
            console.log(`[StudentResourceValidation] 🔗 Assigning resource to student ${studentId} for personal ${personalTrainerId}`);

            // First validate that resources are available
            const validation = await this.validateStudentCreation(personalTrainerId, 1);
            
            if (!validation.isValid) {
                return {
                    success: false,
                    message: validation.message,
                    resourceType: 'token' // Default for error cases
                };
            }

            // Check if student already has a resource assigned (for reactivation)
            const existingToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            if (existingToken && getTokenExpirationDate(existingToken) > new Date()) {
                console.log(`[StudentResourceValidation] ♻️ Student ${studentId} already has valid token, no new assignment needed`);
                return {
                    success: true,
                    message: 'Student already has valid token assigned',
                    resourceType: 'token',
                    assignedResourceId: existingToken._id?.toString()
                };
            }

            // Determine resource assignment based on availability and priority
            const planInfo = validation.status.planInfo;
            
            if (planInfo && planInfo.planSlotsAvailable > 0 && !planInfo.isExpired) {
                // Use plan slot - no additional tracking needed as PlanoService logic handles this
                console.log(`[StudentResourceValidation] 📋 Using plan slot for student ${studentId}`);
                return {
                    success: true,
                    message: 'Plan slot assigned to student',
                    resourceType: 'plan',
                    assignedResourceId: planInfo.personalPlano?._id?.toString()
                };
            } else if (validation.status.tokenInfo.availableTokens > 0) {
                // Use token - assign token to student
                console.log(`[StudentResourceValidation] 🎫 Using token for student ${studentId}`);
                
                const tokenAssignment = await TokenAssignmentService.assignTokenToStudent(
                    personalTrainerId,
                    studentId,
                    1
                );

                if (tokenAssignment.success) {
                    return {
                        success: true,
                        message: 'Token assigned to student',
                        resourceType: 'token',
                        assignedResourceId: tokenAssignment.assignedToken?._id?.toString()
                    };
                } else {
                    return {
                        success: false,
                        message: tokenAssignment.message,
                        resourceType: 'token'
                    };
                }
            } else {
                return {
                    success: false,
                    message: 'No resources available for assignment',
                    resourceType: 'token'
                };
            }

        } catch (error) {
            console.error('[StudentResourceValidation] ❌ Error assigning resource:', error);
            return {
                success: false,
                message: 'Erro interno ao atribuir recurso',
                resourceType: 'token'
            };
        }
    }

    /**
     * Get breakdown of students by resource type (plan-based vs token-based)
     */
    private async getStudentResourceBreakdown(personalTrainerId: string): Promise<{
        planBasedStudents: number;
        tokenBasedStudents: number;
        totalStudents: number;
    }> {
        try {
            const Aluno = (await import('../models/Aluno.js')).default;
            const allStudents = await Aluno.find({ trainerId: personalTrainerId });
            
            let planBasedStudents = 0;
            let tokenBasedStudents = 0;

            for (const student of allStudents) {
                try {
                    const studentToken = await TokenAssignmentService.getStudentAssignedToken(
                        (student._id as mongoose.Types.ObjectId).toString()
                    );
                    
                    if (studentToken) {
                        tokenBasedStudents++;
                    } else {
                        planBasedStudents++;
                    }
                } catch (error) {
                    console.error(`[StudentResourceValidation] ❌ Error checking token for student ${student._id}:`, error);
                    // If there's an error checking the token, assume it's plan-based to prevent failures
                    planBasedStudents++;
                }
            }

            console.log(`[StudentResourceValidation] 📊 Student breakdown for ${personalTrainerId}:`, {
                planBasedStudents,
                tokenBasedStudents,
                totalStudents: allStudents.length
            });

            return {
                planBasedStudents,
                tokenBasedStudents,
                totalStudents: allStudents.length
            };

        } catch (error) {
            console.error('[StudentResourceValidation] ❌ Error getting student breakdown:', error);
            return {
                planBasedStudents: 0,
                tokenBasedStudents: 0,
                totalStudents: 0
            };
        }
    }

    /**
     * Generate recommendations based on current resource status
     */
    private generateRecommendations(
        planStatus: any,
        tokenStatus: any,
        availableSlots: number,
        quantityRequested: number
    ): string[] {
        const recommendations: string[] = [];

        if (availableSlots < quantityRequested) {
            if (!planStatus.plano || planStatus.isExpired) {
                recommendations.push('Contrate um plano para ter acesso a slots de alunos');
                recommendations.push('Adquira tokens avulsos entrando em contato com o Suporte DyFit');
            } else if (planStatus.plano.limiteAlunos < 20) { // Arbitrary threshold for upgrade recommendation
                recommendations.push('Faça upgrade do seu plano para mais slots de alunos');
                recommendations.push('Adquira tokens avulsos para capacidade adicional');
            } else {
                recommendations.push('Adquira tokens avulsos para capacidade adicional');
            }
        } else if (availableSlots < 5) { // Low availability warning
            recommendations.push('Poucos slots disponíveis - considere planejar expansão');
            if (!planStatus.plano || planStatus.isExpired) {
                recommendations.push('Contrate um plano para ter base sólida de alunos');
            }
        }

        return recommendations;
    }

    /**
     * Validate if personal trainer can send invites
     * Uses same logic as student creation validation
     */
    async validateSendInvite(personalTrainerId: string): Promise<ResourceValidationResult> {
        return this.validateStudentCreation(personalTrainerId, 1);
    }
}

export default new StudentResourceValidationService();