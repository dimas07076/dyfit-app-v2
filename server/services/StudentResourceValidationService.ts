// server/services/StudentResourceValidationService.ts
import PlanoService from './PlanoService.js';
import TokenAssignmentService from './TokenAssignmentService.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

export interface ResourceValidationResult {
    isValid: boolean;
    resourceType: 'plan' | 'token' | 'none';
    message: string;
}

export class StudentResourceValidationService {
    
    /**
     * Valida qual recurso está disponível para um novo aluno, priorizando plano sobre token.
     */
    async validateResourceForNewStudent(
        personalTrainerId: string
    ): Promise<ResourceValidationResult> {
        try {
            console.log(`[StudentResourceValidation] 🎯 Validando recurso para novo aluno do personal ${personalTrainerId}`);

            const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
            const activeStudentsCount = await Aluno.countDocuments({ 
                trainerId: new mongoose.Types.ObjectId(personalTrainerId), 
                status: 'active' 
            });
            
            const planLimit = planStatus.plano?.limiteAlunos || 0;
            const isPlanExpired = planStatus.isExpired;

            // 1. Prioridade: Verificar se há vagas no plano ativo
            if (planLimit > 0 && !isPlanExpired) {
                if (activeStudentsCount < planLimit) {
                    const availableSlots = planLimit - activeStudentsCount;
                    console.log(`[StudentResourceValidation] ✅ Vaga de plano disponível. Limite: ${planLimit}, Ativos: ${activeStudentsCount}, Vagas: ${availableSlots}`);
                    return { isValid: true, resourceType: 'plan', message: 'Vaga de plano disponível.' };
                }
            }
            
            // 2. Segunda opção: Verificar se há tokens avulsos
            const availableTokens = await TokenAssignmentService.getAvailableTokensCount(personalTrainerId);
            if (availableTokens > 0) {
                console.log(`[StudentResourceValidation] ✅ Token avulso disponível. Quantidade: ${availableTokens}`);
                return { isValid: true, resourceType: 'token', message: 'Token avulso disponível.' };
            }

            // 3. Se nenhuma das opções acima, não há recursos.
            console.log(`[StudentResourceValidation] ❌ Nenhum recurso disponível. Limite do plano: ${planLimit}, Alunos ativos: ${activeStudentsCount}, Tokens: ${availableTokens}`);
            return { isValid: false, resourceType: 'none', message: 'Limite de alunos atingido e sem tokens avulsos.' };

        } catch (error) {
            console.error('[StudentResourceValidation] ❌ Erro ao validar recurso para novo aluno:', error);
            return {
                isValid: false,
                resourceType: 'none',
                message: 'Erro interno ao validar recursos.',
            };
        }
    }
}

export default new StudentResourceValidationService();