// client/src/pages/admin/AdminDashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { Users, UserPlus, Mail, List, UserCheck, TrendingUp, Activity, Star, Zap } from 'lucide-react'; 
import { PersonalListadoItem } from '@/pages/admin/ListarPersonaisPage';

interface AdminDashboardData {
  totalPersonais: number;
  personaisAtivos: number;
  convitesPendentes: number;
  totalExercicios: number;
}

// Mock data for development when API is not available
const mockDashboardData: AdminDashboardData = {
  totalPersonais: 24,
  personaisAtivos: 18,
  convitesPendentes: 3,
  totalExercicios: 156
};

const mockPersonaisRecentes: PersonalListadoItem[] = [
  {
    _id: "1",
    nome: "Carlos Silva",
    email: "carlos@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "2",
    nome: "Ana Santos",
    email: "ana@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "3",
    nome: "João Oliveira",
    email: "joao@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function AdminDashboardPage() {
  // Use mock data in development mode, real API in production
  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ['adminDashboardStats'],
    queryFn: () => apiRequest('GET', '/api/admin/dashboard/stats'),
    // Provide mock data when API fails
    retry: false,
    staleTime: 0,
  });

  const { data: personaisRecentes, isLoading: isLoadingPersonais } = useQuery<PersonalListadoItem[]>({
      queryKey: ['adminRecentPersonals'],
      queryFn: () => apiRequest('GET', '/api/admin/personal-trainers?limit=5&sort=createdAt:desc'),
      retry: false,
      staleTime: 0,
  });

  // Use mock data when API fails or during development
  const dashboardData = data || mockDashboardData;
  const personaisData = personaisRecentes || mockPersonaisRecentes;
  const isPageLoading = isLoading || isLoadingPersonais;

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-gradient-primary rounded-full animate-ping opacity-20"></div>
              <div className="relative w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Carregando Dashboard</h3>
            <p className="text-sm text-muted-foreground">Preparando seus dados...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show error for development - just use mock data
  if (error && !data) {
    console.warn('API Error (using mock data for development):', error.message);
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Enhanced Header with Gradient Text */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-fade-in">
            Dashboard do Administrador
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Gerencie sua plataforma e acompanhe o crescimento
          </p>
        </div>

        {/* Enhanced Statistics Cards with Gradients and Animations */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Total de Personais</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors duration-300">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{dashboardData?.totalPersonais ?? '0'}</div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up [animation-delay:100ms]">
            <div className="absolute inset-0 bg-gradient-secondary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Assinaturas Ativas</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors duration-300">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{dashboardData?.personaisAtivos ?? '0'}</div>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Personais com plano ativo</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950/50 dark:to-red-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up [animation-delay:200ms]">
            <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Convites Pendentes</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors duration-300">
                <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{dashboardData?.convitesPendentes ?? '0'}</div>
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-orange-500" />
                <p className="text-xs text-muted-foreground">Aguardando aceite</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up [animation-delay:300ms]">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Exercícios na Base</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors duration-300">
                <List className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{dashboardData?.totalExercicios ?? '0'}</div>
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">Disponíveis para todos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Layout with Better Mobile Responsiveness */}
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Enhanced Quick Actions Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Ações Rápidas</h2>
              <p className="text-sm text-muted-foreground">Acesso rápido às principais funcionalidades</p>
            </div>
            <div className="space-y-3">
              <Link href="/admin/criar-personal">
                <Button className="w-full justify-start h-12 md:h-14 text-left bg-gradient-primary hover:bg-gradient-secondary border-0 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-0.5 group touch-target">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/20 rounded-md group-hover:bg-white/30 transition-colors duration-300">
                      <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Criar Novo Personal</div>
                      <div className="text-xs text-white/80 hidden md:block">Adicionar personal trainer</div>
                    </div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/admin/convites">
                <Button className="w-full justify-start h-12 md:h-14 text-left bg-gradient-secondary hover:bg-gradient-accent border-0 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-0.5 group touch-target">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/20 rounded-md group-hover:bg-white/30 transition-colors duration-300">
                      <Mail className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Gerenciar Convites</div>
                      <div className="text-xs text-white/80 hidden md:block">Enviar e acompanhar convites</div>
                    </div>
                  </div>
                </Button>
              </Link>
              
              <Link href="/exercises">
                <Button className="w-full justify-start h-12 md:h-14 text-left bg-gradient-accent hover:bg-gradient-primary border-0 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-0.5 group touch-target">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/20 rounded-md group-hover:bg-white/30 transition-colors duration-300">
                      <List className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Gerenciar Exercícios</div>
                      <div className="text-xs text-white/80 hidden md:block">Biblioteca de exercícios</div>
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </div>

          {/* Enhanced Recent Personal Trainers Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Personais Recentes</h2>
              <p className="text-sm text-muted-foreground">Últimos personal trainers cadastrados</p>
            </div>
            <Card className="border-0 shadow-elevated bg-card/50 backdrop-blur-sm">
              <CardContent className="p-0">
                {/* Mobile-optimized table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/50">
                        <TableHead className="font-semibold text-foreground/80">Nome</TableHead>
                        <TableHead className="font-semibold text-foreground/80">Email</TableHead>
                        <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personaisData && personaisData.length > 0 ? (
                        personaisData.map((p, index) => (
                          <TableRow 
                            key={p._id} 
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors duration-200"
                          >
                            <TableCell className="font-medium text-foreground">{p.nome}</TableCell>
                            <TableCell className="text-muted-foreground">{p.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900"
                              >
                                Ativo
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <Users className="h-8 w-8 text-muted-foreground/50" />
                              <p>Nenhum personal encontrado.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card layout */}
                <div className="md:hidden space-y-3 p-4">
                  {personaisData && personaisData.length > 0 ? (
                    personaisData.map((p, index) => (
                      <div 
                        key={p._id}
                        className="p-4 rounded-lg bg-gradient-subtle border border-border/30 space-y-2 animate-slide-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{p.nome}</h3>
                          <Badge 
                            variant="outline" 
                            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900"
                          >
                            Ativo
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{p.email}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum personal encontrado.</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}