// client/src/App.tsx
import React, { Suspense, lazy, useContext } from 'react';
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

// --- Páginas ---
const Dashboard = lazy(() => import("@/pages/dashboard"));
const StudentsIndex = lazy(() => import("@/pages/alunos/index"));
const NewStudent = lazy(() => import("@/pages/alunos/new"));
const EditStudentPage = lazy(() => import("@/pages/alunos/edit"));
const ExercisesIndex = lazy(() => import("@/pages/exercises/index"));
const SessionsPage = lazy(() => import("@/pages/sessoes/index"));
const TreinosPage = lazy(() => import("@/pages/treinos/index"));
const ProfileEditPage = lazy(() => import('@/pages/perfil/editar'));
// <<< ALTERAÇÃO: LoginPage agora é a página de login do PERSONAL >>>
const PersonalLoginPage = lazy(() => import("@/pages/login")); 
// <<< ADIÇÃO: Importa a nova página de seleção de perfil (hub) >>>
const LandingLoginPage = lazy(() => import("@/pages/public/LandingLoginPage")); 
const CadastroPersonalPorConvitePage = lazy(() => import("@/pages/public/CadastroPersonalPorConvitePage"));
const CadastroAlunoPorConvitePage = lazy(() => import("@/pages/public/CadastroAlunoPorConvitePage"));
const AlunoLoginPage = lazy(() => import("@/pages/public/AlunoLoginPage"));
const AlunoDashboardPage = lazy(() => import('@/pages/alunos/AlunoDashboardPage'));
const AlunoFichaDetalhePage = lazy(() => import('@/pages/alunos/AlunoFichaDetalhePage'));
const AlunoHistoricoPage = lazy(() => import('@/pages/alunos/AlunoHistoricoPage'));
const ListarPersonaisPage = lazy(() => import('@/pages/admin/ListarPersonaisPage'));
const CriarPersonalPage = lazy(() => import('@/pages/admin/CriarPersonalPage'));
const EditarPersonalPage = lazy(() => import('@/pages/admin/EditarPersonalPage'));
const GerenciarConvitesPage = lazy(() => import('@/pages/admin/GerenciarConvitesPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));


interface CustomRouteProps extends Omit<RouteProps, 'component'> { component: React.ComponentType<any>; }

// <<< ALTERAÇÃO: Redireciona para a nova página de hub /login >>>
const ProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  return <Route {...rest} component={Component} />;
};

// <<< ALTERAÇÃO: Redireciona para a nova página de hub /login >>>
const AdminProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, ...rest }) => {
  const { user, isLoading: isUserContextLoading } = useContext(UserContext);
  if (isUserContextLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!user) return <Redirect to="/login" />;
  if (user.role.toLowerCase() !== 'admin') return <Redirect to="/" />;
  return <Route {...rest} component={Component} />;
};

// <<< ALTERAÇÃO: Redireciona para a nova página de login de aluno >>>
const AlunoProtectedRoute: React.FC<CustomRouteProps> = ({ component: Component, ...rest }) => {
    const { aluno, isLoadingAluno } = useAluno();
    if (isLoadingAluno) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> Carregando...</div>;
    if (!aluno) return <Redirect to="/login/aluno" />;
    return <Route {...rest} component={Component} />;
};

function AppContent() {
  const { user, isLoading: isUserLoading } = useContext(UserContext);
  const { aluno, isLoadingAluno } = useAluno();
  const [location] = useLocation();

  if (isUserLoading || isLoadingAluno) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (user) {
    if (location.startsWith("/login")) { // Se estiver em qualquer página de login, redireciona para a área logada
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

// ... AdminApp e PersonalApp permanecem os mesmos ...
function AdminApp() { return ( <MainLayout> <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> <Switch> <AdminProtectedRoute path="/admin" component={AdminDashboardPage} /> <AdminProtectedRoute path="/admin/personais" component={ListarPersonaisPage} /> <AdminProtectedRoute path="/admin/criar-personal" component={CriarPersonalPage} /> <AdminProtectedRoute path="/admin/personais/editar/:id" component={EditarPersonalPage} /> <AdminProtectedRoute path="/admin/convites" component={GerenciarConvitesPage} /> <AdminProtectedRoute path="/exercises" component={ExercisesIndex} /> <AdminProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> <Route path="/admin/:rest*"><Redirect to="/admin" /></Route> <Route component={NotFound} /> </Switch> </Suspense> </MainLayout> );}
function PersonalApp() { return ( <MainLayout> <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> <Switch> <ProtectedRoute path="/" component={Dashboard} /> <ProtectedRoute path="/alunos" component={StudentsIndex} /> <ProtectedRoute path="/alunos/novo" component={NewStudent} /> <ProtectedRoute path="/alunos/editar/:id" component={EditStudentPage} /> <ProtectedRoute path="/treinos" component={TreinosPage} /> <ProtectedRoute path="/exercises" component={ExercisesIndex} /> <ProtectedRoute path="/sessoes" component={SessionsPage} /> <ProtectedRoute path="/perfil/editar" component={ProfileEditPage} /> <Route path="/admin/:rest*"><Redirect to="/" /></Route> <Route component={NotFound} /> </Switch> </Suspense> </MainLayout> );}
function AlunoApp() { return ( <MainLayout> <Suspense fallback={<div className="flex h-full flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}> <Switch> <AlunoProtectedRoute path="/aluno/dashboard" component={AlunoDashboardPage} /> <AlunoProtectedRoute path="/aluno/ficha/:fichaId" component={AlunoFichaDetalhePage} /> <AlunoProtectedRoute path="/aluno/historico" component={AlunoHistoricoPage} /> <Route><Redirect to="/aluno/dashboard" /></Route> </Switch> </Suspense> </MainLayout> );}

function PublicRoutes() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <Switch>
        {/* <<< ALTERAÇÃO: Roteamento de login atualizado >>> */}
        <Route path="/login" component={LandingLoginPage} />
        <Route path="/login/personal" component={PersonalLoginPage} />
        <Route path="/login/aluno" component={AlunoLoginPage} />

        <Route path="/cadastrar-personal/convite/:tokenDeConvite" component={CadastroPersonalPorConvitePage} />
        <Route path="/convite/aluno/:token" component={CadastroAlunoPorConvitePage} />
        
        {/* <<< ALTERAÇÃO: O redirecionamento padrão agora aponta para o hub de login >>> */}
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
          <UserProvider>
            <AlunoProvider>
              <Toaster />
              <AppContent />
            </AlunoProvider>
          </UserProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;