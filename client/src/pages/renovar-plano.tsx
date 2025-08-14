// client/src/pages/renovar-plano.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchWithAuth, apiRequest } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Aluno } from "@/types/aluno";

interface PlanoDisponivel {
  _id: string;
  nome: string;
  descricao: string;
  limiteAlunos: number;
  preco: number;
  duracao: number;
  tipo: "free" | "paid";
}

export default function RenovarPlanoPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null);
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);

  // Busca planos disponíveis
  const {
    data: planos,
    isLoading: loadingPlanos,
    isError: errorPlanos,
    error: planosError,
  } = useQuery<PlanoDisponivel[]>({
    queryKey: ["planosDisponiveis"],
    queryFn: () => fetchWithAuth("/api/personal/planos-disponiveis"),
    staleTime: 5 * 60 * 1000,
  });

  // Busca alunos do personal
  const {
    data: alunos,
    isLoading: loadingAlunos,
    isError: errorAlunos,
    error: alunosError,
  } = useQuery<Aluno[]>({
    queryKey: ["alunosDoPersonal"],
    queryFn: () => fetchWithAuth("/api/aluno/gerenciar"),
    staleTime: 5 * 60 * 1000,
  });

  // Descobre o limite do plano selecionado
  const planoSelecionado = planos?.find((p) => p._id === selectedPlanoId);
  const limitePlano = planoSelecionado?.limiteAlunos ?? 0;

  // Alterna seleção de aluno
  const toggleAluno = (alunoId: string) => {
    setSelectedAlunos((prev) =>
      prev.includes(alunoId)
        ? prev.filter((id) => id !== alunoId)
        : [...prev, alunoId]
    );
  };

  // Mutação para renovar o plano
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/personal/renovar-plano", {
        novoPlanoId: selectedPlanoId,
        alunosSelecionados: selectedAlunos,
      }),
    onSuccess: () => {
      toast({
        title: "Plano renovado com sucesso!",
        description:
          "Seu plano foi renovado/atualizado e os alunos selecionados foram ajustados.",
      });
      navigate("/perfil"); // ou a rota que desejar
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao renovar plano",
        description: error?.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedPlanoId) {
      toast({
        variant: "destructive",
        title: "Selecione um plano",
        description: "Escolha um plano para prosseguir.",
      });
      return;
    }
    if (selectedAlunos.length > limitePlano) {
      toast({
        variant: "destructive",
        title: "Limite excedido",
        description: `Você selecionou ${selectedAlunos.length} alunos, mas o limite deste plano é ${limitePlano}.`,
      });
      return;
    }
    mutation.mutate();
  };

  if (loadingPlanos || loadingAlunos) {
    return (
      <div className="p-4">
        <p>Carregando...</p>
      </div>
    );
  }

  if (errorPlanos) {
    return (
      <div className="p-4">
        <p>Erro ao carregar planos: {(planosError as Error)?.message}</p>
      </div>
    );
  }

  if (errorAlunos) {
    return (
      <div className="p-4">
        <p>Erro ao carregar alunos: {(alunosError as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-4">Renovar ou Alterar Plano</h1>
      {/* Seleção de Planos */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Selecione o Plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planos?.map((plano) => (
            <Card
              key={plano._id}
              className={`cursor-pointer ${
                selectedPlanoId === plano._id
                  ? "border-primary ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => {
                setSelectedPlanoId(plano._id);
                // Reinicia seleção de alunos ao trocar de plano
                setSelectedAlunos([]);
              }}
            >
              <CardHeader>
                <CardTitle>{plano.nome}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plano.descricao}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Limite de alunos: <strong>{plano.limiteAlunos}</strong>
                </p>
                <p className="text-sm">
                  Preço:{" "}
                  {plano.tipo === "free"
                    ? "Gratuito"
                    : plano.preco.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </p>
                <p className="text-sm">Duração: {plano.duracao} dias</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Seleção de Alunos */}
      {selectedPlanoId && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">
            Selecione os alunos que continuarão no novo plano
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedAlunos.length} selecionado(s) de um total de {limitePlano} vagas.
          </p>
          {alunos && alunos.length > 0 ? (
            <div className="space-y-2">
              {alunos.map((aluno) => (
                <label
                  key={aluno._id}
                  className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <Checkbox
                    id={aluno._id}
                    checked={selectedAlunos.includes(aluno._id)}
                    onCheckedChange={() => toggleAluno(aluno._id)}
                    disabled={
                      selectedAlunos.length >= limitePlano &&
                      !selectedAlunos.includes(aluno._id)
                    }
                  />
                  <span>
                    {aluno.nome}
                    {aluno.status === "inactive" && (
                      <span className="ml-1 text-xs text-red-600">(Inativo)</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p>Nenhum aluno encontrado.</p>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => navigate("/perfil")}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !selectedPlanoId ||
            mutation.isPending ||
            selectedAlunos.length > limitePlano
          }
        >
          {mutation.isPending ? "Salvando..." : "Confirmar Renovação"}
        </Button>
      </div>
    </div>
  );
}
