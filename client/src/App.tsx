// client/src/App.tsx
import React, { Suspense, lazy, useContext, useEffect } from 'react';
import { Switch, Route, Redirect, useLocation, RouteProps } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/components/layout/main-layout";
import { UserProvider, UserContext } from "@/context/UserContext";
import { AlunoProvider, useAluno } from "@/context/AlunoContext";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import { PWAInstallProvider } from '@/context/PWAInstallContext';
import { useToast } from '@/hooks/use-toast'; // Importa o hook useToast

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

// Definição da interface para o detalhe do evento customizado 'auth-failed'
interface AuthFailedEventDetail {
  status: number;
  forAluno: boolean;
  forPersonalAdmin: boolean;
  code?: string; // O código de erro que o backend envia
}

function AppContent() {
  const { user, isLoading: isUserLoading } = useContext(UserContext);
  const { aluno, isLoadingAluno } = useAluno();
  const [location, navigate] = useLocation(); // useLocation retorna [path, navigate]
  const { toast } = useToast(); // Hook para exibir notificações toast

  // <<< INÍCIO DA ADIÇÃO: Tratamento Global de Erros de Autenticação >>>
  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent<AuthFailedEventDetail>;
      const { status, forAluno, forPersonalAdmin, code } = customEvent.detail;

      console.log(`[Global Auth Handler] Evento 'auth-failed' recebido:`, customEvent.detail);

      let redirectPath = '/'; // Caminho padrão para redirecionamento
      let message = 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.';

      // Limpar tokens do LocalStorage
      if (forAluno) {
        localStorage.removeItem('alunoAuthToken');
        redirectPath = '/login/aluno'; // Redireciona para login de aluno
      }
      if (forPersonalAdmin) {
        localStorage.removeItem('authToken');
        redirectPath = '/login'; // Redireciona para login de personal/admin
      }

      // Limpar o cache do React Query para garantir que dados antigos não sejam exibidos
      queryClient.clear();

      // Ajustar a mensagem com base no código de erro
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
          // Para role não autorizada, pode ser melhor redirecionar para a raiz ou uma página de erro de acesso
          redirectPath = forPersonalAdmin ? '/' : '/aluno/dashboard'; // Ex: personal vai para a raiz, aluno para o dashboard
          break;
        case 'INVALID_CREDENTIALS':
          // Para credenciais inválidas, a mensagem já é tratada no componente de login,
          // então não precisamos de um toast global aqui, a menos que seja um caso de uso específico.
          // O redirecionamento não é necessário aqui, pois o erro ocorre na própria página de login.
          console.log("[Global Auth Handler] Erro de credenciais inválidas, tratado no componente de login.");
          return; // Não faz nada globalmente, o componente de login já lida.
        case 'ACCOUNT_INACTIVE':
            message = 'Sua conta está inativa. Fale com seu personal trainer.';
            // Não redireciona para login, pois a conta está inativa, não é um problema de token.
            // O ideal é redirecionar para uma página de aviso ou manter na tela atual com a mensagem.
            redirectPath = forAluno ? '/login/aluno' : '/login'; // Redireciona para a tela de login, mas com a mensagem de inatividade.
            break;
        default:
          // Mensagem padrão para outros erros 401/403 sem código específico
          if (status === 401 || status === 403) {
            message = 'Ocorreu um problema de autenticação. Por favor, faça login novamente.';
          } else {
            message = 'Ocorreu um erro inesperado. Por favor, tente novamente.';
          }
          break;
      }

      // Exibir toast (se a mensagem não for para credenciais inválidas, que é tratada localmente)
      if (code !== 'INVALID_CREDENTIALS') {
        toast({
          title: "Atenção!",
          description: message,
          variant: "destructive", // Ou "warning" dependendo da gravidade
        });
      }
      
      // Redirecionar o usuário (se não estiver já na página de login e o erro não for apenas de credenciais inválidas)
      // Evita loops de redirecionamento se o usuário já estiver na página de login
      if (window.location.pathname !== redirectPath && !location.startsWith(redirectPath)) {
        navigate(redirectPath);
      }
    };

    // Adiciona o listener quando o componente é montado
    window.addEventListener('auth-failed', handleAuthFailed as EventListener);

    // Remove o listener quando o componente é desmontado para evitar vazamentos de memória
    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed as EventListener);
    };
  }, [location, navigate, toast]); // Dependências do useEffect
  // <<< FIM DA ADIÇÃO: Tratamento Global de Erros de Autenticação >>>


  if (isUserLoading || isLoadingAluno) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (user) {
    if (location.startsWith("/login")) {
        const redirectTo = user.role.toLowerCase() === 'admin' ? "/admin" : "/";
        return <Redirect to={redirectTo} />;
    }
    
    if (user.role.toLowerCase() === 'admin') return <AdminApp />;
    return <PersonalApp />;
  } 
  
  if (aluno) {
    if (location.startsWith("/aluno/")) return <AlunoApp />;
    return <Redirect to="/aluno/dashboard" />;
  } 
  
  return <PublicRoutes />;
}

function AdminApp() { return ( <MainLayout> <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> <Switch> <AdminProtectedRoute path="/admin" component={AdminDashboardPage} /> <AdminProtectedRoute path="/admin/personais" component={ListarPersonaisPage} /> <AdminProtectedRoute path="/admin/criar-personal" component={CriarPersonalPage} /> <AdminProtectedRoute path="/admin/personais/editar/:id" component={EditarPersonalPage} /> <AdminProtectedRoute path="/admin/convites" component={GerenciarConvitesPage} /> <AdminProtectedRoute path="/exercises" component={ExercisesIndex} /> <AdminProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> <Route path="/admin/:rest*"><Redirect to="/admin" /></Route> <Route component={NotFound} /> </Switch> </Suspense> </MainLayout> );}
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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <PWAInstallProvider>
            <UserProvider>
              <AlunoProvider>
                <Toaster />
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
