// client/src/pages/dashboard.tsx
import React, { Suspense, lazy, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient"; 
import { useThrottle } from "@/hooks/useDebounce";
import { useLogger } from "@/lib/logger";

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
const AlunosAtivosList = lazy(() => {
  const logger = useLogger('Dashboard');
  logger.debug('Starting to load AlunosAtivosList component');
  
  return import("@/components/ui/dashboard/AlunosAtivosList")
    .then(module => {
      logger.info('AlunosAtivosList component loaded successfully');
      return {
        default: module.AlunosAtivosList
      };
    })
    .catch(error => {
      logger.error('Failed to load AlunosAtivosList component', error);
      throw error;
    });
});

// <<< ALTERAÇÃO: Interface de dados atualizada >>>
interface DashboardStatsData {
  totalAlunos: number;
  treinosAtivos: number; 
  totalTreinosModelo?: number;
  feedbacksHojeCount?: number; // Novo campo para feedbacks
}

export default function Dashboard() {
  const logger = useLogger('Dashboard');
  const { user } = useUser();
  const trainerId = user?.id; 
  const saudacaoNome = user?.firstName || user?.username || "Personal";

  // Log component lifecycle
  useEffect(() => {
    logger.mounted({ 
      trainerId, 
      userName: saudacaoNome,
      userType: user?.role,
      hasUser: !!user 
    });

    if (!user) {
      logger.warn('Dashboard mounted without user');
    }

    if (!trainerId) {
      logger.warn('Dashboard mounted without trainerId', { user });
    }

    return () => logger.unmounted();
  }, [user, trainerId, saudacaoNome]);

  // Performance timing
  useEffect(() => {
    logger.time('dashboard-render');
    return () => logger.timeEnd('dashboard-render');
  });

  // Throttled upgrade handler to prevent multiple rapid clicks
  const handleUpgradeClick = useThrottle(() => {
    logger.userAction('upgrade-clicked');
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
      try {
        if (!trainerId) {
          const error = new Error("Trainer ID não encontrado para buscar estatísticas.");
          logger.error('Dashboard stats query failed - no trainerId', error);
          throw error;
        }
        
        logger.queryStarted('dashboardGeral');
        logger.time('fetch-dashboard-stats');
        
        const result = await apiRequest<DashboardStatsData>("GET", `/api/dashboard/geral?trainerId=${trainerId}`);
        
        logger.timeEnd('fetch-dashboard-stats');
        logger.querySuccess('dashboardGeral', result);
        
        return result;
      } catch (error) {
        logger.timeEnd('fetch-dashboard-stats');
        logger.queryError('dashboardGeral', error as Error);
        throw error;
      }
    },
    enabled: !!trainerId,
    retry: (failureCount, error) => {
      const shouldRetry = failureCount < 3;
      logger.warn(`Dashboard stats query failed, retry ${failureCount}/3`, { shouldRetry, error: error.message });
      return shouldRetry;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  // Query for plan status
  const { 
    data: planStatus, 
    isLoading: isLoadingPlan, 
    error: errorPlan 
  } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["planStatus", trainerId], 
    queryFn: async () => {
      try {
        if (!trainerId) {
          const error = new Error("Trainer ID não encontrado para buscar status do plano.");
          logger.error('Plan status query failed - no trainerId', error);
          throw error;
        }
        
        logger.queryStarted('planStatus');
        logger.time('fetch-plan-status');
        
        const result = await apiRequest<PersonalPlanStatus>("GET", "/api/personal/meu-plano");
        
        logger.timeEnd('fetch-plan-status');
        logger.querySuccess('planStatus', result);
        
        return result;
      } catch (error) {
        logger.timeEnd('fetch-plan-status');
        logger.queryError('planStatus', error as Error);
        throw error;
      }
    },
    enabled: !!trainerId,
    retry: (failureCount, error) => {
      const shouldRetry = failureCount < 3;
      logger.warn(`Plan status query failed, retry ${failureCount}/3`, { shouldRetry, error: error.message });
      return shouldRetry;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Log data changes
  useEffect(() => {
    if (dashboardStats) {
      logger.info('Dashboard stats loaded', { 
        totalAlunos: dashboardStats.totalAlunos,
        treinosAtivos: dashboardStats.treinosAtivos,
        totalTreinosModelo: dashboardStats.totalTreinosModelo,
        feedbacksHojeCount: dashboardStats.feedbacksHojeCount,
      });
    }
  }, [dashboardStats]);

  useEffect(() => {
    if (planStatus) {
      logger.info('Plan status loaded', { 
        planType: planStatus.planType,
        isActive: planStatus.isActive,
      });
    }
  }, [planStatus]);

  // Log errors
  useEffect(() => {
    if (errorStats) {
      logger.error('Dashboard stats error', errorStats);
    }
  }, [errorStats]);

  useEffect(() => {
    if (errorPlan) {
      logger.error('Plan status error', errorPlan);
    }
  }, [errorPlan]);

  // <<< ALTERAÇÃO: Texto de saudação simplificado >>>
  const saudacaoSubtexto = isLoadingStats
    ? "Carregando um resumo do seu dia..."
    : "Aqui está um resumo da sua atividade hoje.";

  // Log render state
  logger.debug('Dashboard rendering', {
    hasUser: !!user,
    trainerId,
    isLoadingStats,
    isLoadingPlan,
    hasStatsError: !!errorStats,
    hasPlanError: !!errorPlan,
    hasStatsData: !!dashboardStats,
    hasPlanData: !!planStatus,
  });

  if (!user) {
    logger.warn('Dashboard rendering without user - showing loading spinner');
    return <div className="bg-blue-50 dark:bg-slate-900 h-full"><LoadingSpinner text="Carregando dados do usuário..." /></div>;
  }

  return (
    <ErrorBoundary 
      componentName="Dashboard"
      onError={(error, errorInfo) => {
        logger.error('ErrorBoundary caught error in Dashboard', error, { errorInfo, trainerId, user: user?.id });
      }}
    >
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
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-md"
            onClick={() => logger.userAction('tab-clicked', { tab: 'overview' })}
          >
            <LayoutDashboard className="w-4 h-4 mr-2 sm:hidden"/> Visão Geral
          </TabsTrigger>
          <TabsTrigger 
            value="actions" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-md"
            onClick={() => logger.userAction('tab-clicked', { tab: 'actions' })}
          >
            <Zap className="w-4 h-4 mr-2 sm:hidden"/> Ações Rápidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Plan Status Card */}
          <ErrorBoundary 
            componentName="PlanoStatusCard"
            fallback={
              <Card className="bg-white/80 dark:bg-slate-800/80 p-4">
                <p className="text-red-600">Erro ao carregar status do plano</p>
              </Card>
            }
          >
            {planStatus && (
              <PlanoStatusCard
                planStatus={planStatus}
                showUpgradeButton={true}
                onUpgradeClick={handleUpgradeClick}
              />
            )}
          </ErrorBoundary>
          
          {/* Stats Cards */}
          <ErrorBoundary 
            componentName="StatsCards"
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-white/80 dark:bg-slate-800/80 p-4">
                    <p className="text-red-600 text-sm">Erro ao carregar estatística</p>
                  </Card>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total de Alunos" value={isLoadingStats ? "..." : (dashboardStats?.totalAlunos ?? 0).toString()} icon="students" isLoading={isLoadingStats} />
              <StatsCard title="Alunos Ativos" value={isLoadingStats ? "..." : (dashboardStats?.treinosAtivos ?? 0).toString()} icon="activity" isLoading={isLoadingStats} />
              <StatsCard title="Fichas Modelo" value={isLoadingStats ? "..." : (dashboardStats?.totalTreinosModelo ?? 0).toString()} icon="workouts" isLoading={isLoadingStats} />
              <StatsCard title="Feedbacks Hoje" value={isLoadingStats ? "..." : (dashboardStats?.feedbacksHojeCount ?? 0).toString()} icon="sessions" isLoading={isLoadingStats} />
            </div>
          </ErrorBoundary>
          
          <ErrorBoundary 
            componentName="AlunosAtivosListWrapper"
            fallback={
              <Card className="bg-white/80 dark:bg-slate-800/80 p-8 text-center">
                <p className="text-red-600 mb-4">Erro ao carregar lista de alunos</p>
                <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
              </Card>
            }
            onError={(error, errorInfo) => {
              logger.error('Error in AlunosAtivosList wrapper', error, { errorInfo, trainerId });
            }}
          >
            <Suspense fallback={
              <div>
                <LoadingSpinner text="Carregando lista de alunos..." />
                {logger.debug('Showing LoadingSpinner for AlunosAtivosList')}
              </div>
            }>
              {trainerId ? (
                <AlunosAtivosList trainerId={trainerId} />
              ) : (
                <Card className="bg-white/80 dark:bg-slate-800/80 p-8 text-center">
                  <p className="text-yellow-600">Aguardando dados do usuário...</p>
                </Card>
              )}
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="actions">
          <ErrorBoundary 
            componentName="ActionsTab"
            fallback={
              <Card className="bg-white/80 dark:bg-slate-800/80 p-4">
                <p className="text-red-600">Erro ao carregar ações rápidas</p>
              </Card>
            }
          >
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">O que você gostaria de fazer agora?</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/alunos/novo" onClick={() => logger.userAction('quick-action-clicked', { action: 'add-student' })}>
                  <Button variant="outline" className="w-full py-6 text-base bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-slate-700/50">
                    <Plus className="mr-2 w-4 h-4" /> Adicionar Aluno
                  </Button>
                </Link>
                <Link href="/treinos" onClick={() => logger.userAction('quick-action-clicked', { action: 'create-workout' })}> 
                  <Button variant="outline" className="w-full py-6 text-base bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-slate-700/50">
                    <Plus className="mr-2 w-4 h-4" /> Criar Ficha Modelo
                  </Button>
                </Link>
                <Link href="/exercises" onClick={() => logger.userAction('quick-action-clicked', { action: 'new-exercise' })}>
                  <Button variant="outline" className="w-full py-6 text-base bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50 dark:border-slate-700/50">
                    <Plus className="mr-2 w-4 h-4" /> Novo Exercício
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full py-6 text-base bg-gray-50/90 dark:bg-slate-700/50 cursor-not-allowed opacity-60 border border-gray-200/50 dark:border-slate-700/50" 
                  disabled
                  onClick={() => logger.userAction('quick-action-clicked', { action: 'new-assessment', disabled: true })}
                >
                  <Plus className="mr-2 w-4 h-4" /> Nova Avaliação
                </Button>
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
}