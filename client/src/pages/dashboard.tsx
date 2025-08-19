// client/src/pages/dashboard.tsx
import { Suspense, lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient"; 

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/dashboard/stats-card";

import { Button } from "@/components/ui/button";
import { LayoutDashboard, Zap, Rocket } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner"; 
import ErrorMessage from "@/components/ErrorMessage"; 
import ErrorBoundary from "@/components/ErrorBoundary"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalPlanStatus } from "../../../shared/types/planos";

// Lazy load heavy components for better performance
const AlunosAtivosList = lazy(() => import("@/components/ui/dashboard/AlunosAtivosList").then(module => ({
  default: module.AlunosAtivosList
})));

interface DashboardStatsData {
  totalAlunos: number;
  treinosAtivos: number; 
  totalTreinosModelo?: number;
  feedbacksHojeCount?: number;
}

const WelcomeCard = () => (
  <div className="flex items-center justify-center h-full">
    <Card className="max-w-2xl text-center shadow-2xl animate-fade-in">
      <CardHeader>
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-4 transform rotate-45">
          <Rocket className="h-8 w-8 text-white -rotate-45" />
        </div>
        <CardTitle className="text-3xl font-bold">
          Tudo pronto para começar!
        </CardTitle>
        <p className="text-muted-foreground pt-2">
          Sua conta foi criada com sucesso. O próximo passo é ativar seu primeiro plano para começar a gerenciar seus alunos e treinos.
        </p>
      </CardHeader>
      <CardContent>
        <p>
          Você pode começar com o nosso <strong>Plano Free</strong>, que é gratuito por 7 dias e permite cadastrar 1 aluno, ou escolher um dos nossos planos pagos para mais recursos.
        </p>
      </CardContent>
      <CardFooter>
        <Link href="/solicitar-renovacao" className="w-full">
          <Button size="lg" className="w-full">
            <Zap className="mr-2 h-4 w-4" />
            Escolher um Plano Agora
          </Button>
        </Link>
      </CardFooter>
    </Card>
  </div>
);

