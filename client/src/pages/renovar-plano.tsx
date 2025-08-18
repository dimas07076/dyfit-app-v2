// client/src/pages/renovar-plano.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Aluno } from "@/types/aluno";
import { PersonalPlanStatus } from "../../../shared/types/planos";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Crown, Loader2, Users, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFinalizeRenewalCycle, QK_RENEWALS_APPROVED } from "@/hooks/useFinalizeRenewalCycle";

interface RenewalRequest {
  _id: string;
  status: string;
}

export default function RenovarPlanoPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedAlunos, setSelectedAlunos] = useState<Set<string>>(new Set());

  // Hook customizado para a lógica de finalização
  const { finalizarCiclo, isFinalizando } = useFinalizeRenewalCycle();

  // Query para buscar o status do plano atual do personal
  const { data: planStatus, isLoading: loadingPlan, error: planError } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["meuPlanoParaRenovacao"],
    queryFn: () => fetchWithAuth("/api/personal/meu-plano"),
  });

  // Query para buscar todos os alunos do personal (ativos e inativos)
  const { data: todosAlunos = [], isLoading: loadingAlunos, error: alunosError } = useQuery<Aluno[], Error>({
    queryKey: ["todosAlunosParaRenovacao"],
    queryFn: () => fetchWithAuth("/api/aluno/gerenciar?status=all"),
    enabled: !!planStatus,
  });

  // Query para verificar se existe uma solicitação aprovada (guarda da página)
  const { data: approvedRequests, isLoading: loadingApproved } = useQuery<RenewalRequest[], Error>({
    queryKey: QK_RENEWALS_APPROVED,
    queryFn: () => fetchWithAuth("/api/personal/renewal-requests?status=approved,cycle_assignment_pending", {}, "personalAdmin"),
  });

  // Efeito de guarda: se não houver solicitação aprovada, redireciona
  useEffect(() => {
    if (!loadingApproved && (!approvedRequests || approvedRequests.length === 0)) {
      toast({
        variant: "destructive",
        title: "Nenhuma renovação pendente",
        description: "Você não tem uma renovação de plano aprovada para finalizar.",
      });
      navigate("/solicitar-renovacao", { replace: true });
    }
  }, [approvedRequests, loadingApproved, navigate, toast]);

  // Efeito para pré-selecionar os alunos que já estão ativos
  useEffect(() => {
    if (todosAlunos.length > 0) {
      const activeStudentIds = todosAlunos.filter(a => a.status === "active").map(a => a._id);
      setSelectedAlunos(new Set(activeStudentIds));
    }
  }, [todosAlunos]);

  const toggleAluno = (alunoId: string) => {
    setSelectedAlunos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alunoId)) {
        newSet.delete(alunoId);
      } else {
        newSet.add(alunoId);
      }
      return newSet;
    });
  };

  const limiteTotal = useMemo(() => {
    if (!planStatus) return 0;
    return planStatus.limiteAtual || 0;
  }, [planStatus]);

  const handleFinalizar = () => {
    const keepStudentIds = Array.from(selectedAlunos);
    
    if (keepStudentIds.length > limiteTotal) {
      toast({
        variant: "destructive",
        title: "Limite de vagas excedido",
        description: `Seu novo limite é ${limiteTotal}, mas você selecionou ${keepStudentIds.length} alunos.`,
      });
      return;
    }

    // Apenas os alunos que estavam ativos, mas não foram selecionados, precisam ser explicitamente removidos.
    const removeStudentIds = todosAlunos
      .filter(aluno => aluno.status === 'active' && !selectedAlunos.has(aluno._id))
      .map(aluno => aluno._id);

    finalizarCiclo({ keepStudentIds, removeStudentIds });
  };
  
  if (loadingPlan || loadingAlunos || loadingApproved) {
    return <LoadingSpinner text="Carregando informações para renovação do ciclo..." />;
  }
  if (planError) return <ErrorMessage title="Erro ao carregar plano" message={planError.message} />;
  if (alunosError) return <ErrorMessage title="Erro ao carregar alunos" message={alunosError.message} />;

  if (!planStatus) {
    return <ErrorMessage title="Plano não encontrado" message="Não foi possível obter o status do seu plano." />;
  }

  const usados = selectedAlunos.size;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Finalizar Renovação de Plano
          </h1>
          <p className="text-muted-foreground mt-1">
            Selecione os alunos que continuarão ativos no seu novo ciclo.
          </p>
        </div>
        <Link href="/solicitar-renovacao">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </Link>
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle>Seu Novo Plano: {planStatus.plano?.nome || 'N/A'}</CardTitle>
          <CardDescription>
            Limite base de {planStatus.plano?.limiteAlunos || 0} alunos
            {planStatus.tokensAvulsos > 0 && ` + ${planStatus.tokensAvulsos} tokens avulsos.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full ${usados > limiteTotal ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-2xl">{usados} / {limiteTotal}</p>
              <p className="text-sm text-muted-foreground">Vagas Selecionadas</p>
            </div>
          </div>

          <Alert variant={usados > limiteTotal ? "destructive" : "default"}>
            <Info className="h-4 w-4" />
            <AlertTitle>{usados > limiteTotal ? "Atenção: Limite Excedido!" : "Confirmação Importante"}</AlertTitle>
            <AlertDescription>
              {usados > limiteTotal 
                ? `Você selecionou mais alunos do que o seu limite permite. Por favor, desmarque ${usados - limiteTotal} aluno(s).`
                : "Ao confirmar, todos os seus alunos ativos atuais serão desativados. Apenas os alunos marcados nesta lista serão reativados para o novo ciclo."
              }
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="font-semibold mb-3">Selecione os Alunos</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
              {todosAlunos.length > 0 ? (
                todosAlunos.map((aluno) => (
                  <label key={aluno._id} className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer transition-all ${selectedAlunos.has(aluno._id) ? 'border-primary bg-primary/5' : ''}`}>
                    <Checkbox
                      checked={selectedAlunos.has(aluno._id)}
                      onCheckedChange={() => toggleAluno(aluno._id)}
                      id={`aluno-${aluno._id}`}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{aluno.nome}</span>
                      <Badge variant={aluno.status === "active" ? "secondary" : "outline"} className="w-fit text-xs mt-1">{aluno.status === "active" ? "Atualmente Ativo" : "Inativo"}</Badge>
                    </div>
                  </label>
                ))
              ) : (
                <p className="col-span-full text-center text-muted-foreground p-4">Você não possui alunos cadastrados.</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4">
            <Button variant="outline" onClick={() => setSelectedAlunos(new Set())}>Limpar Seleção</Button>
            <Button onClick={handleFinalizar} disabled={isFinalizando || usados > limiteTotal}>
              {isFinalizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar e Finalizar Ciclo
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}