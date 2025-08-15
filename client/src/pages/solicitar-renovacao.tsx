// client/src/pages/solicitar-renovacao.tsx
// <<< CORREÇÃO: 'useEffect' removido da importação do React >>>
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// <<< CORREÇÃO: Importação do 'Checkbox' removida, pois não é utilizada >>>
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  // outros campos omitidos
}

export default function SolicitarRenovacao() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'link' | 'file'>('link');
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

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

  // Mutação para solicitar renovação com suporte a arquivo e link
  const createRequest = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      
      if (selectedPlanId) {
        formData.append('planIdRequested', selectedPlanId);
      }
      
      if (notes) {
        formData.append('notes', notes);
      }

      if (proofType === 'link' && paymentLink) {
        formData.append('paymentLink', paymentLink);
      } else if (proofType === 'file' && paymentFile) {
        formData.append('paymentProof', paymentFile);
      } else {
        throw new Error('É necessário fornecer um link de pagamento ou anexar um comprovante.');
      }

      const response = await fetch('/api/personal/renewal-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensagem || 'Erro inesperado');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Solicitação enviada", description: "Sua solicitação foi enviada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["minhasRenewalRequests"] });
      // Reset form
      setSelectedPlanId(null);
      setPaymentLink("");
      setPaymentFile(null);
      setNotes("");
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
        return;
      }
      
      // Validação de tamanho (10MB)
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

          {/* Formulário de comprovante */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Comprovante de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de comprovante */}
              <div>
                <Label className="text-base font-medium">Como você quer enviar o comprovante?</Label>
                <RadioGroup value={proofType} onValueChange={(value: 'link' | 'file') => setProofType(value)} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="link" id="link" />
                    <Label htmlFor="link">Link/URL do comprovante</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="file" id="file" />
                    <Label htmlFor="file">Upload do arquivo (JPEG, PNG, PDF)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Input de link */}
              {proofType === 'link' && (
                <div>
                  <Label htmlFor="paymentLink">Link do comprovante</Label>
                  <Input
                    id="paymentLink"
                    value={paymentLink}
                    onChange={(e) => setPaymentLink(e.target.value)}
                    placeholder="Cole aqui o link do comprovante de pagamento"
                    className="mt-1"
                  />
                </div>
              )}

              {/* Input de arquivo */}
              {proofType === 'file' && (
                <div>
                  <Label htmlFor="paymentFile">Arquivo do comprovante</Label>
                  <Input
                    id="paymentFile"
                    type="file"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="mt-1"
                  />
                  {paymentFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Arquivo selecionado: {paymentFile.name} ({(paymentFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
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
                disabled={!selectedPlanId || createRequest.isPending || 
                         (proofType === 'link' && !paymentLink) || 
                         (proofType === 'file' && !paymentFile)}
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
      return "Aguardando processamento";
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