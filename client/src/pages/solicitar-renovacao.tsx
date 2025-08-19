// client/src/pages/solicitar-renovacao.tsx
import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, Link as LinkIcon, Upload, CheckCircle, Clock, XCircle, Zap, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Tipos de Dados e Constantes (Alinhados com o Backend) ---

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

interface PlanoDisponivel {
  _id: string;
  nome: string;
  descricao?: string;
  limiteAlunos: number;
  preco?: number | string;
  duracao?: number | string;
  tipo?: 'free' | 'paid';
}

interface RenewalRequest {
  _id: string;
  status: RenewalStatus;
  planIdRequested?: { nome?: string; } | null;
  createdAt?: string;
  notes?: string;
  paymentLink?: string;
  paymentDecisionNote?: string;
  proof?: { kind: 'link' | 'file'; url?: string; filename?: string; };
}

function statusLabel(status: RenewalRequest["status"]) {
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
      return "Aprovado — defina o ciclo de alunos";
    case RStatus.REJECTED:
      return "Rejeitado";
    case RStatus.FULFILLED:
      return "Concluído";
    default:
      return status;
  }
}

// --- Componentes da Página ---

const StatusCard: React.FC<{ request: RenewalRequest; onProofSubmit: (payload: { id: string; proof: { link?: string, file?: File } }) => void; isSubmittingProof: boolean }> = ({ request, onProofSubmit, isSubmittingProof }) => {
  const { toast } = useToast();
  const [proofLink, setProofLink] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmitProof = () => {
    if (!proofLink && !proofFile) {
      toast({ variant: 'destructive', title: 'Nenhum comprovante', description: 'Por favor, insira um link ou anexe um arquivo.' });
      return;
    }
    onProofSubmit({ id: request._id, proof: { link: proofLink, file: proofFile || undefined } });
  };

  const statusInfoMap: Record<RenewalStatus, { title: string; description: string; icon: React.ElementType; color: string }> = {
    [RStatus.REQUESTED]: { title: "Solicitação Enviada", description: "Sua solicitação foi enviada para o administrador. Aguarde o envio do link para pagamento.", icon: Clock, color: "text-blue-600" },
    [RStatus.PENDING]: { title: "Solicitação Enviada", description: "Sua solicitação foi enviada para o administrador. Aguarde o envio do link para pagamento.", icon: Clock, color: "text-blue-600" },
    [RStatus.LINK_SENT]: { title: "Aguardando Pagamento", description: "O administrador enviou o link para pagamento. Efetue o pagamento e anexe o comprovante abaixo.", icon: LinkIcon, color: "text-orange-600" },
    [RStatus.PAYMENT_LINK_SENT]: { title: "Aguardando Pagamento", description: "O administrador enviou o link para pagamento. Efetue o pagamento e anexe o comprovante abaixo.", icon: LinkIcon, color: "text-orange-600" },
    [RStatus.PROOF_SUBMITTED]: { title: "Comprovante Enviado", description: "Seu comprovante foi enviado. Aguarde a validação pelo administrador.", icon: Upload, color: "text-purple-600" },
    [RStatus.PAYMENT_PROOF_UPLOADED]: { title: "Comprovante Enviado", description: "Seu comprovante foi enviado. Aguarde a validação pelo administrador.", icon: Upload, color: "text-purple-600" },
    [RStatus.APPROVED]: { title: "Pagamento Aprovado!", description: "Seu pagamento foi aprovado! Agora você precisa definir quais alunos continuarão no seu plano.", icon: CheckCircle, color: "text-green-600" },
    [RStatus.CYCLE_ASSIGNMENT_PENDING]: { title: "Pagamento Aprovado!", description: "Seu pagamento foi aprovado! Agora você precisa definir quais alunos continuarão no seu plano.", icon: CheckCircle, color: "text-green-600" },
    [RStatus.REJECTED]: { title: "Pagamento Rejeitado", description: "Seu comprovante foi analisado e rejeitado. Verifique a observação do administrador.", icon: XCircle, color: "text-red-600" },
    [RStatus.FULFILLED]: { title: "Ciclo Concluído", description: "Este ciclo de renovação foi finalizado com sucesso.", icon: CheckCircle, color: "text-green-700" }
  };

  const statusInfo = statusInfoMap[request.status] || { title: "Status Desconhecido", description: "Ocorreu um problema ao identificar o status.", icon: Info, color: "text-gray-600" };
  const Icon = statusInfo.icon;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${statusInfo.color}`} />
          <div>
            <CardTitle className={statusInfo.color}>{statusInfo.title}</CardTitle>
            <CardDescription>{statusInfo.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {request.paymentLink && (
          <div className="space-y-2">
            <Label className="font-semibold">Link para Pagamento:</Label>
            <a href={request.paymentLink} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline break-all">{request.paymentLink}</a>
          </div>
        )}
        
        {(request.status === RStatus.LINK_SENT || request.status === RStatus.PAYMENT_LINK_SENT) && (
          <div className="p-4 border-t space-y-4">
            <Label className="font-semibold">Anexar Comprovante</Label>
            <div className="space-y-2">
              <Input placeholder="Cole o link do comprovante aqui" value={proofLink} onChange={(e) => { setProofLink(e.target.value); setProofFile(null); }} disabled={isSubmittingProof} />
              <p className="text-xs text-center text-muted-foreground my-2">OU</p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full" disabled={isSubmittingProof}>
                <Upload className="w-4 h-4 mr-2" /> Anexar Arquivo
              </Button>
              <Input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { setProofFile(e.target.files?.[0] || null); setProofLink(''); }} accept="image/jpeg,image/png,application/pdf" />
              {proofFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {proofFile.name}</p>}
            </div>
            <Button onClick={handleSubmitProof} disabled={isSubmittingProof} className="w-full">
              {isSubmittingProof && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Comprovante
            </Button>
          </div>
        )}
        
        {request.status === RStatus.REJECTED && request.paymentDecisionNote && (
          <Alert variant="destructive">
            <AlertTitle>Motivo da Rejeição</AlertTitle>
            <AlertDescription>{request.paymentDecisionNote}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const PlanCard: React.FC<{ plano: PlanoDisponivel; onSelect: (id: string) => void; isSubmitting: boolean }> = ({ plano, onSelect, isSubmitting }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <CardTitle>{plano.nome}</CardTitle>
      <CardDescription>{plano.descricao}</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow space-y-2">
      <p><strong>Limite:</strong> {plano.limiteAlunos} alunos</p>
      <p><strong>Preço:</strong> {typeof plano.preco === 'number' ? `R$ ${plano.preco.toFixed(2)}` : plano.preco}</p>
      <p><strong>Duração:</strong> {plano.duracao} dias</p>
    </CardContent>
    <CardFooter>
      <Button className="w-full" onClick={() => onSelect(plano._id)} disabled={isSubmitting}>
        Solicitar Plano
      </Button>
    </CardFooter>
  </Card>
);

// --- Página Principal ---
export default function SolicitarRenovacaoPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: renewals = [], isLoading: loadingList, error: errorList } = useQuery<RenewalRequest[]>({
    queryKey: ["personal-renewals", "list"],
    queryFn: () => fetchWithAuth(`/api/personal/renewal-requests`, {}, "personalAdmin"),
    refetchOnWindowFocus: true,
  });

  const { data: planos = [], isLoading: loadingPlanos, error: errorPlanos } = useQuery<PlanoDisponivel[]>({
    queryKey: ["planosDisponiveis"],
    queryFn: () => fetchWithAuth(`/api/personal/planos-disponiveis`, {}, "personalAdmin"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: planHistory, isLoading: loadingPlanHistory, error: errorPlanHistory } = useQuery<{
    hasEverHadPlan: boolean;
    canActivateFreePlan: boolean;
  }>({
    queryKey: ["personal-plan-history"],
    queryFn: () => fetchWithAuth(`/api/personal/plan-history`, {}, "personalAdmin"),
    staleTime: 5 * 60 * 1000,
  });

  const openRequest = useMemo(() => {
    const OPEN_STATUSES: RenewalStatus[] = [
      RStatus.REQUESTED, RStatus.LINK_SENT, RStatus.PROOF_SUBMITTED,
      RStatus.APPROVED, RStatus.CYCLE_ASSIGNMENT_PENDING,
      RStatus.PENDING, RStatus.PAYMENT_LINK_SENT, RStatus.PAYMENT_PROOF_UPLOADED,
    ];
    return renewals.find(r => OPEN_STATUSES.includes(r.status));
  }, [renewals]);

  const hasOpenCycleRequest = useMemo(() => {
    if (!openRequest) return false;
    const cycleStatuses: RenewalStatus[] = [RStatus.APPROVED, RStatus.CYCLE_ASSIGNMENT_PENDING];
    return cycleStatuses.includes(openRequest.status);
  }, [openRequest]);
  
  const closedRequests = useMemo(() => {
    const closedStatuses: RenewalStatus[] = [RStatus.FULFILLED, RStatus.REJECTED];
    return renewals.filter(r => closedStatuses.includes(r.status));
  }, [renewals]);

  const solicitarMutation = useMutation({
    mutationFn: (planId: string) => apiRequest("POST", `/api/personal/renewal-requests`, { planIdRequested: planId }),
    onSuccess: async () => {
      toast({ title: "Solicitação enviada", description: "Aguarde o administrador enviar o link de pagamento." });
      await queryClient.invalidateQueries({ queryKey: ["personal-renewals", "list"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao solicitar", description: error?.message || "Não foi possível criar a solicitação." });
    },
  });
  
  const submitProofMutation = useMutation({
    mutationFn: async ({ id, proof }: { id: string; proof: { link?: string; file?: File } }) => {
      const formData = new FormData();
      if (proof.link) {
        formData.append('paymentProofUrl', proof.link);
      }
      if (proof.file) {
        formData.append('paymentProof', proof.file);
      }
      return fetchWithAuth(`/api/personal/renewal-requests/${id}/proof`, {
        method: "POST",
        body: formData,
      }, "personalAdmin");
    },
    onSuccess: async () => {
      toast({ title: "Comprovante enviado!", description: "Aguarde a validação do administrador." });
      await queryClient.invalidateQueries({ queryKey: ["personal-renewals", "list"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao enviar", description: error?.message || "Não foi possível enviar o comprovante." });
    }
  });

  const solicitarTokenMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/personal/renewal-requests`, { isTokenRequest: true }),
    onSuccess: async () => {
      toast({ title: "Solicitação de Token Enviada", description: "Aguarde o administrador enviar o link de pagamento." });
      await queryClient.invalidateQueries({ queryKey: ["personal-renewals", "list"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao solicitar token", description: error?.message || "Não foi possível criar a solicitação." });
    },
  });

  // <<< INÍCIO DA NOVA LÓGICA PARA ATIVAR PLANO FREE >>>
  const activateFreePlanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/personal/activate-free-plan"),
    onSuccess: async () => {
        toast({
            title: "Plano Free Ativado!",
            description: "Você já pode começar a usar a plataforma. Redirecionando...",
        });
        // Invalida as queries relacionadas para que o estado seja atualizado
        await queryClient.invalidateQueries({ queryKey: ["personalPlanStatus"] });
        await queryClient.invalidateQueries({ queryKey: ["personal-plan-history"] });
        // Navega para o dashboard após a ativação.
        navigate("/");
    },
    onError: (error: any) => {
        toast({
            variant: "destructive",
            title: "Erro ao Ativar Plano",
            description: error?.message || "Não foi possível ativar o Plano Free.",
        });
    },
  });

  const freePlan = planos.find(p => p.tipo === 'free');
  // <<< FIM DA NOVA LÓGICA >>>

  if (loadingList || loadingPlanos || loadingPlanHistory) {
    return <LoadingSpinner text="Carregando dados de renovação..." />;
  }

  if (errorList || errorPlanos || errorPlanHistory) {
    return <ErrorMessage title="Erro ao Carregar" message={errorList?.message || errorPlanos?.message || errorPlanHistory?.message || "Não foi possível carregar a página."} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Planos e Renovações</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas solicitações e escolha seu próximo plano.</p>
      </div>

      {hasOpenCycleRequest && (
        <Card className="border-green-400 bg-green-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2"><CheckCircle /> Solicitação Aprovada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-4">
              Seu pagamento foi aprovado! O próximo passo é selecionar quais dos seus alunos continuarão ativos neste novo ciclo.
            </p>
            <Button size="lg" onClick={() => navigate("/renovar-plano")}>
              Definir Alunos do Novo Ciclo
            </Button>
          </CardContent>
        </Card>
      )}

      {openRequest && !hasOpenCycleRequest && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Solicitação em Andamento</h2>
          <StatusCard request={openRequest} onProofSubmit={submitProofMutation.mutate} isSubmittingProof={submitProofMutation.isPending} />
        </div>
      )}

      {!openRequest && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Escolha seu Plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* <<< INÍCIO DA ALTERAÇÃO >>> */}
            {/* Renderiza o card do Plano Free apenas se o usuário nunca ativou nenhum plano */}
            {freePlan && planHistory?.canActivateFreePlan && (
              <Card className="flex flex-col bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="text-blue-600" />
                    {freePlan.nome}
                  </CardTitle>
                  <CardDescription>{freePlan.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <p><strong>Limite:</strong> {freePlan.limiteAlunos} alunos</p>
                  <p><strong>Preço:</strong> Gratuito</p>
                  <p><strong>Duração:</strong> {freePlan.duracao} dias</p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => activateFreePlanMutation.mutate()}
                    disabled={activateFreePlanMutation.isPending}
                  >
                    {activateFreePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ativar Plano Gratuito
                  </Button>
                </CardFooter>
              </Card>
            )}
            {/* Filtra a lista de planos para não exibir o do tipo "free" */}
            {planos.filter(plano => plano.tipo !== 'free').map(plano => (
              <PlanCard key={plano._id} plano={plano} onSelect={solicitarMutation.mutate} isSubmitting={solicitarMutation.isPending} />
            ))}
            {/* <<< FIM DA ALTERAÇÃO >>> */}
            <Card className="flex flex-col bg-amber-50 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="text-amber-600" />
                  Token Avulso
                </CardTitle>
                <CardDescription>Adicione uma vaga extra temporária ao seu plano atual.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p><strong>Limite:</strong> +1 aluno</p>
                <p><strong>Preço:</strong> R$ 14,90</p>
                <p><strong>Duração:</strong> 30 dias</p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-amber-500 hover:bg-amber-600" 
                  onClick={() => solicitarTokenMutation.mutate()} 
                  disabled={solicitarTokenMutation.isPending}
                >
                  {solicitarTokenMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Solicitar Token
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
      
      {closedRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 mt-12">Histórico de Solicitações</h2>
          <div className="space-y-4">
            {closedRequests.map(req => (
              <Card key={req._id} className="bg-muted/50">
                 <CardHeader>
                   <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-semibold">
                        Plano: {req.planIdRequested?.nome || 'N/A'}
                      </CardTitle>
                      <Badge variant={req.status === RStatus.REJECTED ? 'destructive' : 'default'}>
                        {statusLabel(req.status)}
                      </Badge>
                   </div>
                   <CardDescription>
                     Solicitado em: {req.createdAt ? format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                   </CardDescription>
                 </CardHeader>
                 { (req.paymentDecisionNote || req.notes) && 
                    <CardContent className="pt-0">
                      {req.notes && <p className="text-sm"><strong>Sua observação:</strong> {req.notes}</p>}
                      {req.paymentDecisionNote && <p className="text-sm"><strong>Obs. do Admin:</strong> {req.paymentDecisionNote}</p>}
                    </CardContent>
                 }
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}