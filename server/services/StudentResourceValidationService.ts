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
                planName: planStatus.plano?.nome || 'No Plan',
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
                canFulfillRequest: totalAvailableSlots >= quantityRequested,
                tokenStatusDetails: {
                    availableTokens: tokenStatus.availableTokens,
                    consumedTokens: tokenStatus.consumedTokens,
                    totalTokens: tokenStatus.totalTokens
                }
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
            
            // CRITICAL FIX: Always create plan tokens for students activated using plan slots
            // This ensures consistent token display regardless of plan type (Free, Start, etc.)
            if (planInfo && planInfo.planSlotsAvailable > 0 && !planInfo.isExpired) {
                // Use plan slot - create a Token record with tipo: 'plano' for proper tracking and display
                console.log(`[StudentResourceValidation] 📋 CRITICAL FIX: Using plan slot for student ${studentId}, creating plan token for ${planInfo.plano?.nome || 'Unknown Plan'}`);
                
                const Token = (await import('../models/Token.js')).default;
                const mongoose = (await import('mongoose')).default;
                
                try {
                    // ENHANCED: Ensure all plan tokens are created with proper data
                    const planToken = new Token({
                        tipo: 'plano',
                        personalTrainerId: personalTrainerId,
                        alunoId: new mongoose.Types.ObjectId(studentId),
                        planoId: planInfo.personalPlano?._id,
                        dataExpiracao: planInfo.personalPlano?.dataVencimento,
                        ativo: true,
                        quantidade: 1,
                        dateAssigned: new Date(),
                        adicionadoPorAdmin: planInfo.personalPlano?.atribuidoPorAdmin || new mongoose.Types.ObjectId(personalTrainerId),
                        motivoAdicao: `Token de plano atribuído automaticamente - ${planInfo.plano?.nome || 'Plano'}`
                    });
                    
                    await planToken.save();
                    
                    console.log(`[StudentResourceValidation] ✅ CRITICAL FIX: Created plan token ${planToken.id} for student ${studentId} - Plan: ${planInfo.plano?.nome}, Expires: ${planInfo.personalPlano?.dataVencimento}`);
                    
                    return {
                        success: true,
                        message: `Plan token created and assigned to student - ${planInfo.plano?.nome}`,
                        resourceType: 'plan',
                        assignedResourceId: planToken.id
                    };
                } catch (tokenCreationError) {
                    console.error(`[StudentResourceValidation] ❌ CRITICAL ERROR: Failed to create plan token for student ${studentId}:`, tokenCreationError);
                    console.error(`[StudentResourceValidation] ❌ Plan info:`, {
                        planId: planInfo.personalPlano?._id,
                        planName: planInfo.plano?.nome,
                        expiration: planInfo.personalPlano?.dataVencimento,
                        personalTrainerId: personalTrainerId,
                        studentId: studentId
                    });
                    
                    // Fallback to traditional plan assignment without token creation
                    return {
                        success: true,
                        message: 'Plan slot assigned to student (token creation failed)',
                        resourceType: 'plan',
                        assignedResourceId: planInfo.personalPlano?._id?.toString()
                    };
                }
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
     * CRITICAL FIX: Only count ACTIVE students for plan slot calculations
     */
    private async getStudentResourceBreakdown(personalTrainerId: string): Promise<{
        planBasedStudents: number;
        tokenBasedStudents: number;
        totalStudents: number;
    }> {
        try {
            const Aluno = (await import('../models/Aluno.js')).default;
            
            // CRITICAL FIX: Only get ACTIVE students for plan slot calculation
            // Inactive students should not consume plan slots
            const activeStudents = await Aluno.find({ 
                trainerId: personalTrainerId, 
                status: 'active' 
            });
            
            console.log(`[StudentResourceValidation] 🔍 FIXED: Checking ${activeStudents.length} ACTIVE students (ignoring inactive students for plan slot calculation)`);
            
            let planBasedStudents = 0;
            let tokenBasedStudents = 0;

            for (const student of activeStudents) {
                try {
                    // Check if this ACTIVE student has an assigned token (both new Token and legacy TokenAvulso)
                    const studentToken = await TokenAssignmentService.getStudentAssignedToken(
                        (student._id as mongoose.Types.ObjectId).toString()
                    );
                    
                    if (studentToken) {
                        // CRITICAL FIX: Properly distinguish between plan tokens and standalone tokens
                        const isStandaloneToken = studentToken.tipo === 'avulso' || !studentToken.tipo; // Legacy tokens have no tipo field
                        const isPlanToken = studentToken.tipo === 'plano';
                        
                        if (isStandaloneToken) {
                            tokenBasedStudents++;
                            console.log(`[StudentResourceValidation] 🎫 ACTIVE student ${student._id} (${student.nome}) - STANDALONE token-based`);
                        } else if (isPlanToken) {
                            planBasedStudents++;
                            console.log(`[StudentResourceValidation] 📋 ACTIVE student ${student._id} (${student.nome}) - PLAN token-based (counts against plan slots)`);
                        } else {
                            // Unknown token type, assume plan-based to be safe
                            planBasedStudents++;
                            console.log(`[StudentResourceValidation] ❓ ACTIVE student ${student._id} (${student.nome}) - UNKNOWN token type, assuming plan-based`);
                        }
                    } else {
                        planBasedStudents++;
                        console.log(`[StudentResourceValidation] 📋 ACTIVE student ${student._id} (${student.nome}) - NO TOKEN (legacy plan-based)`);
                    }
                } catch (error) {
                    console.error(`[StudentResourceValidation] ❌ Error checking token for student ${student._id}:`, error);
                    // If there's an error checking the token, assume it's plan-based to prevent failures
                    planBasedStudents++;
                    console.log(`[StudentResourceValidation] ⚠️ ACTIVE student ${student._id} (${student.nome}) - plan-based (fallback due to error)`);
                }
            }

            console.log(`[StudentResourceValidation] 📊 FIXED Student breakdown for ${personalTrainerId}:`, {
                planBasedActiveStudents: planBasedStudents,
                tokenBasedActiveStudents: tokenBasedStudents,
                totalActiveStudents: activeStudents.length,
                criticalFix: "FIXED: Plan tokens now properly count as plan-based students (consuming plan slots)"
            });

            return {
                planBasedStudents,
                tokenBasedStudents,
                totalStudents: activeStudents.length
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
            
            // Add token-specific recommendations when we have token info
            if (tokenStatus.availableTokens === 0 && tokenStatus.consumedTokens > 0) {
                recommendations.push('Considere adquirir mais tokens para aumentar capacidade');
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