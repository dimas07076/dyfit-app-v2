// client/src/App.tsx
import React, { Suspense, lazy, useContext, useEffect } from 'react';
import { Switch, Route, Redirect, useLocation, RouteProps } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import { UserProvider , UserContext } from "@/context/UserContext";
import { AlunoProvider, useAluno } from "@/context/AlunoContext";
// <<< INÍCIO DA CORREÇÃO >>>
import { WorkoutPlayerProvider } from "@/context/WorkoutPlayerContext";
// <<< FIM DA CORREÇÃO >>>
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import { PWAInstallProvider } from '@/context/PWAInstallContext';
import { useToast } from '@/hooks/use-toast';
// ⬇️ Usado na checagem assíncrona do restaurador de rota
import { fetchWithAuth } from "@/lib/apiClient";

// Unified PWA updates manager
import { AppUpdatesManager } from '@/components/AppUpdatesManager';

// Plan gate component for route protection
import { PlanGate } from '@/components/PlanGate';

// --- Páginas ---
const RenovarPlanoPage = React.lazy(() => import("@/pages/renovar-plano"));
const SolicitarRenovacao = React.lazy(() => import("@/pages/solicitar-renovacao"));
const AdminRenewalRequests = React.lazy(() => import("@/pages/admin/renewal-requests"));

const Dashboard = lazy(() => import("@/pages/dashboard"));
const StudentsIndex = lazy(() => import("@/pages/alunos/index"));
const NewStudent = lazy(() => import("@/pages/alunos/new"));
const EditStudentPage = lazy(() => import("@/pages/alunos/edit"));
const ExercisesIndex = lazy(() => import("@/pages/exercises/index"));
const SessionsPage = lazy(() => import("@/pages/sessoes/index"));
const TreinosPage = lazy(() => import("@/pages/treinos/index"));
const MeuPlanoPage = lazy(() => import("@/pages/meu-plano"));
const ProfileEditPage = lazy(() => import('@/pages/perfil/editar'));
const PersonalLoginPage = lazy(() => import("@/pages/login")); 
const LandingLoginPage = lazy(() => import("@/pages/public/LandingLoginPage")); 
const CadastroPersonalPorConvitePage = lazy(() => import("@/pages/public/CadastroPersonalPorConvitePage"));
const CadastroAlunoPorConvitePage = lazy(() => import("@/pages/public/CadastroAlunoPorConvitePage"));
const AlunoLoginPage = lazy(() => import("@/pages/public/AlunoLoginPage"));
const AlunoDashboardPage = lazy(() => import('@/pages/alunos/AlunoDashboardPage'));
const AlunoFichaDetalhePage = lazy(() => import('@/pages/alunos/AlunoFichaDetalhePage'));
const AlunoHistoricoPage = lazy(() => import('@/pages/alunos/AlunoHistoricoPage'));
const MeusTreinosPage = lazy(() => import('@/pages/alunos/MeusTreinosPage'));
const ListarPersonaisPage = lazy(() => import('@/pages/admin/ListarPersonaisPage'));
const CriarPersonalPage = lazy(() => import('@/pages/admin/CriarPersonalPage'));
const EditarPersonalPage = lazy(() => import('@/pages/admin/EditarPersonalPage'));
const GerenciarConvitesPage = lazy(() => import('@/pages/admin/GerenciarConvitesPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const GerenciarPlanosPersonalPage = lazy(() => import('@/pages/admin/GerenciarPlanosPersonalPage'));
const DemoDashboard = lazy(() => import("@/pages/demo-dashboard"));

interface CustomRouteProps extends Omit<RouteProps, 'component'> { component: React.ComponentType<any>; }

const ProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  return <Route {...rest} component={Component} />;
};

const AdminProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  if (user.role.toLowerCase() !== 'admin') return <Redirect to="/" />;
  return <Route {...rest} component={Component} />;
};

const AlunoProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, ...rest }) => {
  const { aluno, isLoadingAluno } = useAluno();
  if (isLoadingAluno) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> Carregando...</div>;
  if (!aluno) return <Redirect to="/login/aluno" />;
  return <Route {...rest} component={Component} />;
};

