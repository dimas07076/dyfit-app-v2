import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AdminRenewalRequest {
  _id: string;
  personalTrainerId: {
    _id: string;
    nome: string;
    email: string;
  };
  planIdRequested?: {
    _id: string;
    nome: string;
  } | null;
  status: string;
  paymentLink?: string;
  paymentProofUrl?: string;
}

export default function AdminRenewalRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery<AdminRenewalRequest[]>({
    queryKey: ["adminRenewalRequests"],
    queryFn: () => fetchWithAuth("/api/admin/renewal-requests"),
  });

  // Mutação para enviar link de pagamento
  const sendLink = useMutation({
    mutationFn: ({ id, link }: { id: string; link: string }) =>
      apiRequest("PUT", `/api/admin/renewal-requests/${id}/payment-link`, { paymentLink: link }),
    onSuccess: () => {
      toast({ title: "Link enviado", description: "Link de pagamento enviado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["adminRenewalRequests"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao enviar link", description: err?.message || "Erro inesperado." });
    },
  });

  // Mutação para aprovar solicitação
  const approve = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PUT", `/api/admin/renewal-requests/${id}/approve`, {}),
    onSuccess: () => {
      toast({ title: "Solicitação aprovada", description: "Plano renovado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["adminRenewalRequests"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao aprovar", description: err?.message || "Erro inesperado." });
    },
  });

  if (isLoading) {
    return <p className="p-4">Carregando solicitações...</p>;
  }

  if (error) {
    return <p className="p-4">Erro ao carregar solicitações: {(error as any)?.message}</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Solicitações de Renovação</h1>
      {(!requests || requests.length === 0) && (
        <p>Nenhuma solicitação pendente.</p>
      )}
      <div className="space-y-4">
        {requests?.map((req) => (
          <Card key={req._id}>
            <CardHeader>
              <CardTitle>Solicitação #{req._id.slice(-6)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Personal: <strong>{req.personalTrainerId?.nome}</strong> ({req.personalTrainerId?.email})</p>
              <p>Plano solicitado: {req.planIdRequested?.nome || "Manter categoria"}</p>
              <p>Status: {statusLabel(req.status)}</p>
              {req.paymentLink && (
                <p>
                  Link enviado:{" "}
                  <a href={req.paymentLink} className="text-primary underline break-all" target="_blank" rel="noopener noreferrer">
                    {req.paymentLink}
                  </a>
                </p>
              )}
              {req.paymentProofUrl && (
                <p>
                  Comprovante enviado:{" "}
                  <a href={req.paymentProofUrl} className="text-primary underline break-all" target="_blank" rel="noopener noreferrer">
                    Abrir comprovante
                  </a>
                </p>
              )}

              {/* Ações baseadas no status */}
              {req.status === "pending" && (
                <div className="mt-4 space-y-2">
                  <Input
                    placeholder="Link de pagamento"
                    value={paymentLinks[req._id] || ""}
                    onChange={(e) => setPaymentLinks({ ...paymentLinks, [req._id]: e.target.value })}
                  />
                  <Button
                    onClick={() => {
                      const link = paymentLinks[req._id];
                      if (!link) {
                        toast({ variant: "destructive", title: "Campo vazio", description: "Insira um link antes de enviar." });
                        return;
                      }
                      sendLink.mutate({ id: req._id, link });
                    }}
                    disabled={sendLink.isPending}
                  >
                    {sendLink.isPending ? "Enviando..." : "Enviar Link"}
                  </Button>
                </div>
              )}

              {req.status === "payment_proof_uploaded" && (
                <div className="mt-4">
                  <Button
                    onClick={() => approve.mutate(req._id)}
                    disabled={approve.isPending}
                  >
                    {approve.isPending ? "Aprovando..." : "Aprovar Renovação"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Aguardando envio de link";
    case "payment_link_sent":
      return "Link enviado, aguardando comprovante";
    case "payment_proof_uploaded":
      return "Comprovante anexado, aguardando aprovação";
    case "approved":
      return "Aprovado";
    case "rejected":
      return "Rejeitado";
    default:
      return status;
  }
}
