// client/src/pages/dashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient"; 

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/dashboard/stats-card";
// <<< ADIÇÃO: Importa o novo componente de lista de alunos >>>
import { AlunosAtivosList } from "@/components/ui/dashboard/AlunosAtivosList";

import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Zap } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner"; 
import ErrorMessage from "@/components/ErrorMessage"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardStatsData {
  totalAlunos: number;
  treinosAtivos: number; 
  sessoesHojeCount: number;
  totalTreinosModelo?: number;
}

export default function Dashboard() {
  const { user } = useUser();
  const trainerId = user?.id; 
  const saudacaoNome = user?.firstName || user?.username || "Personal";

  const { 
    data: dashboardStats, 
    isLoading: isLoadingStats, 
    error: errorStats 
  } = useQuery<DashboardStatsData, Error>({
    queryKey: ["dashboardGeral", trainerId], 
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar estatísticas.");
      return apiRequest<DashboardStatsData>("GET", `/api/dashboard/geral?trainerId=${trainerId}`);
    },
    enabled: !!trainerId, 
  });

  const sessoesHojeTexto = isLoadingStats 
    ? "Carregando seus compromissos..." 
    : `Você tem ${dashboardStats?.sessoesHojeCount ?? 0} compromissos agendados para hoje.`;

  if (!user) {
    return <div className="bg-blue-50 dark:bg-slate-900 h-full"><LoadingSpinner text="Carregando dados do usuário..." /></div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-blue-50 dark:bg-slate-900">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Bem-vindo(a) de volta, {saudacaoNome}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {sessoesHojeTexto}
          </p>
        </div>
      </header>

      {errorStats && (
        <ErrorMessage title="Erro ao Carregar Estatísticas" message={errorStats.message} />
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-2 sm:hidden"/> Visão Geral</TabsTrigger>
          <TabsTrigger value="actions"><Zap className="w-4 h-4 mr-2 sm:hidden"/> Ações Rápidas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total de Alunos" value={isLoadingStats ? "..." : (dashboardStats?.totalAlunos ?? 0).toString()} icon="students" isLoading={isLoadingStats} />
            <StatsCard title="Alunos Ativos" value={isLoadingStats ? "..." : (dashboardStats?.treinosAtivos ?? 0).toString()} icon="completion" isLoading={isLoadingStats} />
            <StatsCard title="Fichas Modelo" value={isLoadingStats ? "..." : (dashboardStats?.totalTreinosModelo ?? 0).toString()} icon="workouts" isLoading={isLoadingStats} />
            <StatsCard title="Compromissos Hoje" value={isLoadingStats ? "..." : (dashboardStats?.sessoesHojeCount ?? 0).toString()} icon="sessions" isLoading={isLoadingStats} />
          </div>
          
          {/* <<< ALTERAÇÃO: Placeholder substituído pelo novo componente >>> */}
          <div>
            <AlunosAtivosList trainerId={trainerId!} />
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle>O que você gostaria de fazer agora?</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/alunos/novo">
                <Button variant="outline" className="w-full py-6 text-base bg-white dark:bg-slate-800"><Plus className="mr-2 w-4 h-4" /> Adicionar Aluno</Button>
              </Link>
              <Link href="/treinos"> 
                <Button variant="outline" className="w-full py-6 text-base bg-white dark:bg-slate-800"><Plus className="mr-2 w-4 h-4" /> Criar Ficha Modelo</Button>
              </Link>
              <Link href="/exercises">
                <Button variant="outline" className="w-full py-6 text-base bg-white dark:bg-slate-800"><Plus className="mr-2 w-4 h-4" /> Novo Exercício</Button>
              </Link>
              <Button variant="outline" className="w-full py-6 text-base bg-white dark:bg-slate-800" disabled><Plus className="mr-2 w-4 h-4" /> Nova Avaliação</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}