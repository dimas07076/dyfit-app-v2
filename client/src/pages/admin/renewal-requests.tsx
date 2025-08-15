import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest, downloadFile } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  proof?: {
    kind: 'link' | 'file';
    url?: string;
    filename?: string;
  };
  notes?: string;
  linkSentAt?: string;
  proofUploadedAt?: string;
  paymentDecisionAt?: string;
  paymentDecisionNote?: string;
}

export default function AdminRenewalRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

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

  // Mutação para decisão (aprovar/rejeitar)
  const makeDecision = useMutation({
    mutationFn: ({ id, approved, note }: { id: string; approved: boolean; note?: string }) =>
      apiRequest("PATCH", `/api/admin/renewal-requests/${id}/decision`, { approved, note }),
    onSuccess: () => {
      toast({ title: "Decisão processada", description: "Decisão registrada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["adminRenewalRequests"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao processar decisão", description: err?.message || "Erro inesperado." });
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
              
              {req.paymentLink && req.linkSentAt && (
                <p>
                  Link enviado em {new Date(req.linkSentAt).toLocaleString('pt-BR')}:{" "}
                  <a href={req.paymentLink} className="text-primary underline break-all" target="_blank" rel="noopener noreferrer">
                    {req.paymentLink}
                  </a>
                </p>
              )}
              
              {req.paymentLink && !req.linkSentAt && (
                <p>
                  Link enviado:{" "}
                  <a href={req.paymentLink} className="text-primary underline break-all" target="_blank" rel="noopener noreferrer">
                    {req.paymentLink}
                  </a>
                </p>
              )}
              
              {req.proofUploadedAt && (
                <p>Comprovante enviado em {new Date(req.proofUploadedAt).toLocaleString('pt-BR')}</p>
              )}
              
              {req.paymentDecisionAt && req.paymentDecisionNote && (
                <p>Decisão tomada em {new Date(req.paymentDecisionAt).toLocaleString('pt-BR')}: {req.paymentDecisionNote}</p>
              )}
              {req.paymentProofUrl && (
                <p>
                  Comprovante enviado:{" "}
                  {req.paymentProofUrl.startsWith('https://') ? (
                    <a href={req.paymentProofUrl} className="text-primary underline break-all" target="_blank" rel="noopener noreferrer">
                      Abrir comprovante
                    </a>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary underline"
                      onClick={async () => {
                        try {
                          await downloadFile(req._id, 'personalAdmin');
                        } catch (error) {
                          toast({
                            variant: "destructive",
                            title: "Erro no download",
                            description: "Não foi possível baixar o arquivo."
                          });
                        }
                      }}
                    >
                      Baixar comprovante
                    </Button>
                  )}
                </p>
              )}
              {req.proof && (
                <div>
                  <p className="text-sm font-medium">Comprovante enviado:</p>
                  {req.proof.kind === 'link' && (
                    <a
                      href={req.proof.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline break-all text-sm"
                    >
                      {req.proof.url}
                    </a>
                  )}
                  {req.proof.kind === 'file' && (
                    <p className="text-sm">
                      Arquivo: {req.proof.filename}
                      <Button
                        variant="link"
                        size="sm"
                        className="ml-2 h-auto p-0 text-primary underline"
                        onClick={async () => {
                          try {
                            await downloadFile(req._id, 'personalAdmin');
                          } catch (error) {
                            toast({
                              variant: "destructive",
                              title: "Erro no download",
                              description: "Não foi possível baixar o arquivo."
                            });
                          }
                        }}
                      >
                        Baixar
                      </Button>
                    </p>
                  )}
                </div>
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
                <div className="mt-4 space-y-2">
                  <Textarea
                    placeholder="Observação (opcional)"
                    value={decisionNotes[req._id] || ""}
                    onChange={(e) => setDecisionNotes({ ...decisionNotes, [req._id]: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => makeDecision.mutate({ id: req._id, approved: true, note: decisionNotes[req._id] })}
                      disabled={makeDecision.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {makeDecision.isPending ? "Processando..." : "Aprovar"}
                    </Button>
                    <Button
                      onClick={() => makeDecision.mutate({ id: req._id, approved: false, note: decisionNotes[req._id] })}
                      disabled={makeDecision.isPending}
                      variant="destructive"
                    >
                      {makeDecision.isPending ? "Processando..." : "Rejeitar"}
                    </Button>
                  </div>
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
    case "requested":
      return "Aguardando envio de link";
    case "payment_link_sent":
    case "link_sent":
      return "Link enviado, aguardando comprovante";
    case "payment_proof_uploaded":
    case "proof_submitted":
      return "Comprovante anexado, aguardando aprovação";
    case "approved":
      return "Aprovado";
    case "rejected":
      return "Rejeitado";
    default:
      return status;
  }
}
