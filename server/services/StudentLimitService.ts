// server/services/StudentLimitService.ts
import PlanoService from './PlanoService.js';
import TokenAvulso from '../models/TokenAvulso.js';
import Aluno from '../models/Aluno.js';

// Types for the service responses
export interface StudentLimitStatus {
  planDetails: {
    name: string;
    limit: number;
    isActive: boolean;
    expiresAt: Date | null;
  } | null;
  tokensAvailable: number;
  totalLimit: number;
  activeStudents: number;
  availableSlots: number;
  isAtLimit: boolean;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  code: string;
  data: {
    currentLimit: number;
    activeStudents: number;
    availableSlots: number;
    recommendations: string[];
  };
}

export class StudentLimitService {
  /**
   * Get comprehensive student limit status for a personal trainer
   */
  async getStudentLimitStatus(personalId: string): Promise<StudentLimitStatus> {
    try {
      const planStatus = await PlanoService.getPersonalCurrentPlan(personalId);
      
      const planDetails = planStatus.plano ? {
        name: planStatus.plano.nome,
        limit: planStatus.plano.limiteAlunos,
        isActive: !planStatus.isExpired,
        expiresAt: planStatus.personalPlano?.dataVencimento || null
      } : null;

      return {
        planDetails,
        tokensAvailable: planStatus.tokensAvulsos,
        totalLimit: planStatus.limiteAtual,
        activeStudents: planStatus.alunosAtivos,
        availableSlots: planStatus.limiteAtual - planStatus.alunosAtivos,
        isAtLimit: planStatus.alunosAtivos >= planStatus.limiteAtual
      };
    } catch (error) {
      console.error('Error getting student limit status:', error);
      throw error;
    }
  }

  /**
   * Validate if personal trainer can activate specified number of students
   */
  async validateStudentActivation(personalId: string, quantidade: number = 1): Promise<ValidationResult> {
    try {
      const status = await this.getStudentLimitStatus(personalId);
      const success = status.availableSlots >= quantidade;

      const recommendations: string[] = [];
      
      if (!success) {
        if (status.planDetails && !status.planDetails.isActive) {
          recommendations.push("Faça upgrade do plano ou renove seu plano atual");
        } else if (status.planDetails && status.planDetails.limit > 0) {
          recommendations.push("Faça upgrade do plano para um limite maior");
        } else {
          recommendations.push("Adquira um plano para começar a cadastrar alunos");
        }
        
        recommendations.push("Solicite tokens ao administrador");
        
        // Check if there are inactive students that could be deactivated
        const inactiveStudents = await Aluno.countDocuments({
          trainerId: personalId,
          status: 'inactive'
        });
        
        if (inactiveStudents > 0) {
          recommendations.push("Considere remover alunos inativos permanentemente");
        }
      }

      return {
        success,
        message: success 
          ? `Você pode ativar ${quantidade} aluno${quantidade > 1 ? 's' : ''}`
          : `Limite de ${status.totalLimit} aluno${status.totalLimit !== 1 ? 's' : ''} ativo${status.totalLimit !== 1 ? 's' : ''} atingido`,
        code: success ? 'ACTIVATION_ALLOWED' : 'STUDENT_LIMIT_EXCEEDED',
        data: {
          currentLimit: status.totalLimit,
          activeStudents: status.activeStudents,
          availableSlots: status.availableSlots,
          recommendations
        }
      };
    } catch (error) {
      console.error('Error validating student activation:', error);
      throw error;
    }
  }

  /**
   * Consume tokens when activating students beyond plan limit
   */
  async consumeTokensForActivation(personalId: string, studentsToActivate: number): Promise<void> {
    try {
      const planStatus = await PlanoService.getPersonalCurrentPlan(personalId);
      const planLimit = planStatus.plano && !planStatus.isExpired ? planStatus.plano.limiteAlunos : 0;
      const currentActive = planStatus.alunosAtivos;
      
      // Calculate how many tokens need to be consumed
      const studentsExceedingPlanLimit = Math.max(0, (currentActive + studentsToActivate) - planLimit);
      
      if (studentsExceedingPlanLimit > 0) {
        // Find active tokens to consume
        const activeTokens = await TokenAvulso.find({
          personalTrainerId: personalId,
          ativo: true,
          dataVencimento: { $gt: new Date() }
        }).sort({ dataVencimento: 1 }); // Consume tokens closest to expiration first

        let tokensToConsume = studentsExceedingPlanLimit;
        
        for (const token of activeTokens) {
          if (tokensToConsume <= 0) break;
          
          if (token.quantidade >= tokensToConsume) {
            // This token has enough quantity
            token.quantidade -= tokensToConsume;
            if (token.quantidade === 0) {
              token.ativo = false;
            }
            await token.save();
            tokensToConsume = 0;
          } else {
            // Consume entire token
            tokensToConsume -= token.quantidade;
            token.quantidade = 0;
            token.ativo = false;
            await token.save();
          }
        }

        if (tokensToConsume > 0) {
          throw new Error(`Não há tokens suficientes. Faltam ${tokensToConsume} tokens.`);
        }

        console.log(`✅ Consumed ${studentsExceedingPlanLimit} tokens for personal ${personalId}`);
      }
    } catch (error) {
      console.error('Error consuming tokens:', error);
      throw error;
    }
  }

  /**
   * Get detailed breakdown for admin or detailed views
   */
  async getDetailedBreakdown(personalId: string): Promise<{
    status: StudentLimitStatus;
    planHistory: any[];
    tokenHistory: any[];
    activeStudentsList: any[];
    inactiveStudentsList: any[];
  }> {
    try {
      const [status, adminStatus, activeStudents, inactiveStudents] = await Promise.all([
        this.getStudentLimitStatus(personalId),
        PlanoService.getPersonalStatusForAdmin(personalId),
        Aluno.find({ trainerId: personalId, status: 'active' }).select('nome email createdAt').lean(),
        Aluno.find({ trainerId: personalId, status: 'inactive' }).select('nome email createdAt updatedAt').lean()
      ]);

      return {
        status,
        planHistory: adminStatus.planHistory,
        tokenHistory: [...adminStatus.activeTokens, ...adminStatus.expiredTokens],
        activeStudentsList: activeStudents,
        inactiveStudentsList: inactiveStudents
      };
    } catch (error) {
      console.error('Error getting detailed breakdown:', error);
      throw error;
    }
  }

  /**
   * Check if personal trainer can send invite (same as activation check but for invites)
   */
  async canSendInvite(personalId: string): Promise<ValidationResult> {
    return this.validateStudentActivation(personalId, 1);
  }

  /**
   * Validate student status change from inactive to active
   */
  async validateStudentStatusChange(personalId: string, fromStatus: string, toStatus: string): Promise<ValidationResult> {
    if (fromStatus === 'inactive' && toStatus === 'active') {
      return this.validateStudentActivation(personalId, 1);
    }
    
    // For other status changes, allow them
    return {
      success: true,
      message: 'Status change allowed',
      code: 'STATUS_CHANGE_ALLOWED',
      data: {
        currentLimit: 0,
        activeStudents: 0,
        availableSlots: 0,
        recommendations: []
      }
    };
  }
}

export default new StudentLimitService();