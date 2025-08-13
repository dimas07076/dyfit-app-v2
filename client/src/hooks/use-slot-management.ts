// client/src/hooks/use-slot-management.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SlotAvailabilityResult {
  podeAtivar: boolean;
  slotsDisponiveis: number;
  limiteAtual: number;
  alunosAtivos: number;
  message?: string;
  details?: {
    plano?: {
      tipo: string;
      limite: number;
      utilizados: number;
    };
    tokens?: {
      disponiveis: number;
    };
  };
}

interface PlanStatus {
  plano: any;
  personalPlano: any;
  limiteAtual: number;
  alunosAtivos: number;
  tokensAvulsos: number;
  percentualUso: number;
  podeAtivarMais: boolean;
  vagasDisponiveis: number;
}

export function useSlotAvailability(quantidade: number = 1) {
  return useQuery<SlotAvailabilityResult, Error>({
    queryKey: ["slot-availability", quantidade],
    queryFn: async (): Promise<SlotAvailabilityResult> => {
      return apiRequest<SlotAvailabilityResult>("GET", `/api/personal/can-activate/${quantidade}`);
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function usePlanStatus() {
  return useQuery<PlanStatus, Error>({
    queryKey: ["plan-status"],
    queryFn: async (): Promise<PlanStatus> => {
      return apiRequest<PlanStatus>("GET", "/api/personal/meu-plano");
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });
}

export function useCheckSlotBeforeAction() {
  const queryClient = useQueryClient();

  return useMutation<SlotAvailabilityResult, Error, number>({
    mutationFn: async (quantidade: number): Promise<SlotAvailabilityResult> => {
      return apiRequest<SlotAvailabilityResult>("GET", `/api/personal/can-activate/${quantidade}`);
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
      queryClient.invalidateQueries({ queryKey: ["plan-status"] });
    }
  });
}