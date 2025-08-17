// client/src/pages/renovar-plano.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Aluno } from "@/types/aluno";
// caminho relativo para fora de client/src
import { PersonalPlanStatus } from "../../../shared/types/planos";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Crown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFinalizeRenewalCycle } from "@/hooks/useFinalizeRenewalCycle";

export default function RenovarPlanoPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedAlunos, setSelectedAlunos] = useState<Set<string>>(new Set());

  // Plano atual
  const { data: planStatus, isLoading: loadingPlan, error: planError } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["meuPlanoParaRenovacao"],
    queryFn: () => fetchWithAuth("/api/personal/meu-plano"),
  });

  // Alunos do personal
  const { data: todosAlunos, isLoading: loadingAlunos, error: alunosError } = useQuery<Aluno[], Error>({
    queryKey: ["todosAlunosParaRenovacao"],
    queryFn: () => fetchWithAuth("/api/aluno/gerenciar?status=all"),
    enabled: !!planStatus,
  });

  // Requests aprovadas (se não houver, esta página deve mandar o usuário para "Solicitar Renovação")
  const { data: approvedRequests } = useQuery<any[], Error>({
    queryKey: ["renewalRequestsList", "approved"],
    queryFn: () => fetchWithAuth("/api/personal/renewal-requests?status=approved,APPROVED"),
  });

  // Guarda: se NÃO houver request aprovada, sai desta tela imediatamente
  useEffect(() => {
    if (approvedRequests && approvedRequests.length === 0) {
      // troca de rota definitiva para evitar “voltar” pra cá
      navigate("/solicitar-renovacao", { replace: true });
    }
  }, [approvedRequests, navigate]);

  // Pré-seleciona os alunos hoje ativos
  useEffect(() => {
    if (todosAlunos) {
      const activeStudentIds = todosAlunos.filter(a => a.status === "active").map(a => a._id);
      setSelectedAlunos(new Set(activeStudentIds));
    }
  }, [todosAlunos]);

  const toggleAluno = (alunoId: string) => {
    setSelectedAlunos(prev => {
      const s = new Set(prev);
      s.has(alunoId) ? s.delete(alunoId) : s.add(alunoId);
      return s;
    });
  };

  const limiteTotal = useMemo(() => {
    if (!planStatus) return 0;
    return (planStatus.plano?.limiteAlunos || 0) + (planStatus.tokensAvulsos || 0);
  }, [planStatus]);

  const { finalizarCiclo, isFinalizando } = useFinalizeRenewalCycle();

  const handleFinalizar = () => {
    const ids = Array.from(selectedAlunos);
    if (ids.length > limiteTotal) {
      toast({
        variant: "destructive",
        title: "Limite excedido",
        description: `Seu limite total é ${limiteTotal}, mas você selecionou ${ids.length} alunos.`,
      });
      return;
    }

    finalizarCiclo(ids, undefined, {
      onSuccess: () => {
        toast({
          title: "Ciclo confirmado!",
          description: "Solicitação encerrada e alunos atualizados para o novo período.",
        });
        // sai desta tela de vez
        navigate("/solicitar-renovacao", { replace: true });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Erro ao confirmar ciclo",
          description: error?.message || "Ocorreu um erro ao confirmar o ciclo.",
        });
      },
    });
  };

  if (loadingPlan || loadingAlunos) return <LoadingSpinner text="Carregando informações para renovação..." />;
  if (planError) return <ErrorMessage title="Erro" message={planError.message} />;
  if (alunosError) return <ErrorMessage title="Erro" message={alunosError.message} />;

  if (!planStatus) {
    return <ErrorMessage title="Plano não encontrado" message="Não foi possível obter o status do seu plano." />;
  }

  const usados = selectedAlunos.size;
  const naoHaAprovada = approvedRequests && approvedRequests.length === 0;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Renovar Plano — Definir ciclo de alunos
          </h1>
          <p className="text-muted-foreground">
            Selecione quais alunos permanecerão neste novo ciclo. Ao confirmar, os demais serão desativados.
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      {naoHaAprovada && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Não existe solicitação aprovada aguardando confirmação de ciclo. Você será redirecionado para{" "}
            <b>Solicitar Renovação</b>.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Seu plano atual</CardTitle>
          <CardDescription>
            {planStatus.plano?.nome} — limite base: {planStatus.plano?.limiteAlunos || 0}
            {planStatus.tokensAvulsos ? <span> (+{planStatus.tokensAvulsos} tokens)</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={usados > limiteTotal ? "destructive" : "default"}>
              {usados}/{limiteTotal}
            </Badge>
            <span className="text-sm text-muted-foreground">vagas utilizadas</span>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Ao confirmar, <b>todos os alunos ativos</b> serão desativados e <b>apenas os selecionados</b> abaixo serão reativados no novo ciclo.
            </AlertDescription>
          </Alert>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {todosAlunos?.map((aluno) => (
              <label key={aluno._id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={selectedAlunos.has(aluno._id)}
                  onCheckedChange={() => toggleAluno(aluno._id)}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{aluno.nome}</span>
                  <span className="text-xs text-muted-foreground">{aluno.status === "active" ? "Ativo" : "Inativo"}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setSelectedAlunos(new Set())}>Limpar seleção</Button>
            <Button onClick={handleFinalizar} disabled={isFinalizando || naoHaAprovada}>
              {isFinalizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar ciclo agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