interface AuthFailedEventDetail {
  status: number;
  forAluno: boolean;
  forPersonalAdmin: boolean;
  code?: string;
}

function AppContent() {
  const { user, isLoading: isUserLoading } = useContext(UserContext);
  const { aluno, isLoadingAluno } = useAluno();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const isDebugMode = import.meta.env.VITE_DEBUG_INVITATIONS === 'true';
  
  React.useEffect(() => {
    if (isDebugMode || import.meta.env.DEV) {
      console.log('[AppContent] Location changed:', location);
      console.log('[AppContent] User:', user ? 'authenticated' : 'not authenticated');
      console.log('[AppContent] Aluno:', aluno ? 'authenticated' : 'not authenticated');
    }
  }, [location, user, aluno, isDebugMode]);

  useEffect(() => {
    if ((user || aluno) && !location.startsWith("/login") && !location.startsWith("/convite/") && !location.startsWith("/cadastrar-personal/convite/")) {
      localStorage.setItem("rotaAtual", location);
    }
  }, [user, aluno, location]);

  useEffect(() => {
    // ⬇️ Checa se deve restaurar /renovar-plano – só se houver approved pendente
    const hasApprovedPending = async (): Promise<boolean> => {
      try {
        const list = await fetchWithAuth<any[]>("/api/personal/renewal-requests?status=approved,APPROVED");
        return Array.isArray(list) && list.length > 0;
      } catch {
        return false;
      }
    };

    const restabelecerRota = async () => {
      const rotaSalva = localStorage.getItem("rotaAtual");
      const rotaAtual = window.location.pathname;
      
      const temTokenPersonal = localStorage.getItem("authToken") !== null;
      const temTokenAluno = localStorage.getItem("alunoAuthToken") !== null;
      const usuarioLogado = temTokenPersonal || temTokenAluno;
      const rotaProtegida = rotaSalva && !rotaSalva.includes("/login");
      
      if (usuarioLogado && rotaProtegida && rotaAtual !== rotaSalva) {
        console.log("[Route Restoration] Tentando restaurar rota:", rotaSalva, "atual:", rotaAtual);
        
        let rotaValida = false;
        if (temTokenPersonal && !rotaSalva!.startsWith("/aluno/")) {
          rotaValida = true;
        } else if (temTokenAluno && rotaSalva!.startsWith("/aluno/")) {
          rotaValida = true;
        }
        
        if (!rotaValida) {
          console.log("[Route Restoration] Rota inválida para tipo de usuário atual:", rotaSalva);
          return false;
        }

        // ✅ Regra específica: /renovar-plano só pode ser restaurada se houver approved
        if (rotaSalva!.startsWith("/renovar-plano")) {
          const ok = await hasApprovedPending();
          if (!ok) {
            console.log("[Route Restoration] Bloqueando restauração de /renovar-plano (sem approved). Redirecionando para /solicitar-renovacao.");
            localStorage.setItem("rotaAtual", "/solicitar-renovacao");
            localStorage.setItem("restaurandoRota", "true");
            navigate("/solicitar-renovacao", { replace: true });
            setTimeout(() => localStorage.removeItem("restaurandoRota"), 200);
            return true;
          }
        }

        console.log("[Route Restoration] Restaurando rota válida:", rotaSalva);
        localStorage.setItem("restaurandoRota", "true");
        navigate(rotaSalva!, { replace: true });
        setTimeout(() => localStorage.removeItem("restaurandoRota"), 200);
        return true;
      }
      return false;
    };

    const handleAppFocus = () => {
      console.log("[Route Restoration] App focado/visível, executando restauração imediata");
      void restabelecerRota();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppFocus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleAppFocus);

    void restabelecerRota();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleAppFocus);
    };
  }, [navigate]);

  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent<AuthFailedEventDetail>;
      const { status, forAluno, forPersonalAdmin, code } = customEvent.detail;

      console.log(`[Global Auth Handler] Evento 'auth-failed' recebido:`, customEvent.detail);

      const shouldProcessAlunoEvent = forAluno && aluno;
      const shouldProcessPersonalEvent = forPersonalAdmin && user;
      
      if (!shouldProcessAlunoEvent && !shouldProcessPersonalEvent) {
        console.log(`[Global Auth Handler] Evento não aplicável ao contexto atual. ForAluno: ${forAluno}, AlunoLogado: ${!!aluno}, ForPersonalAdmin: ${forPersonalAdmin}, UserLogado: ${!!user}`);
        return;
      }

      let redirectPath = '/';
      let message = 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.';

      if (forAluno && shouldProcessAlunoEvent) {
        localStorage.removeItem('alunoAuthToken');
        localStorage.removeItem('alunoRefreshToken');
        localStorage.removeItem('alunoData');
        redirectPath = '/login/aluno';
      }
      if (forPersonalAdmin && shouldProcessPersonalEvent) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        redirectPath = '/login';
      }

      if (shouldProcessAlunoEvent || shouldProcessPersonalEvent) {
        queryClient.clear();
      }

      switch (code) {
        case 'TOKEN_NOT_PROVIDED':
          message = 'Você não está autenticado. Por favor, faça login.';
          break;
        case 'TOKEN_EXPIRED':
          message = 'Sua sessão expirou. Por favor, faça login novamente.';
          break;
        case 'INVALID_TOKEN':
          message = 'Seu token de acesso é inválido. Por favor, faça login novamente.';
          break;
        case 'UNAUTHORIZED_ROLE':
          message = 'Você não tem permissão para acessar este recurso.';
          redirectPath = forPersonalAdmin ? '/' : '/aluno/dashboard';
          break;
        case 'INVALID_CREDENTIALS':
          console.log("[Global Auth Handler] Erro de credenciais inválidas, tratado no componente de login.");
          return;
        case 'ACCOUNT_INACTIVE':
          message = 'Sua conta está inativa. Fale com seu personal trainer.';
          redirectPath = forAluno ? '/login/aluno' : '/login';
          break;
        default:
          if (status === 401 || status === 403) {
            message = 'Ocorreu um problema de autenticação. Por favor, faça login novamente.';
          } else {
            message = 'Ocorreu um erro inesperado. Por favor, tente novamente.';
          }
          break;
      }

      if (code !== 'INVALID_CREDENTIALS') {
        toast({
          title: "Atenção!",
          description: message,
          variant: "destructive",
        });
      }
      
      if (window.location.pathname !== redirectPath && !location.startsWith(redirectPath)) {
        console.log(`[Global Auth Handler] Redirecionando para: ${redirectPath}`);
        navigate(redirectPath);
      }
    };

    window.addEventListener('auth-failed', handleAuthFailed as EventListener);

    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed as EventListener);
    };
  }, [location, navigate, toast, user, aluno]);

  if (isUserLoading || isLoadingAluno) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  const restaurandoRota = localStorage.getItem("restaurandoRota");
  if (restaurandoRota) {
    console.log("[AppContent] Route restoration in progress, blocking default redirects");
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (user) {
    if (location.startsWith("/login")) {
      const rotaSalva = localStorage.getItem("rotaAtual");
      if (rotaSalva && !rotaSalva.includes("/login") && !rotaSalva.startsWith("/aluno/")) {
        return <Redirect to={rotaSalva} />;
      }
      const redirectTo = user.role.toLowerCase() === 'admin' ? "/admin" : "/";
      return <Redirect to={redirectTo} />;
    }
    
    if (user.role.toLowerCase() === 'admin') return <AdminApp />;
    return <PersonalApp />;
  } 
  
  if (aluno) {
    if (location.startsWith("/aluno/")) return <AlunoApp />;
    const rotaSalva = localStorage.getItem("rotaAtual");
    if (rotaSalva && rotaSalva.startsWith("/aluno/")) {
      return <Redirect to={rotaSalva} />;
    }
    return <Redirect to="/aluno/dashboard" />;
  } 
  
  if (location.startsWith("/convite/") || location.startsWith("/cadastrar-personal/convite/")) {
    if (isDebugMode || import.meta.env.DEV) {
      console.log('[AppContent] Accessing invitation route:', location);
    }
    return <PublicRoutes />;
  }
  
  return <PublicRoutes />;
}

