// client/src/hooks/useStudentLimit.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StudentLimitStatus, ValidationResult } from "@/../shared/types";

export function useStudentLimit() {
  const queryClient = useQueryClient();

  // Get current student limit status
  const getStatus = () => {
    return useQuery<{ success: boolean; data: StudentLimitStatus }>({
      queryKey: ["/api/student-limit/status"],
      queryFn: async () => {
        return apiRequest("GET", "/api/student-limit/status");
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    });
  };

  // Validate student activation
  const validateActivation = () => {
    return useMutation<ValidationResult, Error, { quantidade?: number }>({
      mutationFn: async ({ quantidade = 1 }) => {
        return apiRequest("POST", "/api/student-limit/validate-activation", { quantidade });
      },
    });
  };

  // Validate invite sending
  const validateInvite = () => {
    return useMutation<ValidationResult, Error, void>({
      mutationFn: async () => {
        return apiRequest("POST", "/api/student-limit/validate-invite");
      },
    });
  };

  // Get detailed breakdown
  const getDetailedBreakdown = () => {
    return useQuery<{ success: boolean; data: any }>({
      queryKey: ["/api/student-limit/detailed-breakdown"],
      queryFn: async () => {
        return apiRequest("GET", "/api/student-limit/detailed-breakdown");
      },
      enabled: false, // Only fetch when explicitly requested
    });
  };

  // Refresh status after operations
  const refreshStatus = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/student-limit/status"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/alunos/gerenciar"] });
  };

  // Derived computed values from status
  const statusQuery = getStatus();
  const status = statusQuery.data?.data;

  const isAtLimit = status?.isAtLimit ?? false;
  const availableSlots = status?.availableSlots ?? 0;
  const totalLimit = status?.totalLimit ?? 0;
  const activeStudents = status?.activeStudents ?? 0;

  // Helper functions
  const canActivateStudents = (quantity: number = 1): boolean => {
    return availableSlots >= quantity;
  };

  const canSendInvite = (): boolean => {
    return canActivateStudents(1);
  };

  const getLimitMessage = (): string | null => {
    if (!status) return null;
    
    if (isAtLimit) {
      if (status.planDetails) {
        return `Limite de ${totalLimit} aluno${totalLimit !== 1 ? 's' : ''} ativo${totalLimit !== 1 ? 's' : ''} atingido`;
      } else {
        return "Nenhum plano ativo. Adquira um plano para cadastrar alunos";
      }
    }
    
    return null;
  };

  const getRecommendations = (): string[] => {
    if (!status || !isAtLimit) return [];
    
    const recommendations: string[] = [];
    
    if (!status.planDetails?.isActive) {
      recommendations.push("Faça upgrade do plano ou renove seu plano atual");
    } else if (status.planDetails && status.planDetails.limit > 0) {
      recommendations.push("Faça upgrade do plano para um limite maior");
    } else {
      recommendations.push("Adquira um plano para começar a cadastrar alunos");
    }
    
    recommendations.push("Solicite tokens ao administrador");
    
    return recommendations;
  };

  return {
    // Query data
    status,
    loading: statusQuery.isLoading,
    error: statusQuery.error?.message || null,
    
    // Computed values
    isAtLimit,
    availableSlots,
    totalLimit,
    activeStudents,
    
    // Helper functions
    canActivateStudents,
    canSendInvite,
    getLimitMessage,
    getRecommendations,
    
    // Mutation functions
    validateActivation,
    validateInvite,
    refreshStatus,
    
    // Queries
    getDetailedBreakdown,
  };
}