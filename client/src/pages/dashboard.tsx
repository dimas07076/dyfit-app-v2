// client/src/pages/dashboard.tsx
import React, { Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient"; 
import { useThrottle } from "@/hooks/useDebounce";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/dashboard/stats-card";
import { PlanoStatusCard } from "@/components/ui/dashboard/plano-status-card";

import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Zap } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner"; 
import ErrorMessage from "@/components/ErrorMessage"; 
import ErrorBoundary from "@/components/ErrorBoundary"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalPlanStatus } from "../../../shared/types/planos";

// Lazy load heavy components for better performance
const AlunosAtivosList = lazy(() => import("@/components/ui/dashboard/AlunosAtivosList"));

// <<< ALTERAÇÃO: Interface de dados atualizada >>>
interface DashboardStatsData {
  totalAlunos: number;
  treinosAtivos: number; 
  totalTreinosModelo?: number;
  feedbacksHojeCount?: number; // Novo campo para feedbacks
}

export default function Dashboard() {
  const { user } = useUser();
  const trainerId = user?.id; 
  const saudacaoNome = user?.firstName || user?.username || "Personal";

  // Throttled upgrade handler to prevent multiple rapid clicks
  const handleUpgradeClick = useThrottle(() => {
    console.log('Upgrade clicked');
    // TODO: Navigate to upgrade page or show modal
    // Example: setLocationWouter("/upgrade") or openUpgradeModal()
  }, 1000); // 1 second throttle

  const { 
    data: dashboardStats, 
    isLoading: isLoadingStats, 
    error: errorStats 
  } = useQuery<DashboardStatsData, Error>({
    queryKey: ["dashboardGeral", trainerId], 
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar estatísticas.");
      // O backend precisará ser ajustado para retornar 'feedbacksHojeCount'
      return apiRequest<DashboardStatsData>("GET", `/api/dashboard/geral?trainerId=${trainerId}`);
    },
    enabled: !!trainerId, 
  });

  // Query for plan status
  const { 
    data: planStatus, 
    isLoading: isLoadingPlan, 
    error: errorPlan 
  } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["planStatus", trainerId], 
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar status do plano.");
      return apiRequest<PersonalPlanStatus>("GET", "/api/personal/meu-plano");
    },
    enabled: !!trainerId, 
  });

  // <<< ALTERAÇÃO: Texto de saudação simplificado >>>
  const saudacaoSubtexto = isLoadingStats
    ? "Carregando um resumo do seu dia..."
    : "Aqui está um resumo da sua atividade hoje.";

  if (!user) {
    return <div className="bg-blue-50 dark:bg-slate-900 h-full"><LoadingSpinner text="Carregando dados do usuário..." /></div>;
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Bem-vindo(a) de volta, {saudacaoNome}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {saudacaoSubtexto}
          </p>
        </div>
      </header>

      {errorStats && (
        <ErrorMessage title="Erro ao Carregar Estatísticas" message={errorStats.message} />
      )}

      {errorPlan && (
        <ErrorMessage title="Erro ao Carregar Status do Plano" message={errorPlan.message} />
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-slate-700/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-md"><LayoutDashboard className="w-4 h-4 mr-2 sm:hidden"/> Visão Geral</TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-white data-[state=active]:shadow-md"><Zap className="w-4 h-4 mr-2 sm:hidden"/> Ações Rápidas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Plan Status Card */}
          {planStatus && (
            <PlanoStatusCard
              planStatus={planStatus}
              showUpgradeButton={true}
              onUpgradeClick={handleUpgradeClick}
            />
          )}
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total de Alunos" value={isLoadingStats ? "..." : (dashboardStats?.totalAlunos ?? 0).toString()} icon="students" isLoading={isLoadingStats} />
            <StatsCard title="Alunos Ativos" value={isLoadingStats ? "..." : (dashboardStats?.treinosAtivos ?? 0).toString()} icon="activity" isLoading={isLoadingStats} />
            <StatsCard title="Fichas Modelo" value={isLoadingStats ? "..." : (dashboardStats?.totalTreinosModelo ?? 0).toString()} icon="workouts" isLoading={isLoadingStats} />
            <StatsCard title="Feedbacks Hoje" value={isLoadingStats ? "..." : (dashboardStats?.feedbacksHojeCount ?? 0).toString()} icon="sessions" isLoading={isLoadingStats} />
          </div>
          
          <div>
            <Suspense fallback={<LoadingSpinner text="Carregando lista de alunos..." />}>
              <AlunosAtivosList trainerId={trainerId!} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">O que você gostaria de fazer agora?</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/alunos/novo">
                <Button variant="outline" className="w-full py-6 text-base bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-slate-700/50">
                  <Plus className="mr-2 w-4 h-4" /> Adicionar Aluno
                </Button>
              </Link>
              <Link href="/treinos"> 
                <Button variant="outline" className="w-full py-6 text-base bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-slate-700/50">
                  <Plus className="mr-2 w-4 h-4" /> Criar Ficha Modelo
                </Button>
              </Link>
              <Link href="/exercises">
                <Button variant="outline" className="w-full py-6 text-base bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-slate-700/50">
                  <Plus className="mr-2 w-4 h-4" /> Novo Exercício
                </Button>
              </Link>
              <Button variant="outline" className="w-full py-6 text-base bg-gray-50/90 dark:bg-slate-700/50 cursor-not-allowed opacity-60 border border-gray-200/50 dark:border-slate-700/50" disabled>
                <Plus className="mr-2 w-4 h-4" /> Nova Avaliação
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
}