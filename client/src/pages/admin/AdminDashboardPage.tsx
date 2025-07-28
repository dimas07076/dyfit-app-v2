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
import { Users, UserPlus, Mail, List, UserCheck } from 'lucide-react'; 
import { PersonalListadoItem } from '@/pages/admin/ListarPersonaisPage';

interface AdminDashboardData {
  totalPersonais: number;
  personaisAtivos: number;
  convitesPendentes: number;
  totalExercicios: number;
}

// <<< REMOÇÃO: A função de dados mocados não é mais necessária >>>
// const fetchAdminDashboardData = async (): Promise<AdminDashboardData> => { ... };

export default function AdminDashboardPage() {
  // <<< ALTERAÇÃO: A função 'queryFn' agora usa 'apiRequest' para buscar dados reais >>>
  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ['adminDashboardStats'],
    queryFn: () => apiRequest('GET', '/api/admin/dashboard/stats'),
  });

  const { data: personaisRecentes, isLoading: isLoadingPersonais } = useQuery<PersonalListadoItem[]>({
      queryKey: ['adminRecentPersonals'],
      queryFn: () => apiRequest('GET', '/api/admin/personal-trainers?limit=5&sort=createdAt:desc'),
  });

  // O estado de carregamento principal agora considera ambas as queries
  const isPageLoading = isLoading || isLoadingPersonais;

  if (isPageLoading) {
    return <LoadingSpinner text="Carregando dashboard..." />;
  }

  if (error) {
    return <ErrorMessage title="Erro ao carregar dados" message={error.message} />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
        Dashboard do Administrador
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Personais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalPersonais ?? '0'}</div>
            <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.personaisAtivos ?? '0'}</div>
            <p className="text-xs text-muted-foreground">Personais com plano ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.convitesPendentes ?? '0'}</div>
            <p className="text-xs text-muted-foreground">Aguardando aceite</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercícios na Base</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalExercicios ?? '0'}</div>
            <p className="text-xs text-muted-foreground">Disponíveis para todos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-semibold">Ações Rápidas</h2>
            <Button className="w-full justify-start" asChild>
                <Link href="/admin/criar-personal">
                    <UserPlus className="mr-2 h-4 w-4"/>Criar Novo Personal
                </Link>
            </Button>
            <Button className="w-full justify-start" asChild>
                <Link href="/admin/convites">
                    <Mail className="mr-2 h-4 w-4"/>Gerenciar Convites
                </Link>
            </Button>
            {/* <<< CORREÇÃO DE ROTA: Link para Gerenciar Exercícios deve apontar para a rota do personal >>> */}
            <Button className="w-full justify-start" asChild>
                <Link href="/exercises">
                    <List className="mr-2 h-4 w-4"/>Gerenciar Exercícios
                </Link>
            </Button>
        </div>
        <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Personais Recentes</h2>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* <<< MELHORIA: Adicionado tratamento para lista vazia >>> */}
                            {personaisRecentes && personaisRecentes.length > 0 ? (
                                personaisRecentes.map(p => (
                                    <TableRow key={p._id}>
                                        <TableCell className="font-medium">{p.nome}</TableCell>
                                        <TableCell>{p.email}</TableCell>
                                        {/* A lógica de status pode ser aprimorada no futuro */}
                                        <TableCell><Badge variant="outline">Ativo</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                        Nenhum personal encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}