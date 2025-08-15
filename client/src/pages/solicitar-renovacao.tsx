// client/src/pages/solicitar-renovacao.tsx
// <<< CORREÇÃO: 'useEffect' removido da importação do React >>>
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, uploadFileWithPresignedUrl } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// <<< CORREÇÃO: Importação do 'Checkbox' removida, pois não é utilizada >>>
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function SolicitarRenovacao() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'file' | 'none'>('none'); // Changed: no more 'link' for initial request
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [proofPaymentType, setProofPaymentType] = useState<'link' | 'file'>('file'); // Para comprovante após pagamento
  const [proofPaymentLink, setProofPaymentLink] = useState(""); // Para comprovante após pagamento
  const [proofPaymentFile, setProofPaymentFile] = useState<File | null>(null);
  
  // Refs for mobile input forcing re-render
  const paymentFileInputRef = useRef<HTMLInputElement>(null);
  const proofFileInputRef = useRef<HTMLInputElement>(null);

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

  // Mutação para enviar comprovante após pagamento
  const uploadProof = useMutation({
    mutationFn: async (requestId: string) => {
      console.log('[Upload Proof] Starting upload process...');
      
      if (proofPaymentType === 'link' && proofPaymentLink) {
        // Use legacy upload for URL proof
        const formData = new FormData();
        formData.append('paymentProofUrl', proofPaymentLink);
        console.log('[Upload Proof] Adding URL proof:', proofPaymentLink);

        return fetchWithAuth(`/api/personal/renewal-requests/${requestId}/proof`, {
          method: 'POST',
          body: formData,
        }, 'personalAdmin');
      } else if (proofPaymentType === 'file' && proofPaymentFile) {
        // Use new two-step upload for file proof
        console.log('[Upload Proof] Using two-step upload for file:', {
          name: proofPaymentFile.name,
          size: proofPaymentFile.size,
          type: proofPaymentFile.type
        });

        return uploadFileWithPresignedUrl(requestId, proofPaymentFile, 'personalAdmin');
      } else {
        throw new Error('É necessário fornecer um link de comprovante ou anexar um arquivo.');
      }
    },
    onSuccess: () => {
      console.log('[Upload Proof] Upload successful!');
      toast({ title: "Comprovante enviado", description: "Seu comprovante foi enviado com sucesso!" });
      
      // Force React Query invalidation for mobile compatibility
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
      queryClient.refetchQueries({ queryKey: ["minhasRenewalRequests"] });
      
      // Reset proof form and force input re-render for mobile
      setProofPaymentLink("");
      setProofPaymentFile(null);
      if (proofFileInputRef.current) {
        proofFileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      console.error('[Upload Proof] Upload failed:', error);
      const errorMessage = error?.message || "Erro inesperado ao enviar comprovante.";
      toast({ 
        variant: "destructive", 
        title: "Erro ao enviar comprovante", 
        description: errorMessage 
      });
    },
  });

  // Mutação para solicitar renovação - apenas com comprovante se já pagou
  const createRequest = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      
      if (selectedPlanId) {
        formData.append('planIdRequested', selectedPlanId);
      }
      
      if (notes) {
        formData.append('notes', notes);
      }

      // Personal pode anexar comprovante se já efetuou pagamento antecipadamente
      if (proofType === 'file' && paymentFile) {
        formData.append('paymentProof', paymentFile);
      }
      // Se não tem comprovante, solicita apenas a renovação (admin enviará link)

      return fetchWithAuth('/api/personal/renewal-requests', {
        method: 'POST',
        body: formData,
      }, 'personalAdmin');
    },
    onSuccess: () => {
      toast({ title: "Solicitação enviada", description: "Sua solicitação foi enviada com sucesso!" });
      
      // Force React Query invalidation for mobile compatibility
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
      queryClient.refetchQueries({ queryKey: ["minhasRenewalRequests"] });
      
      // Reset form and force input re-render for mobile
      setSelectedPlanId(null);
      setPaymentFile(null);
      setNotes("");
      setProofType('none');
      if (paymentFileInputRef.current) {
        paymentFileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao solicitar", description: error?.message || "Erro inesperado." });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validação de tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo inválido", 
          description: "Apenas arquivos JPEG, PNG e PDF são permitidos." 
        });
        // Clear the input for mobile compatibility
        if (paymentFileInputRef.current) {
          paymentFileInputRef.current.value = '';
        }
        return;
      }
      
      // Validação de tamanho (5MB - updated from 10MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo muito grande", 
          description: "O arquivo deve ter no máximo 5MB." 
        });
        // Clear the input for mobile compatibility
        if (paymentFileInputRef.current) {
          paymentFileInputRef.current.value = '';
        }
        return;
      }

      setPaymentFile(file);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validação de tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo inválido", 
          description: "Apenas arquivos JPEG, PNG e PDF são permitidos." 
        });
        // Clear the input for mobile compatibility
        if (proofFileInputRef.current) {
          proofFileInputRef.current.value = '';
        }
        return;
      }
      
      // Validação de tamanho (5MB - updated from 10MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          variant: "destructive", 
          title: "Arquivo muito grande", 
          description: "O arquivo deve ter no máximo 5MB." 
        });
        // Clear the input for mobile compatibility
        if (proofFileInputRef.current) {
          proofFileInputRef.current.value = '';
        }
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
          
          {/* Seleção de plano */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

          {/* Formulário de solicitação */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Solicitar Renovação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Opção de comprovante */}
              <div>
                <Label className="text-base font-medium">Já efetuou o pagamento?</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Se já pagou, anexe o comprovante. Caso contrário, faremos uma solicitação e o administrador enviará o link de pagamento.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={proofType === 'none' ? 'default' : 'outline'}
                    onClick={() => setProofType('none')}
                    className="flex-1"
                  >
                    Ainda não paguei
                  </Button>
                  <Button
                    type="button"
                    variant={proofType === 'file' ? 'default' : 'outline'}
                    onClick={() => setProofType('file')}
                    className="flex-1"
                  >
                    Já paguei - Anexar comprovante
                  </Button>
                </div>
              </div>

              {/* Input de arquivo para comprovante */}
              {proofType === 'file' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <Label htmlFor="paymentFile" className="font-medium">Comprovante de Pagamento</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Anexe seu comprovante (JPEG, PNG, PDF - máx 10MB)
                  </p>
                  <Input
                    id="paymentFile"
                    ref={paymentFileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="mt-1"
                  />
                  {paymentFile && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 font-medium">
                        ✓ Arquivo selecionado: {paymentFile.name}
                      </p>
                      <p className="text-xs text-green-600">
                        Tamanho: {(paymentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              )}

              {proofType === 'none' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📋 Sua solicitação será enviada para análise. O administrador enviará um link de pagamento quando aprovado.
                  </p>
                </div>
              )}

              {/* Observações */}
              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre sua solicitação..."
                  className="mt-1"
                />
              </div>

              <Button
                onClick={() => createRequest.mutate()}
                disabled={!selectedPlanId || createRequest.isPending}
                className="w-full"
              >
                {createRequest.isPending ? "Enviando..." : "Solicitar Renovação"}
              </Button>
            </CardContent>
          </Card>
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

            {currentRequest.notes && (
              <p className="mb-4 text-sm text-muted-foreground">
                Observações: {currentRequest.notes}
              </p>
            )}

            {/* Mostrar comprovante enviado */}
            {currentRequest.proof && (
              <div className="mb-4">
                <p className="text-sm font-medium">Comprovante enviado:</p>
                {currentRequest.proof.kind === 'link' && (
                  <a
                    href={currentRequest.proof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all text-sm"
                  >
                    {currentRequest.proof.url}
                  </a>
                )}
                {currentRequest.proof.kind === 'file' && (
                  <p className="text-sm">
                    Arquivo: {currentRequest.proof.filename}
                    <a
                      href={`/api/personal/renewal-requests/${currentRequest._id}/proof/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary underline"
                    >
                      Baixar
                    </a>
                  </p>
                )}
              </div>
            )}

            {currentRequest.status === "pending" && (
              <p>Sua solicitação foi recebida e está sendo processada.</p>
            )}

            {(currentRequest.status === "payment_link_sent" || currentRequest.status === "link_sent") && currentRequest.paymentLink && (
              <>
                <div className="mb-4">
                  <p className="mb-2">Link de pagamento disponível!</p>
                  <Button 
                    onClick={() => window.open(currentRequest.paymentLink, '_blank')}
                    className="w-full mb-4 bg-green-600 hover:bg-green-700"
                  >
                    💳 Pagar Agora
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Após efetuar o pagamento, envie o comprovante:</p>
                  
                  {/* Tipo de comprovante */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Como você quer enviar o comprovante?</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={proofPaymentType === 'file' ? 'default' : 'outline'}
                        onClick={() => setProofPaymentType('file')}
                        className="flex-1"
                        size="sm"
                      >
                        📎 Upload de arquivo
                      </Button>
                      <Button
                        type="button"
                        variant={proofPaymentType === 'link' ? 'default' : 'outline'}
                        onClick={() => setProofPaymentType('link')}
                        className="flex-1"
                        size="sm"
                      >
                        🔗 Link do comprovante
                      </Button>
                    </div>
                  </div>

                  {/* Input de arquivo para comprovante */}
                  {proofPaymentType === 'file' && (
                    <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <Label htmlFor="proofFile" className="font-medium">Comprovante de Pagamento</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Anexe o comprovante do pagamento (JPEG, PNG, PDF - máx 10MB)
                      </p>
                      <Input
                        id="proofFile"
                        ref={proofFileInputRef}
                        type="file"
                        onChange={handleProofFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="mb-2"
                      />
                      {proofPaymentFile && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ Comprovante selecionado: {proofPaymentFile.name}
                          </p>
                          <p className="text-xs text-green-600">
                            Tamanho: {(proofPaymentFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input de link para comprovante */}
                  {proofPaymentType === 'link' && (
                    <div className="mb-4">
                      <Label htmlFor="proofLink" className="font-medium">Link do Comprovante</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Cole aqui o link do comprovante de pagamento
                      </p>
                      <Input
                        id="proofLink"
                        placeholder="https://exemplo.com/comprovante.pdf"
                        value={proofPaymentLink}
                        onChange={(e) => setProofPaymentLink(e.target.value)}
                        className="mb-2"
                      />
                      {proofPaymentLink && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ Link informado: {proofPaymentLink.length > 50 ? proofPaymentLink.substring(0, 50) + '...' : proofPaymentLink}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => uploadProof.mutate(currentRequest._id)}
                    disabled={uploadProof.isPending || 
                             (proofPaymentType === 'link' && !proofPaymentLink) || 
                             (proofPaymentType === 'file' && !proofPaymentFile)}
                    className="w-full"
                  >
                    {uploadProof.isPending ? "Enviando..." : "📤 Enviar Comprovante"}
                  </Button>
                </div>
              </>
            )}

            {(currentRequest.status === "payment_proof_uploaded" || currentRequest.status === "proof_submitted") && (
              <p>Comprovante enviado. Aguarde a análise do administrador.</p>
            )}

            {currentRequest.status === "approved" && (
              <>
                <p className="text-green-600 font-medium">Solicitação aprovada! Seu plano foi renovado.</p>
                {currentRequest.paymentDecisionNote && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Observação: {currentRequest.paymentDecisionNote}
                  </p>
                )}
                <Button
                  className="mt-4"
                  onClick={() => navigate("/renovar-plano")}
                >
                  Selecionar Alunos no Novo Ciclo
                </Button>
              </>
            )}

            {currentRequest.status === "rejected" && (
              <>
                <p className="text-red-600 font-medium">Solicitação rejeitada.</p>
                {currentRequest.paymentDecisionNote && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Motivo: {currentRequest.paymentDecisionNote}
                  </p>
                )}
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
    case "requested":
      return "Aguardando análise da solicitação";
    case "payment_link_sent":
    case "link_sent":
      return "Link de pagamento enviado";
    case "payment_proof_uploaded":
    case "proof_submitted":
      return "Comprovante enviado. Aguarde validação";
    case "approved":
      return "Pagamento aprovado. Renovação concluída";
    case "rejected":
      return "Pagamento rejeitado";
    default:
      return status;
  }
}