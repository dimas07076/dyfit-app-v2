// client/src/pages/solicitar-renovacao.tsx
import { useState } from "react"; 
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/apiClient"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Download, Loader2 } from "lucide-react";

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
  proof?: {
    kind: 'link' | 'file';
    url?: string;
    filename?: string;
    fileId?: string;
  };
  notes?: string;
  linkSentAt?: string;
  proofUploadedAt?: string;
  paymentDecisionAt?: string;
  paymentDecisionNote?: string;
}

export default function SolicitarRenovacao() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'file' | 'none'>('none');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [proofPaymentType, setProofPaymentType] = useState<'link' | 'file'>('file');
  const [proofPaymentLink, setProofPaymentLink] = useState("");
  const [proofPaymentFile, setProofPaymentFile] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const {
    data: planos,
    isLoading: loadingPlanos,
    error: planosError,
  } = useQuery<PlanoDisponivel[]>({
    queryKey: ["planosDisponiveis"],
    queryFn: () => fetchWithAuth("/api/personal/planos-disponiveis"),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: renewalRequests,
    isLoading: loadingRequests,
    error: requestsError,
  } = useQuery<RenewalRequest[]>({
    queryKey: ["minhasRenewalRequests"],
    queryFn: () => fetchWithAuth("/api/personal/renewal-requests"),
  });

  const currentRequest = renewalRequests && renewalRequests.length > 0 ? renewalRequests[0] : null;
  
  const handleDownloadProof = async (requestId: string, filename?: string) => {
    setDownloadingId(requestId);
    try {
      const response = await fetchWithAuth<Response>(
        `/api/personal/renewal-requests/${requestId}/proof/download`, 
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
      console.error("[Download Personal] Erro ao baixar o arquivo:", err);
      toast({
        variant: "destructive",
        title: "Erro no Download",
        description: err.message || "Não foi possível baixar o comprovante.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const uploadProof = useMutation({
    mutationFn: async (requestId: string) => {
      const formData = new FormData();
      if (proofPaymentType === 'link' && proofPaymentLink) {
        formData.append('paymentProofUrl', proofPaymentLink);
      } else if (proofPaymentType === 'file' && proofPaymentFile) {
        formData.append('paymentProof', proofPaymentFile);
      } else {
        throw new Error('É necessário fornecer um link de comprovante ou anexar um arquivo.');
      }
      return fetchWithAuth(`/api/personal/renewal-requests/${requestId}/proof`, {
        method: 'POST',
        body: formData,
      }, 'personalAdmin');
    },
    onSuccess: () => {
      toast({ title: "Comprovante enviado", description: "Seu comprovante foi enviado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
      setProofPaymentLink("");
      setProofPaymentFile(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Erro inesperado ao enviar comprovante.";
      toast({ 
        variant: "destructive", 
        title: "Erro ao enviar comprovante", 
        description: errorMessage 
      });
    },
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (selectedPlanId) formData.append('planIdRequested', selectedPlanId);
      if (notes) formData.append('notes', notes);
      if (proofType === 'file' && paymentFile) formData.append('paymentProof', paymentFile);
      return fetchWithAuth('/api/personal/renewal-requests', {
        method: 'POST',
        body: formData,
      }, 'personalAdmin');
    },
    onSuccess: () => {
      toast({ title: "Solicitação enviada", description: "Sua solicitação foi enviada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
      setSelectedPlanId(null);
      setPaymentFile(null);
      setNotes("");
      setProofType('none');
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao solicitar", description: error?.message || "Erro inesperado." });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo inválido", 
          description: "Apenas arquivos JPEG, PNG e PDF são permitidos." 
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo muito grande", 
          description: "O arquivo deve ter no máximo 10MB." 
        });
        return;
      }
      setPaymentFile(file);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo inválido", 
          description: "Apenas arquivos JPEG, PNG e PDF são permitidos." 
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo muito grande", 
          description: "O arquivo deve ter no máximo 10MB." 
        });
        return;
      }
      setProofPaymentFile(file);
    }
  };

  if (loadingPlanos || loadingRequests) {
    return <p className="p-4">Carregando...</p>;
  }

  if (planosError) {
    return <p className="p-4">Erro ao carregar planos disponíveis: {(planosError as any)?.message}</p>;
  }

  if (requestsError) {
    return <p className="p-4">Erro ao carregar solicitações: {(requestsError as any)?.message}</p>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Solicitar Renovação de Plano</h1>
      {!currentRequest && (
        <>
          <p className="mb-4 text-muted-foreground">
            Você não possui solicitações em andamento. Escolha um plano e envie sua solicitação de renovação.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {planos?.map((plano) => (
              <Card
                key={plano._id}
                onClick={() => setSelectedPlanId(plano._id)}
                className={`cursor-pointer ${selectedPlanId === plano._id ? "border-primary ring-2 ring-primary" : ""}`}
              >
                <CardHeader><CardTitle>{plano.nome}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{plano.descricao}</p>
                  <p className="text-sm">Limite de alunos: <strong>{plano.limiteAlunos}</strong></p>
                  <p className="text-sm">Preço: {plano.tipo === "free" ? "Gratuito" : plano.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  <p className="text-sm">Duração: {plano.duracao} dias</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Solicitar Renovação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">Já efetuou o pagamento?</Label>
                <p className="text-sm text-muted-foreground mb-2">Se já pagou, anexe o comprovante. Caso contrário, faremos uma solicitação e o administrador enviará o link de pagamento.</p>
                <div className="flex gap-2">
                  <Button type="button" variant={proofType === 'none' ? 'default' : 'outline'} onClick={() => setProofType('none')} className="flex-1">Ainda não paguei</Button>
                  <Button type="button" variant={proofType === 'file' ? 'default' : 'outline'} onClick={() => setProofType('file')} className="flex-1">Já paguei - Anexar comprovante</Button>
                </div>
              </div>
              {proofType === 'file' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <Label htmlFor="paymentFile" className="font-medium">Comprovante de Pagamento</Label>
                  <p className="text-sm text-muted-foreground mb-2">Anexe seu comprovante (JPEG, PNG, PDF - máx 10MB)</p>
                  <Input id="paymentFile" type="file" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" className="mt-1" />
                  {paymentFile && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 font-medium">✓ Arquivo selecionado: {paymentFile.name}</p>
                      <p className="text-xs text-green-600">Tamanho: {(paymentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  )}
                </div>
              )}
              {proofType === 'none' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">📋 Sua solicitação será enviada para análise. O administrador enviará um link de pagamento quando aprovado.</p>
                </div>
              )}
              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adicione observações sobre sua solicitação..." className="mt-1" />
              </div>
              <Button onClick={() => createRequest.mutate()} disabled={!selectedPlanId || createRequest.isPending} className="w-full">
                {createRequest.isPending ? "Enviando..." : "Solicitar Renovação"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {currentRequest && (
        <Card className="mt-4 max-w-xl">
          <CardHeader><CardTitle>Solicitação #{currentRequest._id.slice(-6)}</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2">Plano solicitado: <strong>{currentRequest.planIdRequested?.nome || "Manter categoria"}</strong></p>
            <p className="mb-4">Status: {statusLabel(currentRequest.status)}</p>

            {currentRequest.proof && (
              <div className="mb-4">
                <p className="text-sm font-medium">Comprovante enviado:</p>
                {currentRequest.proof.kind === 'link' && (
                  <a href={currentRequest.proof.url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all text-sm">{currentRequest.proof.url}</a>
                )}
                {currentRequest.proof.kind === 'file' && (
                  <div className="text-sm flex items-center gap-2">
                    <span>Arquivo: {currentRequest.proof.filename}</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-primary"
                      onClick={() => handleDownloadProof(currentRequest._id, currentRequest.proof?.filename)}
                      disabled={downloadingId === currentRequest._id}
                    >
                      {downloadingId === currentRequest._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="ml-1 h-3 w-3" />}
                      {downloadingId === currentRequest._id ? 'Baixando...' : 'Baixar'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {currentRequest.status === "pending" && <p>Sua solicitação foi recebida e está sendo processada.</p>}
            
            {(currentRequest.status === "payment_link_sent" || currentRequest.status === "link_sent") && currentRequest.paymentLink && (
              <>
                <div className="mb-4">
                  <p className="mb-2">Link de pagamento disponível!</p>
                  <Button onClick={() => window.open(currentRequest.paymentLink, '_blank')} className="w-full mb-4 bg-green-600 hover:bg-green-700">💳 Pagar Agora</Button>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Após efetuar o pagamento, envie o comprovante:</p>
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Como você quer enviar o comprovante?</Label>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant={proofPaymentType === 'file' ? 'default' : 'outline'} onClick={() => setProofPaymentType('file')} className="flex-1" size="sm">📎 Upload de arquivo</Button>
                      <Button type="button" variant={proofPaymentType === 'link' ? 'default' : 'outline'} onClick={() => setProofPaymentType('link')} className="flex-1" size="sm">🔗 Link do comprovante</Button>
                    </div>
                  </div>
                  {proofPaymentType === 'file' && (
                    <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <Label htmlFor="proofFile" className="font-medium">Comprovante de Pagamento</Label>
                      <p className="text-sm text-muted-foreground mb-2">Anexe o comprovante do pagamento (JPEG, PNG, PDF - máx 10MB)</p>
                      <Input id="proofFile" type="file" onChange={handleProofFileChange} accept=".jpg,.jpeg,.png,.pdf" className="mb-2" />
                      {proofPaymentFile && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 font-medium">✓ Comprovante selecionado: {proofPaymentFile.name}</p>
                          <p className="text-xs text-green-600">Tamanho: {(proofPaymentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                    </div>
                  )}
                  {proofPaymentType === 'link' && (
                    <div className="mb-4">
                      <Label htmlFor="proofLink" className="font-medium">Link do Comprovante</Label>
                      <p className="text-sm text-muted-foreground mb-2">Cole aqui o link do comprovante de pagamento</p>
                      <Input id="proofLink" placeholder="https://exemplo.com/comprovante.pdf" value={proofPaymentLink} onChange={(e) => setProofPaymentLink(e.target.value)} className="mb-2" />
                      {proofPaymentLink && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 font-medium">✓ Link informado: {proofPaymentLink.length > 50 ? proofPaymentLink.substring(0, 50) + '...' : proofPaymentLink}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <Button onClick={() => uploadProof.mutate(currentRequest._id)} disabled={uploadProof.isPending || (proofPaymentType === 'link' && !proofPaymentLink) || (proofPaymentType === 'file' && !proofPaymentFile)} className="w-full">
                    {uploadProof.isPending ? "Enviando..." : "📤 Enviar Comprovante"}
                  </Button>
                </div>
              </>
            )}
            
            {(currentRequest.status === "payment_proof_uploaded" || currentRequest.status === "proof_submitted") && (<p>Comprovante enviado. Aguarde a análise do administrador.</p>)}
            {/* <<< INÍCIO DA ALTERAÇÃO >>> */}
            {currentRequest.status === "approved" && (
                <>
                    <p className="text-green-600 font-medium">Solicitação aprovada! Seu plano foi renovado.</p>
                    <Button className="mt-4 w-full" onClick={() => navigate("/renovar-plano")}>
                        Selecionar Alunos no Novo Ciclo
                    </Button>
                </>
            )}
            {/* <<< FIM DA ALTERAÇÃO >>> */}
            {currentRequest.status === "rejected" && (<><p className="text-red-600 font-medium">Solicitação rejeitada.</p>{currentRequest.paymentDecisionNote && <p className="text-sm text-muted-foreground mt-2">Motivo: {currentRequest.paymentDecisionNote}</p>}</>)}
          </CardContent>
        </Card>
      )}
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
      return "Comprovante anexado, aguarde validação";
    case "approved":
      return "Aprovado";
    case "rejected":
      return "Rejeitado";
    default:
      return status;
  }
}