// client/src/pages/solicitar-renovacao.tsx
// <<< CORREÇÃO: 'useEffect' removido da importação do React >>>
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// <<< CORREÇÃO: Importação do 'Checkbox' removida, pois não é utilizada >>>
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PlanoDisponivel {
  _id: string;
  nome: string;
  descricao: string;
  limiteAlunos: number;
  preco: number;
  duracao: number;
  tipo: "free" | "paid";
}

interface RenewalRequest {
  _id: string;
  planIdRequested?: {
    _id: string;
    nome: string;
  } | null;
  status: string;
  paymentLink?: string;
  paymentProofUrl?: string;
  // outros campos omitidos
}

export default function SolicitarRenovacao() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");

  // Planos disponíveis
  const {
    data: planos,
    isLoading: loadingPlanos,
    error: planosError,
  } = useQuery<PlanoDisponivel[]>({
    queryKey: ["planosDisponiveis"],
    queryFn: () => fetchWithAuth("/api/personal/planos-disponiveis"),
    staleTime: 5 * 60 * 1000,
  });

  // Solicitações do personal
  const {
    data: renewalRequests,
    isLoading: loadingRequests,
    error: requestsError,
  } = useQuery<RenewalRequest[]>({
    queryKey: ["minhasRenewalRequests"],
    queryFn: () => fetchWithAuth("/api/personal/renewal-requests"),
  });

  // Conside apenas a solicitação mais recente (ou nenhuma)
  const currentRequest = renewalRequests && renewalRequests.length > 0 ? renewalRequests[0] : null;

  // Mutação para solicitar renovação
  const createRequest = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/personal/renewal-requests", {
        planIdRequested: selectedPlanId || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Solicitação enviada", description: "Sua solicitação foi enviada. Aguarde o link de pagamento." });
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao solicitar", description: error?.message || "Erro inesperado." });
    },
  });

  // Mutação para anexar comprovante
  const sendProof = useMutation({
    mutationFn: () => {
      if (!currentRequest?._id) throw new Error("Solicitação inválida");
      return apiRequest("PUT", `/api/personal/renewal-requests/${currentRequest._id}/payment-proof`, {
        paymentProofUrl: proofUrl,
      });
    },
    onSuccess: () => {
      toast({ title: "Comprovante enviado", description: "Aguardando aprovação do administrador." });
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
      setProofUrl("");
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao enviar comprovante", description: error?.message || "Erro inesperado." });
    },
  });

  if (loadingPlanos || loadingRequests) {
    return <p className="p-4">Carregando...</p>;
  }

  if (planosError) {
    return <p className="p-4">Erro ao carregar planos disponíveis: {(planosError as any)?.message}</p>;
  }

  if (requestsError) {
    return <p className="p-4">Erro ao carregar solicitações: {(requestsError as any)?.message}</p>;
  }

  // Renderização baseada no status
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Solicitar Renovação de Plano</h1>

      {/* Caso não exista solicitação pendente */}
      {!currentRequest && (
        <>
          <p className="mb-4 text-muted-foreground">
            Você não possui solicitações em andamento. Escolha um plano e envie sua solicitação de renovação.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {planos?.map((plano) => (
              <Card
                key={plano._id}
                onClick={() => setSelectedPlanId(plano._id)}
                className={`cursor-pointer ${
                  selectedPlanId === plano._id ? "border-primary ring-2 ring-primary" : ""
                }`}
              >
                <CardHeader>
                  <CardTitle>{plano.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{plano.descricao}</p>
                  <p className="text-sm">Limite: {plano.limiteAlunos} alunos</p>
                  <p className="text-sm">Duração: {plano.duracao} dias</p>
                  <p className="text-sm">
                    Preço:{" "}
                    {plano.tipo === "free"
                      ? "Gratuito"
                      : plano.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            onClick={() => createRequest.mutate()}
            disabled={!selectedPlanId || createRequest.isPending}
          >
            {createRequest.isPending ? "Enviando..." : "Solicitar Renovação"}
          </Button>
        </>
      )}

      {/* Caso exista solicitação pendente */}
      {currentRequest && (
        <Card className="mt-4 max-w-xl">
          <CardHeader>
            <CardTitle>Solicitação #{currentRequest._id.slice(-6)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">
              Plano solicitado:{" "}
              {currentRequest.planIdRequested ? currentRequest.planIdRequested.nome : "Mesma categoria"}
            </p>
            <p className="mb-4">Status: {statusLabel(currentRequest.status)}</p>

            {currentRequest.status === "pending" && (
              <p>Aguardando que o administrador envie o link de pagamento.</p>
            )}

            {currentRequest.status === "payment_link_sent" && (
              <>
                <div className="mb-4">
                  <p className="mb-2">Link de pagamento:</p>
                  <a
                    href={currentRequest.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                  >
                    {currentRequest.paymentLink}
                  </a>
                </div>
                <div className="mb-2">
                  <p>Anexar comprovante de pagamento (URL da imagem/arquivo):</p>
                  <Input
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="Cole aqui o link do comprovante"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={() => sendProof.mutate()}
                  disabled={!proofUrl || sendProof.isPending}
                >
                  {sendProof.isPending ? "Enviando..." : "Enviar Comprovante"}
                </Button>
              </>
            )}

            {currentRequest.status === "payment_proof_uploaded" && (
              <p>Aguardando aprovação do administrador. Você será notificado em breve.</p>
            )}

            {currentRequest.status === "approved" && (
              <>
                <p>Solicitação aprovada! Seu plano foi renovado.</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate("/renovar-plano")}
                >
                  Selecionar Alunos no Novo Ciclo
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper para traduzir status em labels amigáveis
function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Aguardando link de pagamento";
    case "payment_link_sent":
      return "Pagamento pendente";
    case "payment_proof_uploaded":
      return "Comprovante enviado";
    case "approved":
      return "Aprovado";
    case "rejected":
      return "Rejeitado";
    default:
      return status;
  }
}