function AdminApp() { 
  return ( 
    <MainLayout> 
      <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> 
        <Switch> 
          <AdminProtectedRoute path="/admin" component={AdminDashboardPage} /> 
          <AdminProtectedRoute path="/admin/personais" component={ListarPersonaisPage} /> 
          <AdminProtectedRoute path="/admin/planos" component={GerenciarPlanosPersonalPage} /> 
          <AdminProtectedRoute path="/admin/criar-personal" component={CriarPersonalPage} /> 
          <AdminProtectedRoute path="/admin/personais/editar/:id" component={EditarPersonalPage} /> 
          <AdminProtectedRoute path="/admin/convites" component={GerenciarConvitesPage} />
          <AdminProtectedRoute path="/admin/solicitacoes-renovacao" component={AdminRenewalRequests} />
          <AdminProtectedRoute path="/exercises" component={ExercisesIndex} /> 
          <AdminProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> 
          <Route path="/admin/:rest*"><Redirect to="/admin" /></Route> 
          <Route component={NotFound} /> 
        </Switch> 
      </Suspense> 
    </MainLayout> 
  );
}

function PersonalApp() { 
  return ( 
    <MainLayout> 
      <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> 
        <Switch> 
          <ProtectedRoute path="/" component={Dashboard} /> 
          <Route path="/meu-plano">
            <PlanGate requireActivePlan={true}>
              <MeuPlanoPage />
            </PlanGate>
          </Route>
          <ProtectedRoute path="/renovar-plano" component={RenovarPlanoPage} />
          <ProtectedRoute path="/solicitar-renovacao" component={SolicitarRenovacao} />
          <ProtectedRoute path="/alunos" component={StudentsIndex} /> 
          <ProtectedRoute path="/alunos/novo" component={NewStudent} /> 
          <ProtectedRoute path="/alunos/editar/:id" component={EditStudentPage} /> 
          <ProtectedRoute path="/treinos" component={TreinosPage} /> 
          <ProtectedRoute path="/exercises" component={ExercisesIndex} /> 
          <ProtectedRoute path="/sessoes" component={SessionsPage} /> 
          <ProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> 
          <Route path="/admin/:rest*"><Redirect to="/" /></Route> 
          <Route component={NotFound} /> 
        </Switch> 
      </Suspense> 
    </MainLayout> 
  );
}