export default function Dashboard() {
  const { user } = useUser();
  const trainerId = user?.id; 
  const saudacaoNome = user?.firstName || user?.username || "Personal";

  const { 
    data: planStatus, 
    isLoading: isLoadingPlan, 
    error: errorPlan 
  } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["personalPlanStatus", trainerId], 
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar estatísticas.");
      return apiRequest<PersonalPlanStatus>("GET", "/api/personal/meu-plano");
    },
    enabled: !!trainerId,
    // <<< INÍCIO DA ALTERAÇÃO >>>
    // A lógica de retry agora verifica o código de erro específico.
    retry: (failureCount, error: any) => {
      if (error?.code === 'PLAN_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
    // <<< FIM DA ALTERAÇÃO >>>
  });

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
    enabled: !!trainerId && !!planStatus?.plano,
  });
  
  const saudacaoSubtexto = (isLoadingStats && planStatus?.plano)
    ? "Carregando um resumo do seu dia..."
    : "Aqui está um resumo da sua atividade e administração de alunos.";

  if (!user) {
    return <div className="bg-blue-50 dark:bg-slate-900 h-full"><LoadingSpinner text="Carregando dados do usuário..." /></div>;
  }

  if (isLoadingPlan) {
    return <div className="h-full"><LoadingSpinner text="Verificando seu plano..." /></div>;
  }
  
  // <<< INÍCIO DA ALTERAÇÃO >>>
  // A exibição de erro agora ignora o erro 'PLAN_NOT_FOUND'.
  if (errorPlan && (errorPlan as any).code !== 'PLAN_NOT_FOUND') {
    return <ErrorMessage title="Erro ao Carregar seu Plano" message={errorPlan.message} />;
  }

  // Se o plano não existir (seja por dados nulos ou pelo erro específico), mostra o card de boas-vindas.
  if (!planStatus || !planStatus.plano) {
  // <<< FIM DA ALTERAÇÃO >>>
    return (
      <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 
                     bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/80 
                     dark:from-slate-900 dark:via-slate-800/95 dark:to-indigo-900/80 
                     min-h-screen">
        <WelcomeCard />
      </div>
    );
  }

  // Se o plano existir, mostra o dashboard completo.
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 
                     bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/80 
                     dark:from-slate-900 dark:via-slate-800/95 dark:to-indigo-900/80 
                     min-h-screen">
        
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-10">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight
                         bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                         dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 
                         bg-clip-text text-transparent
                         animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
              Bem-vindo(a) de volta, {saudacaoNome}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl
                        animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-150">
              {saudacaoSubtexto}
            </p>
          </div>
        </header>

      {errorStats && (
        <ErrorMessage title="Erro ao Carregar Estatísticas" message={errorStats.message} />
      )}

      <Tabs defaultValue="overview" className="space-y-8 md:space-y-10">
        <TabsList className="grid w-full grid-cols-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md 
                           border border-white/30 dark:border-slate-700/50 shadow-lg rounded-xl p-1
                           animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
          <TabsTrigger value="overview" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 
                               data-[state=active]:shadow-md data-[state=active]:text-blue-700 
                               dark:data-[state=active]:text-blue-400
                               transition-all duration-300 rounded-lg py-3 px-4 
                               font-semibold text-sm md:text-base
                               hover:bg-white/50 dark:hover:bg-slate-700/50">
            <LayoutDashboard className="w-4 h-4 mr-2 sm:mr-3"/> 
            <span className="hidden xs:inline">Visão Geral</span>
            <span className="xs:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="actions" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 
                               data-[state=active]:shadow-md data-[state=active]:text-purple-700 
                               dark:data-[state=active]:text-purple-400
                               transition-all duration-300 rounded-lg py-3 px-4 
                               font-semibold text-sm md:text-base
                               hover:bg-white/50 dark:hover:bg-slate-700/50">
            <Zap className="w-4 h-4 mr-2 sm:mr-3"/> 
            <span className="hidden xs:inline">Ações Rápidas</span>
            <span className="xs:hidden">Ações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 md:space-y-10">
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
              <StatsCard 
                title="Total de Alunos" 
                value={isLoadingStats ? "..." : (dashboardStats?.totalAlunos ?? 0).toString()} 
                icon="students" 
                isLoading={isLoadingStats} 
              />
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
              <StatsCard 
                title="Alunos Ativos" 
                value={isLoadingStats ? "..." : (dashboardStats?.treinosAtivos ?? 0).toString()} 
                icon="activity" 
                isLoading={isLoadingStats} 
              />
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
              <StatsCard 
                title="Fichas Modelo" 
                value={isLoadingStats ? "..." : (dashboardStats?.totalTreinosModelo ?? 0).toString()} 
                icon="workouts" 
                isLoading={isLoadingStats} 
              />
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
              <StatsCard 
                title="Feedbacks Hoje" 
                value={isLoadingStats ? "..." : (dashboardStats?.feedbacksHojeCount ?? 0).toString()} 
                icon="sessions" 
                isLoading={isLoadingStats} 
              />
            </div>
          </div>
          
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-500">
            <Suspense fallback={<LoadingSpinner text="Carregando lista de alunos..." />}>
              <AlunosAtivosList trainerId={trainerId!} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md 
                         border border-white/30 dark:border-slate-700/50 shadow-2xl 
                         hover:shadow-3xl transition-all duration-500 rounded-xl overflow-hidden">
            
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 
                           dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10" />
            
            <CardHeader className="relative pb-6">
              <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 
                                 dark:from-purple-400 dark:via-blue-400 dark:to-indigo-400 
                                 bg-clip-text text-transparent">
                O que você gostaria de fazer agora?
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                Acesse rapidamente as principais funcionalidades do sistema.
              </p>
            </CardHeader>
            
            <CardContent className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 p-6">
              
              <Link href="/alunos/novo" className="group">
                <Button variant="outline" 
                        className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                                 bg-gradient-to-br from-blue-50 to-indigo-50 
                                 dark:from-blue-900/30 dark:to-indigo-900/30 
                                 hover:from-blue-100 hover:to-indigo-100
                                 dark:hover:from-blue-800/40 dark:hover:to-indigo-800/40
                                 border-2 border-blue-200 dark:border-blue-700
                                 hover:border-blue-300 dark:hover:border-blue-600
                                 shadow-lg hover:shadow-xl
                                 transition-all duration-300 ease-out
                                 hover:scale-105 hover:-translate-y-1
                                 active:scale-95 active:transition-transform active:duration-75
                                 text-blue-700 dark:text-blue-400
                                 rounded-xl group">
                  <div className="flex items-center justify-center">
                    <div className="font-bold">Adicionar Aluno +</div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/treinos" className="group">
                <Button variant="outline" 
                        className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                                 bg-gradient-to-br from-indigo-50 to-purple-50 
                                 dark:from-indigo-900/30 dark:to-purple-900/30 
                                 hover:from-indigo-100 hover:to-purple-100
                                 dark:hover:from-indigo-800/40 dark:hover:to-purple-800/40
                                 border-2 border-indigo-200 dark:border-indigo-700
                                 hover:border-indigo-300 dark:hover:border-indigo-600
                                 shadow-lg hover:shadow-xl
                                 transition-all duration-300 ease-out
                                 hover:scale-105 hover:-translate-y-1
                                 active:scale-95 active:transition-transform active:duration-75
                                 text-indigo-700 dark:text-indigo-400
                                 rounded-xl group">
                  <div className="flex items-center justify-center">
                    <div className="font-bold">Criar Ficha Modelo +</div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/exercises" className="group">
                <Button variant="outline" 
                        className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                                 bg-gradient-to-br from-purple-50 to-pink-50 
                                 dark:from-purple-900/30 dark:to-pink-900/30 
                                 hover:from-purple-100 hover:to-pink-100
                                 dark:hover:from-purple-800/40 dark:hover:to-pink-800/40
                                 border-2 border-purple-200 dark:border-purple-700
                                 hover:border-purple-300 dark:hover:border-purple-600
                                 shadow-lg hover:shadow-xl
                                 transition-all duration-300 ease-out
                                 hover:scale-105 hover:-translate-y-1
                                 active:scale-95 active:transition-transform active:duration-75
                                 text-purple-700 dark:text-purple-400
                                 rounded-xl group">
                  <div className="flex items-center justify-center">
                    <div className="font-bold">Novo Exercício +</div>
                  </div>
                </Button>
              </Link>
              
              <div className="group">
                <Button variant="outline" 
                        disabled
                        className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                                 bg-gradient-to-br from-gray-50 to-gray-100 
                                 dark:from-gray-800/50 dark:to-gray-700/50 
                                 border-2 border-gray-200 dark:border-gray-600
                                 text-gray-500 dark:text-gray-400
                                 cursor-not-allowed opacity-60
                                 rounded-xl">
                  <div className="flex items-center justify-center">
                    <div className="font-bold">Nova Avaliação +</div>
                  </div>
                </Button>
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
}