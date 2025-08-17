import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/apiClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Tipos
interface PlanoDisponivel {
  _id: string;
  nome: string;
  limiteAlunos: number;
  preco?: number | string;
  duracao?: number | string;
  tipo?: "free" | "paid" | string;
}

interface RenewalRequest {
  _id: string;
  status:
    | "pending"
    | "payment_link_sent"
    | "payment_proof_uploaded"
    | "approved"
    | "APPROVED"
    | "cycle_assignment_pending"
    | "rejected"
    | "FULFILLED";
  createdAt?: string;
  notes?: string;
  paymentLink?: string;
  proof?:
    | { kind: "link"; url: string; uploadedAt?: string }
    | {
        kind: "file";
        fileId: string;
        filename?: string;
        contentType?: string;
        size?: number;
        uploadedAt?: string;
      };
  personalTrainerId?: { nome?: string; email?: string } | string;
  planIdRequested?: { _id?: string; nome?: string; limiteAlunos?: number } | string | null;
}

// Utils
function statusLabel(status: RenewalRequest["status"]) {
  switch (status) {
    case "pending":
      return "Aguardando envio de link";
    case "payment_link_sent":
      return "Link enviado, aguardando comprovante";
    case "payment_proof_uploaded":
      return "Comprovante anexado, aguardando validação";
    case "approved":
    case "APPROVED":
    case "cycle_assignment_pending":
      return "Aprovado — aguarda definição do ciclo";
    case "rejected":
      return "Rejeitado";
    case "FULFILLED":
      return "Concluído";
    default:
      return status;
  }
}

export default function SolicitarRenovacaoPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1) Solicitações aprovadas/pendentes de ciclo (controla o banner)
  const { data: approvedOpen, isLoading: loadingApproved } = useQuery({
    queryKey: ["personal-renewals", "approved"],
    queryFn: async (): Promise<RenewalRequest[]> => {
      const qs = "?status=" + encodeURIComponent("approved,APPROVED,cycle_assignment_pending") + "&limit=5";
      const r = await fetchWithAuth(`/api/personal/renewal-requests${qs}`, {}, "personalAdmin");
      if (!r.ok) throw new Error("Falha ao carregar solicitações aprovadas.");
      return r.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // 2) Lista completa de solicitações (histórico/atuais)
  const { data: renewals, isLoading: loadingList } = useQuery({
    queryKey: ["personal-renewals", "list"],
    queryFn: async (): Promise<RenewalRequest[]> => {
      const r = await fetchWithAuth(`/api/personal/renewal-requests`, {}, "personalAdmin");
      if (!r.ok) throw new Error("Falha ao carregar solicitações.");
      return r.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // 3) Planos disponíveis (vem do backend com _id)
  const { data: planos, isLoading: loadingPlanos } = useQuery({
    queryKey: ["planosDisponiveis"],
    queryFn: async (): Promise<PlanoDisponivel[]> => {
      const r = await fetchWithAuth(`/api/personal/planos-disponiveis`, {}, "personalAdmin");
      if (!r.ok) throw new Error("Falha ao carregar planos.");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasOpenCycle = !!approvedOpen?.length;

  // 4) Mutação para CRIAR a solicitação — Substitui o antigo "navigate('/renovar-plano')" nos cards de planos
  const solicitarMutation = useMutation({
    mutationFn: async (planId: string) => {
      const formData = new FormData();
      formData.append("planIdRequested", planId);
      return fetchWithAuth(`/api/personal/renewal-requests`, { method: "POST", body: formData }, "personalAdmin");
    },
    onSuccess: async () => {
      toast({ title: "Solicitação enviada", description: "Aguarde aprovação do administrador." });
      await queryClient.invalidateQueries({ queryKey: ["personal-renewals", "list"] });
      await queryClient.invalidateQueries({ queryKey: ["personal-renewals", "approved"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao solicitar",
        description: error?.message || "Não foi possível criar a solicitação.",
      });
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Solicitar Renovação de Plano</h1>

      {/* BANNER — só aparece se existe approved/cycle pendente */}
      {loadingApproved ? (
        <Card>
          <CardContent className="py-8 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando solicitações aprovadas…</span>
          </CardContent>
        </Card>
      ) : hasOpenCycle ? (
        <Card className="border-green-400">
          <CardHeader>
            <CardTitle className="text-green-700">Você possui uma solicitação aprovada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Finalize a definição do ciclo de alunos para concluir o processo.
            </p>
            <Button size="lg" onClick={() => navigate("/renovar-plano")}>
              Selecionar Alunos no Novo Ciclo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Você não possui solicitações aprovadas no momento. Escolha um plano e envie sua solicitação para aprovação.
            </p>
          </CardContent>
        </Card>
      )}

      {/* LISTA DE SOLICITAÇÕES (histórico/atuais) */}
      <div className="grid gap-4">
        {loadingList ? (
          <Card>
            <CardContent className="py-8 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando suas solicitações…</span>
            </CardContent>
          </Card>
        ) : renewals && renewals.length > 0 ? (
          renewals.map((req) => {
            const planoNome =
              req.planIdRequested && typeof req.planIdRequested === "object" && "nome" in req.planIdRequested
                ? (req.planIdRequested as any).nome
                : typeof req.planIdRequested === "string"
                ? req.planIdRequested
                : "—";

            const podeDefinirCiclo =
              req.status === "approved" || req.status === "APPROVED" || req.status === "cycle_assignment_pending";

            return (
              <Card key={req._id}>
                <CardHeader>
                  <CardTitle>
                    Solicitação <span className="text-muted-foreground">#{req._id.slice(-6)}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Plano solicitado:</span> {planoNome}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Status:</span> {statusLabel(req.status)}
                  </div>

                  {/* CTA no card apenas se NÃO houver banner e esta solicitação estiver apta a definir ciclo */}
                  {podeDefinirCiclo && !hasOpenCycle && (
                    <div className="pt-2">
                      <Button onClick={() => navigate("/renovar-plano")}>Selecionar Alunos no Novo Ciclo</Button>
                    </div>
                  )}

                  {/* Comprovante (quando for link) */}
                  {req.proof && (req.proof as any).kind === "link" && (req.proof as any).url && (
                    <div className="pt-2">
                      <a
                        className="inline-flex items-center text-primary underline"
                        href={(req.proof as any).url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Abrir comprovante
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CARDS DE PLANOS — SOMENTE quando NÃO há ciclo aprovado/pendente */}
      {!hasOpenCycle && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingPlanos ? (
            <Card>
              <CardContent className="py-8 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando planos…</span>
              </CardContent>
            </Card>
          ) : planos && planos.length > 0 ? (
            planos.map((p) => (
              <Card key={p._id}>
                <CardHeader>
                  <CardTitle>{p.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Limite de alunos:</span> {p.limiteAlunos}
                  </div>
                  {p.preco != null && (
                    <div className="text-sm">
                      <span className="font-medium">Preço:</span> {String(p.preco)}
                    </div>
                  )}
                  {p.duracao != null && (
                    <div className="text-sm">
                      <span className="font-medium">Duração:</span> {String(p.duracao)}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button
                      onClick={() => solicitarMutation.mutate(p._id)}
                      disabled={solicitarMutation.isPending}
                    >
                      {solicitarMutation.isPending ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando…
                        </span>
                      ) : (
                        <>Solicitar {p.nome}</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
