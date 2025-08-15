// client/src/pages/renovar-plano.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Aluno } from "@/types/aluno";
import { PersonalPlanStatus } from "../../../shared/types/planos";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Crown, Loader2 } from "lucide-react"; // <<< CORREÇÃO AQUI: Ícone 'Users' removido
import { Badge } from "@/components/ui/badge";

export default function RenovarPlanoPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlunos, setSelectedAlunos] = useState<Set<string>>(new Set());

  const { data: planStatus, isLoading: loadingPlan, error: planError } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ['meuPlanoParaRenovacao'],
    queryFn: () => fetchWithAuth("/api/personal/meu-plano"),
  });

  const { data: todosAlunos, isLoading: loadingAlunos, error: alunosError } = useQuery<Aluno[], Error>({
    queryKey: ['todosAlunosParaRenovacao'],
    queryFn: () => fetchWithAuth("/api/aluno/gerenciar?status=all"),
    enabled: !!planStatus,
  });

  useEffect(() => {
    if (todosAlunos) {
      const activeStudentIds = todosAlunos
        .filter(aluno => aluno.status === 'active')
        .map(aluno => aluno._id);
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

  const mutation = useMutation({
    mutationFn: (selectedIds: string[]) =>
      apiRequest("POST", "/api/personal/renovar-plano", {
        alunosSelecionados: selectedIds,
      }),
    onSuccess: () => {
      toast({
        title: "Alunos atualizados!",
        description: "Os alunos para o novo ciclo do seu plano foram definidos com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['meuPlanoParaRenovacao'] });
      queryClient.invalidateQueries({ queryKey: ['todosAlunosParaRenovacao'] });
      navigate("/meu-plano");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao finalizar renovação",
        description: error?.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleSubmit = () => {
    const limiteTotal = planStatus?.limiteAtual ?? 0;
    if (selectedAlunos.size > limiteTotal) {
      toast({
        variant: "destructive",
        title: "Limite de alunos excedido",
        description: `Você selecionou ${selectedAlunos.size} alunos, mas seu limite total de vagas é ${limiteTotal}.`,
      });
      return;
    }
    mutation.mutate(Array.from(selectedAlunos));
  };

  if (loadingPlan || loadingAlunos) {
    return <LoadingSpinner text="Carregando dados de renovação..." />;
  }

  if (planError) return <ErrorMessage title="Erro ao carregar plano" message={(planError as Error)?.message} />;
  if (alunosError) return <ErrorMessage title="Erro ao carregar alunos" message={(alunosError as Error)?.message} />;
  if (!planStatus || !planStatus.plano) {
    return <ErrorMessage title="Nenhum Plano Ativo" message="Não foi possível encontrar um plano ativo para renovar. Por favor, contate o suporte." />;
  }
  
  const limiteTotal = planStatus.limiteAtual;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/solicitar-renovacao">
        <Button variant="ghost" className="mb-4 -ml-4">&larr; Voltar</Button>
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Selecionar Alunos para o Novo Ciclo</CardTitle>
          <CardDescription>
            Seu plano <Badge variant="default" className="mx-1">{planStatus.plano.nome}</Badge> foi renovado! Agora, selecione quais alunos continuarão ativos neste novo período. Os alunos não selecionados serão marcados como inativos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{planStatus.plano.nome}</span>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${selectedAlunos.size > limiteTotal ? 'text-destructive' : 'text-primary'}`}>
                    {selectedAlunos.size} / {limiteTotal}
                  </p>
                  <p className="text-xs text-muted-foreground">Alunos Selecionados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {selectedAlunos.size > limiteTotal && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Você selecionou mais alunos do que o seu plano permite. Desmarque alguns alunos para poder continuar.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3">Sua Lista de Alunos</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {todosAlunos && todosAlunos.length > 0 ? (
                todosAlunos.map((aluno) => (
                  <label
                    key={aluno._id}
                    htmlFor={aluno._id}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-all 
                      ${selectedAlunos.has(aluno._id) ? 'bg-primary/10 border-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`
                    }
                  >
                    <Checkbox
                      id={aluno._id}
                      checked={selectedAlunos.has(aluno._id)}
                      onCheckedChange={() => toggleAluno(aluno._id)}
                    />
                    <div className="flex-grow">
                      <span className="font-medium">{aluno.nome}</span>
                      <p className="text-xs text-muted-foreground">{aluno.email}</p>
                    </div>
                    <Badge variant={aluno.status === 'active' ? 'secondary' : 'outline'}>
                      {aluno.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </label>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">Nenhum aluno encontrado.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate("/meu-plano")}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending || selectedAlunos.size > limiteTotal}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finalizar Renovação
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}