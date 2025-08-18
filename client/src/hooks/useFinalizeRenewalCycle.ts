// client/src/hooks/useFinalizeRenewalCycle.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { fetchWithAuth } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

// O único tipo de payload que a página 'renovar-plano' envia
type FinalizePayload = {
  keepStudentIds: string[];
  removeStudentIds: string[];
  note?: string;
  // O ID da solicitação é opcional, pois a rota do backend pode resolvê-lo automaticamente
  renewalId?: string; 
};

// Chaves de query que serão invalidadas após o sucesso, para sincronizar o estado da UI
export const QK_RENEWALS_APPROVED = ["personal-renewals", "approved"];
export const QK_RENEWALS_LIST = ["personal-renewals", "list"];

export function useFinalizeRenewalCycle() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: FinalizePayload) => {
      // A rota do backend é inteligente o suficiente para encontrar a solicitação
      // "approved" ou "cycle_assignment_pending" se o ID não for fornecido.
      const endpoint = payload.renewalId
        ? `/api/personal/renewal-requests/${payload.renewalId}/finalize-cycle`
        : `/api/personal/renewal-requests/finalize-cycle`;

      // Esta rota foi corrigida no passo anterior para ser um POST
      return fetchWithAuth(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "personalAdmin"
      );
    },
    onSuccess: async () => {
      // Invalida as queries de solicitações para limpar os banners e listas na página anterior
      await queryClient.invalidateQueries({ queryKey: QK_RENEWALS_APPROVED });
      await queryClient.invalidateQueries({ queryKey: QK_RENEWALS_LIST });
      
      toast({
        title: "Ciclo de Renovação Finalizado!",
        description: "Seu plano foi atualizado e as vagas dos alunos foram redefinidas com sucesso.",
      });

      // Redireciona de volta para a página de solicitação, que agora estará "limpa"
      navigate("/solitar-renovacao", { replace: true });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao Finalizar Ciclo",
        description:
          error?.message || "Não foi possível concluir a operação. Tente novamente.",
      });
    },
  });

  return {
    finalizarCiclo: mutation.mutate,
    isFinalizando: mutation.isPending,
  };
}