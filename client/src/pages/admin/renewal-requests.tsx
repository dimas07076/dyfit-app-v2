// client/src/pages/admin/renewal-requests.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, FileText } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
// <<< CORREÇÃO: O import do Alert foi removido pois não estava sendo usado >>>

// --- Tipos de Dados e Constantes (Definidos localmente para este arquivo) ---

export const RStatus = {
  REQUESTED: 'requested',
  LINK_SENT: 'link_sent',
  PROOF_SUBMITTED: 'proof_submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FULFILLED: 'fulfilled',
  CYCLE_ASSIGNMENT_PENDING: 'cycle_assignment_pending',
  // Status legados para compatibilidade
  PENDING: 'pending',
  PAYMENT_LINK_SENT: 'payment_link_sent',
  PAYMENT_PROOF_UPLOADED: 'payment_proof_uploaded',
} as const;

export type RenewalStatus = typeof RStatus[keyof typeof RStatus];

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
  status: RenewalStatus;
  paymentLink?: string;
  proof?: {
    kind: 'link' | 'file';
    url?: string;
    filename?: string;
    fileId?: string;
    contentType?: string;
  };
  notes?: string;
  linkSentAt?: string;
  proofUploadedAt?: string;
  paymentDecisionAt?: string;
  paymentDecisionNote?: string;
}

function statusLabel(status: string) {
    switch (status) {
      case RStatus.REQUESTED:
      case RStatus.PENDING:
        return "Aguardando envio de link";
      case RStatus.LINK_SENT:
      case RStatus.PAYMENT_LINK_SENT:
        return "Link enviado, aguardando comprovante";
      case RStatus.PROOF_SUBMITTED:
      case RStatus.PAYMENT_PROOF_UPLOADED:
        return "Comprovante enviado, aguardando validação";
      case RStatus.APPROVED:
      case RStatus.CYCLE_ASSIGNMENT_PENDING:
        return "Aprovado - Aguardando Ciclo";
      case RStatus.REJECTED:
        return "Rejeitado";
      case RStatus.FULFILLED:
        return "Concluído";
      default:
        return status;
    }
}

export default function AdminRenewalRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery<AdminRenewalRequest[]>({
    queryKey: ["adminRenewalRequests"],
    queryFn: () => fetchWithAuth("/api/admin/renewal-requests"),
  });

  const handleDownloadProof = async (requestId: string, filename?: string) => {
    setDownloadingId(requestId);
    try {
      const response = await fetchWithAuth<Response>(
        `/api/admin/renewal-requests/${requestId}/proof/download`,
        { method: 'GET', returnAs: 'response' },
        'personalAdmin'
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `comprovante-${requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("[Download] Erro ao baixar o arquivo:", err);
      toast({
        variant: "destructive",
        title: "Erro no Download",
        description: err.message || "Não foi possível baixar o comprovante.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const sendLinkMutation = useMutation({
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

  const makeDecisionMutation = useMutation({
    mutationFn: async ({ id, approved, note }: { id: string; approved: boolean; note?: string }) => {
      if (approved) {
        return apiRequest("PUT", `/api/admin/renewal-requests/${id}/approve`, {
          motivo: note && note.trim() ? note.trim() : "Pagamento aprovado",
        });
      }
      return apiRequest("PATCH", `/api/admin/renewal-requests/${id}/decision`, { approved: false, note });
    },
    onSuccess: () => {
      toast({ title: "Decisão processada", description: "A decisão foi registrada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["adminRenewalRequests"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao processar decisão", description: err?.message || "Erro inesperado." });
    },
  });

  if (isLoading) {
    return <LoadingSpinner text="Carregando solicitações..." />;
  }

  if (error) {
    return <ErrorMessage title="Erro ao carregar solicitações" message={(error as any)?.message} />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Solicitações de Renovação</h1>
      {requests.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma solicitação pendente no momento.</p>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => (
            <Card key={req._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Solicitação #{req._id.slice(-6)}</CardTitle>
                        <CardDescription>
                          Personal: <strong>{req.personalTrainerId?.nome}</strong> ({req.personalTrainerId?.email})
                        </CardDescription>
                    </div>
                    <Badge variant={(req.status === RStatus.PROOF_SUBMITTED || req.status === RStatus.PAYMENT_PROOF_UPLOADED) ? 'default' : 'secondary'}>
                        {statusLabel(req.status)}
                    </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p><strong>Plano solicitado:</strong> {req.planIdRequested?.nome || "Manter categoria"}</p>
                
                {(req.status === RStatus.REQUESTED || req.status === RStatus.PENDING) && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Label htmlFor={`link-${req._id}`} className="font-semibold">Enviar Link de Pagamento</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`link-${req._id}`}
                        placeholder="https://seu-link-de-pagamento.com"
                        value={paymentLinks[req._id] || ""}
                        onChange={(e) => setPaymentLinks({ ...paymentLinks, [req._id]: e.target.value })}
                        disabled={sendLinkMutation.isPending}
                      />
                      <Button
                        onClick={() => {
                          const link = paymentLinks[req._id];
                          if (!link) {
                            toast({ variant: "destructive", title: "Campo vazio", description: "Insira um link antes de enviar." });
                            return;
                          }
                          sendLinkMutation.mutate({ id: req._id, link });
                        }}
                        disabled={sendLinkMutation.isPending}
                      >
                        {sendLinkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Enviar
                      </Button>
                    </div>
                  </div>
                )}

                {(req.status === RStatus.PROOF_SUBMITTED || req.status === RStatus.PAYMENT_PROOF_UPLOADED) && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {req.proof && (
                      <div>
                        <Label className="font-semibold">Comprovante Enviado:</Label>
                        {req.proof.kind === 'link' && (
                          <a href={req.proof.url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all text-sm block mt-1">
                            {req.proof.url}
                          </a>
                        )}
                        {req.proof.kind === 'file' && (
                          <div className="text-sm flex items-center gap-2 mt-1">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span>{req.proof.filename}</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-primary"
                              onClick={() => handleDownloadProof(req._id, req.proof?.filename)}
                              disabled={downloadingId === req._id}
                            >
                              {downloadingId === req._id ? <Loader2 className="h-4 h-4 animate-spin" /> : <Download className="h-3 w-3" />}
                              {downloadingId === req._id ? 'Baixando...' : 'Baixar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor={`note-${req._id}`} className="font-semibold">Observação (Opcional)</Label>
                      <Textarea
                        id={`note-${req._id}`}
                        placeholder="Adicione uma nota sobre a aprovação ou rejeição..."
                        value={decisionNotes[req._id] || ""}
                        onChange={(e) => setDecisionNotes({ ...decisionNotes, [req._id]: e.target.value })}
                        disabled={makeDecisionMutation.isPending}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => makeDecisionMutation.mutate({ id: req._id, approved: true, note: decisionNotes[req._id] })}
                        disabled={makeDecisionMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {makeDecisionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Aprovar Pagamento
                      </Button>
                      <Button
                        onClick={() => makeDecisionMutation.mutate({ id: req._id, approved: false, note: decisionNotes[req._id] })}
                        disabled={makeDecisionMutation.isPending}
                        variant="destructive"
                      >
                        {makeDecisionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}