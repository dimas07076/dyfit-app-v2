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
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import { PWAInstallProvider } from '@/context/PWAInstallContext';
// CORREÇÃO: Removendo importação de Button, pois não é usado diretamente em App.tsx
import { useToast } from '@/hooks/use-toast';
import { useLogger } from '@/lib/logger';

// <<< ADIÇÃO 1 de 3: Importar o componente de prompt de atualização >>>
import { ReloadPrompt } from '@/components/ReloadPrompt'; // Importação nomeada

// <<< ADIÇÃO 2 de 3: Importar o DebugPanel >>>
import DebugPanel from '@/components/DebugPanel';

// --- Páginas ---
const Dashboard = lazy(() => import("@/pages/dashboard"));
const StudentsIndex = lazy(() => import("@/pages/alunos/index"));
const NewStudent = lazy(() => import("@/pages/alunos/new"));
const EditStudentPage = lazy(() => import("@/pages/alunos/edit"));
const ExercisesIndex = lazy(() => import("@/pages/exercises/index"));
const SessionsPage = lazy(() => import("@/pages/sessoes/index"));
const TreinosPage = lazy(() => import("@/pages/treinos/index"));
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
  const logger = useLogger('App');
  const { user, isLoading: isUserLoading } = useContext(UserContext);
  const { aluno, isLoadingAluno } = useAluno();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Log application lifecycle
  useEffect(() => {
    logger.mounted({
      hasUser: !!user,
      hasAluno: !!aluno,
      userRole: user?.role,
      currentLocation: location,
    });

    return () => logger.unmounted();
  }, []);

  // Log route changes
  useEffect(() => {
    logger.info('Route changed', { 
      location,
      hasUser: !!user,
      hasAluno: !!aluno,
      userRole: user?.role,
    });
  }, [location, user, aluno]);

  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent<AuthFailedEventDetail>;
      const { status, forAluno, forPersonalAdmin, code } = customEvent.detail;

      logger.warn('Auth failed event received', {
        status,
        forAluno,
        forPersonalAdmin,
        code,
        currentLocation: location,
      });

      console.log(`[Global Auth Handler] Evento 'auth-failed' recebido:`, customEvent.detail);

      let redirectPath = '/';
      let message = 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.';

      if (forAluno) {
        localStorage.removeItem('alunoAuthToken');
        redirectPath = '/login/aluno';
      }
      if (forPersonalAdmin) {
        localStorage.removeItem('authToken');
        redirectPath = '/login';
      }

      queryClient.clear();

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
        logger.info('Showing auth failed toast', { message, redirectPath });
        toast({
          title: "Atenção!",
          description: message,
          variant: "destructive",
        });
      }
      
      if (window.location.pathname !== redirectPath && !location.startsWith(redirectPath)) {
        logger.info('Redirecting due to auth failure', { from: location, to: redirectPath });
        navigate(redirectPath);
      }
    };

    window.addEventListener('auth-failed', handleAuthFailed as EventListener);

    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed as EventListener);
    };
  }, [location, navigate, toast]);


  if (isUserLoading || isLoadingAluno) {
    logger.debug('App showing loading state', { isUserLoading, isLoadingAluno });
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (user) {
    if (location.startsWith("/login")) {
        const redirectTo = user.role.toLowerCase() === 'admin' ? "/admin" : "/";
        logger.info('User already logged in, redirecting from login', { redirectTo, userRole: user.role });
        return <Redirect to={redirectTo} />;
    }
    
    if (user.role.toLowerCase() === 'admin') {
      logger.debug('Rendering AdminApp');
      return <AdminApp />;
    }
    logger.debug('Rendering PersonalApp');
    return <PersonalApp />;
  } 
  
  if (aluno) {
    if (location.startsWith("/aluno/")) {
      logger.debug('Rendering AlunoApp');
      return <AlunoApp />;
    }
    logger.info('Aluno logged in but not on aluno route, redirecting');
    return <Redirect to="/aluno/dashboard" />;
  } 
  
  logger.debug('No user or aluno, rendering PublicRoutes');
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
          <AdminProtectedRoute path="/exercises" component={ExercisesIndex} /> 
          <AdminProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> 
          <Route path="/admin/:rest*"><Redirect to="/admin" /></Route> 
          <Route component={NotFound} /> 
        </Switch> 
      </Suspense> 
    </MainLayout> 
  );
}
function PersonalApp() { return ( <MainLayout> <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> <Switch> <ProtectedRoute path="/" component={Dashboard} /> <ProtectedRoute path="/alunos" component={StudentsIndex} /> <ProtectedRoute path="/alunos/novo" component={NewStudent} /> <ProtectedRoute path="/alunos/editar/:id" component={EditStudentPage} /> <ProtectedRoute path="/treinos" component={TreinosPage} /> <ProtectedRoute path="/exercises" component={ExercisesIndex} /> <ProtectedRoute path="/sessoes" component={SessionsPage} /> <ProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> <Route path="/admin/:rest*"><Redirect to="/" /></Route> <Route component={NotFound} /> </Switch> </Suspense> </MainLayout> );}
function AlunoApp() { return ( <MainLayout> <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> <Switch> <AlunoProtectedRoute path="/aluno/dashboard" component={AlunoDashboardPage} /> <AlunoProtectedRoute path="/aluno/ficha/:fichaId" component={AlunoFichaDetalhePage} /> <AlunoProtectedRoute path="/aluno/historico" component={AlunoHistoricoPage} /> <AlunoProtectedRoute path="/aluno/meus-treinos" component={MeusTreinosPage} /> <Route><Redirect to="/aluno/dashboard" /></Route> </Switch> </Suspense> </MainLayout> );}

function PublicRoutes() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <Switch>
        <Route path="/login" component={LandingLoginPage} />
        <Route path="/login/personal" component={PersonalLoginPage} />
        <Route path="/login/aluno" component={AlunoLoginPage} />

        <Route path="/cadastrar-personal/convite/:tokenDeConvite" component={CadastroPersonalPorConvitePage} />
        <Route path="/convite/aluno/:token" component={CadastroAlunoPorConvitePage} />
        
        <Route><Redirect to="/login" /></Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  const logger = useLogger('AppRoot');

  useEffect(() => {
    logger.info('Application starting', {
      environment: import.meta.env.MODE,
      isDevelopment: import.meta.env.DEV,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <PWAInstallProvider>
            <UserProvider>
              <AlunoProvider>
                <Toaster />
                {/* <<< ADIÇÃO 2 de 2: Inserir o componente para ouvir por atualizações >>> */}
                <ReloadPrompt />
                {/* <<< ADIÇÃO 3 de 3: Inserir o DebugPanel em modo desenvolvimento >>> */}
                <DebugPanel />
                <AppContent />
              </AlunoProvider>
            </UserProvider>
          </PWAInstallProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
