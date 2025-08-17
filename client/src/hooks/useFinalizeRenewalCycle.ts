import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { fetchWithAuth } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

type FinalizePayload =
  | { alunosSelecionados: string[] } // Fluxo legado: POST /api/personal/renovar-plano
  | {
      renewalId?: string; // Novo fluxo: POST /api/personal/renewal-requests/:id/finalize-cycle
      keepStudentIds: string[];
      removeStudentIds: string[];
      note?: string;
    };

// Chaves usadas na página "Solicitar Renovação"
export const QK_RENEWALS_APPROVED = ["personal-renewals", "approved"];
export const QK_RENEWALS_LIST = ["personal-renewals", "list"];

// Helper: resolve o ID da solicitação aprovada/pendente de ciclo
async function resolveApprovedRenewalId(): Promise<string | undefined> {
  const qs =
    "?status=" +
    encodeURIComponent("approved,APPROVED,cycle_assignment_pending") +
    "&limit=1";
  const r = await fetchWithAuth(
    `/api/personal/renewal-requests${qs}`,
    {},
    "personalAdmin"
  );
  if (!r.ok) return undefined;
  const data = await r.json();
  if (Array.isArray(data) && data.length > 0 && data[0]?._id) {
    return String(data[0]._id);
  }
  return undefined;
}

export function useFinalizeRenewalCycle() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: FinalizePayload) => {
      // Fluxo legado: fecha quaisquer approved/cycle pendentes com a lista enviada
      if ("alunosSelecionados" in payload) {
        return fetchWithAuth(
          "/api/personal/renovar-plano",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          "personalAdmin"
        );
      }

      // Novo fluxo: precisa de um renewalId válido
      let { renewalId, ...rest } = payload || ({} as any);

      if (!renewalId) {
        // Auto-resolve o ID atual (approved / cycle_assignment_pending)
        const resolvedId = await resolveApprovedRenewalId();
        if (!resolvedId) {
          const err = new Error(
            "Nenhuma solicitação aprovada encontrada para finalizar o ciclo. Solicite um plano e aguarde aprovação."
          );
          (err as any).mensagem = (err as any).message;
          throw err;
        }
        renewalId = resolvedId; // agora é string
      }

      return fetchWithAuth(
        `/api/personal/renewal-requests/${renewalId}/finalize-cycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest),
        },
        "personalAdmin"
      );
    },
    onSuccess: async () => {
      // Invalida exatamente as queries usadas na tela
      await queryClient.invalidateQueries({ queryKey: QK_RENEWALS_APPROVED });
      await queryClient.invalidateQueries({ queryKey: QK_RENEWALS_LIST });

      toast({
        title: "Ciclo confirmado",
        description: "Plano atualizado e solicitação encerrada.",
      });

      // Volta ao início da jornada de renovação
      navigate("/solicitar-renovacao", { replace: true });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao confirmar ciclo",
        description:
          error?.mensagem ||
          error?.message ||
          "Não foi possível concluir a operação.",
      });
    },
  });

  // Aliases compatíveis com seu renovar-plano.tsx (aceita até 3 args; 3º é ignorado)
  const finalizarCiclo: any = (
    variables: FinalizePayload,
    options?: any,
    _ignoredThirdArg?: any
  ) => {
    return mutation.mutate(variables, options);
  };
  const isFinalizando = mutation.isPending;

  return {
    ...mutation,
    finalizarCiclo,
    isFinalizando,
  };
}