function AlunoApp() { 
  return ( 
    <MainLayout> 
      <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> 
        <Switch> 
          <AlunoProtectedRoute path="/aluno/dashboard" component={AlunoDashboardPage} /> 
          <AlunoProtectedRoute path="/aluno/ficha/:fichaId" component={AlunoFichaDetalhePage} /> 
          <AlunoProtectedRoute path="/aluno/historico" component={AlunoHistoricoPage} /> 
          <AlunoProtectedRoute path="/aluno/meus-treinos" component={MeusTreinosPage} /> 
          <Route><Redirect to="/aluno/dashboard" /></Route> 
        </Switch> 
      </Suspense> 
    </MainLayout> 
  );
}

function PublicRoutes() {
  const isDebugMode = import.meta.env.VITE_DEBUG_INVITATIONS === 'true';
  
  React.useEffect(() => {
    if (isDebugMode || import.meta.env.DEV) {
      console.log('[PublicRoutes] Rotas públicas carregadas');
      console.log('[PublicRoutes] URL atual:', window.location.href);
      console.log('[PublicRoutes] Pathname:', window.location.pathname);
    }
  }, [isDebugMode]);

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <Switch>
        <Route path="/login" component={LandingLoginPage} />
        <Route path="/login/personal" component={PersonalLoginPage} />
        <Route path="/login/aluno" component={AlunoLoginPage} />
        <Route path="/demo-dashboard" component={DemoDashboard} />

        <Route path="/cadastrar-personal/convite/:tokenDeConvite" component={CadastroPersonalPorConvitePage} />
        <Route path="/convite/aluno/:token" component={CadastroAlunoPorConvitePage} />
        
        <Route><Redirect to="/login" /></Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <PWAInstallProvider>
            <UserProvider>
              <AlunoProvider>
                <WorkoutPlayerProvider>
                  <Toaster />
                  <AppUpdatesManager />
                  <AppContent />
                </WorkoutPlayerProvider>
              </AlunoProvider>
            </UserProvider>
          </PWAInstallProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
