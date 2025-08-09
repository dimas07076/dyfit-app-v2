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
     * ENHANCED: Atomic transaction support and retry logic for consistent token assignment
     */
    async assignResourceToStudent(
        personalTrainerId: string,
        studentId: string
    ): Promise<ResourceAssignmentResult> {
        const mongoose = (await import('mongoose')).default;
        let session: any = null;
        let planInfo: any = null; // Declare planInfo in function scope for access outside transaction
        
        try {
            console.log(`[StudentResourceValidation] 🔗 ENHANCED: Starting atomic resource assignment for student ${studentId} for personal ${personalTrainerId}`);

            // Start a database session for atomic operations
            session = await mongoose.startSession();
            
            let result: ResourceAssignmentResult;
            
            await session.withTransaction(async () => {
                // First validate that resources are available
                const validation = await this.validateStudentCreation(personalTrainerId, 1);
                
                if (!validation.isValid) {
                    result = {
                        success: false,
                        message: validation.message,
                        resourceType: 'token' // Default for error cases
                    };
                    return;
                }

                // Check if student already has a resource assigned (for reactivation)
                const existingToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
                if (existingToken && getTokenExpirationDate(existingToken) > new Date()) {
                    console.log(`[StudentResourceValidation] ♻️ Student ${studentId} already has valid token, no new assignment needed`);
                    result = {
                        success: true,
                        message: 'Student already has valid token assigned',
                        resourceType: 'token',
                        assignedResourceId: existingToken._id?.toString()
                    };
                    return;
                }

                // Determine resource assignment based on availability and priority
                planInfo = validation.status.planInfo; // Assign to function-scoped variable
                
                // CRITICAL FIX: Enhanced plan token creation using centralized helper method
                if (planInfo && planInfo.planSlotsAvailable > 0 && !planInfo.isExpired) {
                    console.log(`[StudentResourceValidation] 📋 ENHANCED: Using plan slot for student ${studentId}, creating plan token for ${planInfo.plano?.nome || 'Unknown Plan'}`);
                    
                    // Use centralized helper method with retry logic
                    let retryCount = 0;
                    const maxRetries = 3;
                    let tokenCreationResult: any = null;
                    
                    while (!tokenCreationResult?.success && retryCount < maxRetries) {
                        retryCount++;
                        console.log(`[StudentResourceValidation] 🔄 ENHANCED: Plan token creation attempt ${retryCount}/${maxRetries} for student ${studentId}`);
                        
                        tokenCreationResult = await this.createAndAssignPlanToken(
                            personalTrainerId,
                            studentId,
                            planInfo,
                            session
                        );
                        
                        if (!tokenCreationResult.success) {
                            console.error(`[StudentResourceValidation] ❌ ENHANCED: Attempt ${retryCount} failed: ${tokenCreationResult.error}`);
                            
                            // If this is the last retry, throw the error to exit the transaction
                            if (retryCount >= maxRetries) {
                                throw new Error(`Failed to create plan token after ${maxRetries} attempts: ${tokenCreationResult.error}`);
                            }
                            
                            // Wait before retry (exponential backoff)
                            await new Promise(resolve => setTimeout(resolve, retryCount * 100));
                        }
                    }
                    
                    if (tokenCreationResult?.success) {
                        result = {
                            success: true,
                            message: `Plan token created and assigned to student - ${planInfo.plano?.nome} (Created on attempt ${retryCount})`,
                            resourceType: 'plan',
                            assignedResourceId: tokenCreationResult.token.id
                        };
                    } else {
                        throw new Error('Plan token creation failed after all retry attempts');
                    }
                    
                } else if (validation.status.tokenInfo.availableTokens > 0) {
                    // Use token - assign token to student
                    console.log(`[StudentResourceValidation] 🎫 ENHANCED: Using available token for student ${studentId}`);
                    
                    const tokenAssignment = await TokenAssignmentService.assignTokenToStudent(
                        personalTrainerId,
                        studentId,
                        1
                    );

                    if (tokenAssignment.success) {
                        result = {
                            success: true,
                            message: 'Token assigned to student',
                            resourceType: 'token',
                            assignedResourceId: tokenAssignment.assignedToken?._id?.toString()
                        };
                    } else {
                        result = {
                            success: false,
                            message: tokenAssignment.message,
                            resourceType: 'token'
                        };
                    }
                } else {
                    result = {
                        success: false,
                        message: 'No resources available for assignment',
                        resourceType: 'token'
                    };
                }
            });
            
            console.log(`[StudentResourceValidation] 🎯 ENHANCED: Atomic resource assignment completed:`, {
                studentId,
                success: result!.success,
                resourceType: result!.resourceType,
                assignedResourceId: result!.assignedResourceId
            });
            
            // Final verification outside transaction
            if (result!.success && result!.resourceType === 'plan') {
                console.log(`[StudentResourceValidation] 🔍 ENHANCED: Performing final token verification for student ${studentId}`);
                
                // Wait a moment for database consistency
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const finalToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
                if (!finalToken) {
                    console.error(`[StudentResourceValidation] ❌ ENHANCED: CRITICAL ERROR - Final verification failed, no token found for student ${studentId} after successful assignment!`);
                    // Force retry of token assignment outside transaction
                    await this.forceTokenCreationRetry(personalTrainerId, studentId, planInfo);
                } else {
                    console.log(`[StudentResourceValidation] ✅ ENHANCED: Final verification passed - student ${studentId} has token ${finalToken._id}`);
                }
            }
            
            return result!;

        } catch (error: any) {
            console.error('[StudentResourceValidation] ❌ ENHANCED: Error in atomic resource assignment:', {
                error: error.message,
                stack: error.stack,
                studentId,
                personalTrainerId
            });
            
            return {
                success: false,
                message: `Erro interno ao atribuir recurso: ${error.message}`,
                resourceType: 'token'
            };
        } finally {
            if (session) {
                await session.endSession();
            }
        }
    }

    /**
     * Helper method to create and assign plan token with robust error handling and logging
     * Centralizes plan token creation logic with comprehensive validation and retry mechanism
     */
    private async createAndAssignPlanToken(
        personalTrainerId: string,
        studentId: string,
        planInfo: any,
        session?: any
    ): Promise<{ success: boolean; token?: any; error?: string }> {
        try {
            console.log(`[StudentResourceValidation] 🏗️ Creating plan token for student ${studentId} with plan ${planInfo.plano?.nome || 'Unknown'}`);
            
            const mongoose = (await import('mongoose')).default;
            const Token = (await import('../models/Token.js')).default;
            
            // Validate required data before creation
            const requiredData = {
                personalTrainerId,
                studentId,
                planId: planInfo.personalPlano?._id,
                dataExpiracao: planInfo.personalPlano?.dataVencimento,
                planName: planInfo.plano?.nome
            };
            
            // Check for missing required fields
            const missingFields = Object.entries(requiredData)
                .filter(([, value]) => !value)
                .map(([key]) => key);
                
            if (missingFields.length > 0) {
                const errorMsg = `Missing required fields for plan token creation: ${missingFields.join(', ')}`;
                console.error(`[StudentResourceValidation] ❌ ${errorMsg}`);
                return { success: false, error: errorMsg };
            }
            
            // Prepare token data with fallback for adicionadoPorAdmin
            const tokenData = {
                tipo: 'plano' as const,
                personalTrainerId: personalTrainerId,
                alunoId: new mongoose.Types.ObjectId(studentId),
                planoId: planInfo.personalPlano._id,
                dataExpiracao: planInfo.personalPlano.dataVencimento,
                ativo: true,
                quantidade: 1,
                dateAssigned: new Date(),
                adicionadoPorAdmin: planInfo.personalPlano?.atribuidoPorAdmin || new mongoose.Types.ObjectId(personalTrainerId),
                motivoAdicao: `Token de plano criado automaticamente - ${planInfo.plano.nome}`
            };
            
            console.log(`[StudentResourceValidation] 📋 Creating plan token with data:`, {
                tipo: tokenData.tipo,
                personalTrainerId: tokenData.personalTrainerId,
                studentId: studentId,
                planId: tokenData.planoId,
                expiration: tokenData.dataExpiracao,
                adminId: tokenData.adicionadoPorAdmin
            });
            
            // Create and save token
            const planToken = new Token(tokenData);
            await planToken.save(session ? { session } : {});
            
            console.log(`[StudentResourceValidation] ✅ Successfully created plan token ${planToken.id} for student ${studentId}`);
            
            return { success: true, token: planToken };
            
        } catch (error: any) {
            const errorMsg = `Failed to create plan token: ${error.message}`;
            console.error(`[StudentResourceValidation] ❌ ${errorMsg}`, {
                error: error.message,
                stack: error.stack,
                studentId,
                personalTrainerId,
                planInfo: {
                    planId: planInfo?.personalPlano?._id,
                    planName: planInfo?.plano?.nome
                }
            });
            
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Force retry token creation outside of transaction for edge cases
     */
    private async forceTokenCreationRetry(personalTrainerId: string, studentId: string, planInfo: any): Promise<void> {
        try {
            console.log(`[StudentResourceValidation] 🚨 FORCE RETRY: Creating plan token for student ${studentId} outside transaction`);
            
            const retryResult = await this.createAndAssignPlanToken(personalTrainerId, studentId, planInfo);
            
            if (retryResult.success) {
                console.log(`[StudentResourceValidation] ✅ FORCE RETRY: Successfully created token ${retryResult.token?.id} for student ${studentId}`);
            } else {
                console.error(`[StudentResourceValidation] ❌ FORCE RETRY: Failed to create token for student ${studentId}: ${retryResult.error}`);
            }
            
        } catch (retryError: any) {
            console.error(`[StudentResourceValidation] ❌ FORCE RETRY: Exception during token creation for student ${studentId}:`, retryError.message);
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
                        // Type guard to safely access 'tipo' property
                        const hasTypeProperty = 'tipo' in studentToken;
                        const isStandaloneToken = hasTypeProperty ? studentToken.tipo === 'avulso' : true; // Legacy tokens are treated as standalone
                        const isPlanToken = hasTypeProperty ? studentToken.tipo === 'plano' : false;
                        
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