// client/src/pages/treinos/new.tsx
import { Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkoutForm } from "@/forms/workout-form";
import { apiRequest } from "@/lib/queryClient";
import { Aluno } from "@/types/aluno";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function NewWorkoutPage() {
  // Busca a lista de alunos para popular o select no formulário
  const { data: alunos = [], isLoading, error } = useQuery<Aluno[], Error>({
    queryKey: ["/api/aluno/gerenciar"],
    queryFn: () => apiRequest("GET", "/api/aluno/gerenciar"),
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl">
        <Button asChild variant="ghost" className="mb-4 -ml-4">
          <Link href="/treinos">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para Rotinas
          </Link>
        </Button>

        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
            <CardTitle className="text-2xl font-bold">
              Criar Nova Rotina de Treino
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Crie um plano de treino detalhado com dias e exercícios.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading && <LoadingSpinner text="Carregando alunos..." />}
            {error && <ErrorMessage message={error.message} />}
            {!isLoading && !error && <WorkoutForm alunos={alunos} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}