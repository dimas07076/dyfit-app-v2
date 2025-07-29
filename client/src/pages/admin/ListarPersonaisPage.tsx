// client/src/pages/admin/ListarPersonaisPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, Trash2, Edit, Eye, Loader2, ShieldCheck, UserCog, UserPlus, Users, UserCheck, Activity, TrendingUp, Calendar, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { Link, useLocation } from 'wouter'; // Importando useLocation
import VisualizarPersonalModal from '@/components/dialogs/admin/VisualizarPersonalModal';

export interface PersonalListadoItem {
  _id: string;
  nome: string;
  email: string;
  role: 'personal' | 'admin' | string;
  createdAt: string;
}

export interface PersonalDetalhes extends PersonalListadoItem {
  tokenCadastroAluno?: string;
  statusAssinatura?: string;
  limiteAlunos?: number;
  dataFimAssinatura?: string;
  updatedAt: string;
}

export default function ListarPersonaisPage() {
  const [, setLocation] = useLocation(); // Pegando a função para navegar
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [personalParaExcluir, setPersonalParaExcluir] = useState<PersonalListadoItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [personalParaVisualizar, setPersonalParaVisualizar] = useState<PersonalDetalhes | null>(null);
  const [isLoadingPersonalDetails, setIsLoadingPersonalDetails] = useState(false);

  const { data: personais, isLoading, error: queryError } = useQuery<PersonalListadoItem[], Error>({
    queryKey: ['adminPersonalTrainersList'],
    queryFn: () => apiRequest<PersonalListadoItem[]>("GET", "/api/admin/personal-trainers"),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Calculate statistics from the data
  const statistics = {
    total: personais?.length || 0,
    admins: personais?.filter(p => (p.role?.toLowerCase() ?? '') === 'admin').length || 0,
    personals: personais?.filter(p => (p.role?.toLowerCase() ?? '') === 'personal').length || 0,
    recent: personais?.filter(p => {
      const createdDate = new Date(p.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length || 0,
  };

  const deletePersonalMutation = useMutation<any, Error, string>({
    mutationFn: (personalId: string) => apiRequest("DELETE", `/api/admin/personal-trainers/${personalId}`),
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: data.message || "Personal trainer excluído." });
      queryClient.invalidateQueries({ queryKey: ['adminPersonalTrainersList'] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Erro ao Excluir", description: err.message || "Não foi possível excluir o personal trainer." });
    },
    onSettled: () => {
      setPersonalParaExcluir(null);
      setIsConfirmDeleteOpen(false);
    }
  });

  const handleExcluirClick = (personal: PersonalListadoItem) => {
    setPersonalParaExcluir(personal);
    setIsConfirmDeleteOpen(true);
  };

  const confirmarExclusao = () => {
    if (personalParaExcluir) {
      deletePersonalMutation.mutate(personalParaExcluir._id);
    }
  };

  const handleVisualizarClick = async (personalId: string) => {
    setIsLoadingPersonalDetails(true);
    setPersonalParaVisualizar(null); 
    setIsViewModalOpen(true);
    try {
      const data = await apiRequest<PersonalDetalhes>("GET", `/api/admin/personal-trainers/${personalId}`);
      setPersonalParaVisualizar(data);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao buscar detalhes", description: err.message || "Não foi possível carregar os dados do personal." });
      setIsViewModalOpen(false);
    } finally {
      setIsLoadingPersonalDetails(false);
    }
  };

  const handleModalClose = () => {
    setIsViewModalOpen(false);
    setPersonalParaVisualizar(null);
    queryClient.invalidateQueries({ queryKey: ['adminPersonalTrainersList'] });
  };

  if (isLoading) return (
    <div className="flex h-[calc(100vh-150px)] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-primary rounded-full animate-ping opacity-20"></div>
            <div className="relative w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <UserCog className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Carregando Personais</h3>
          <p className="text-sm text-muted-foreground">Preparando lista de personal trainers...</p>
        </div>
      </div>
    </div>
  );
  if (queryError) return <ErrorMessage title="Erro ao Carregar Personais" message={queryError?.message || "Não foi possível buscar a lista de personais."} />;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto py-6 px-4 md:py-8 lg:px-6 space-y-8">
        {/* Enhanced Header with Gradient Text */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-fade-in">
              Gerenciar Personais
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Administre personal trainers e monitore estatísticas
            </p>
          </div>
          <Link href="/admin/criar-personal">
            <Button className="w-full sm:w-auto h-12 md:h-14 bg-gradient-primary hover:bg-gradient-secondary border-0 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-0.5 group touch-target animate-slide-up">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-white/20 rounded-md group-hover:bg-white/30 transition-colors duration-300">
                  <UserPlus className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <span className="text-white font-medium">Criar Novo Personal</span>
              </div>
            </Button>
          </Link>
        </div>

        {/* Enhanced Statistics Dashboard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Total de Usuários</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors duration-300">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{statistics.total}</div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up [animation-delay:100ms]">
            <div className="absolute inset-0 bg-gradient-secondary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Personal Trainers</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors duration-300">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{statistics.personals}</div>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-green-500" />
                <p className="text-xs text-muted-foreground">Profissionais ativos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950/50 dark:to-red-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up [animation-delay:200ms]">
            <div className="absolute inset-0 bg-gradient-accent opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Administradores</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors duration-300">
                <ShieldCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{statistics.admins}</div>
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-orange-500" />
                <p className="text-xs text-muted-foreground">Usuários admin</p>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 animate-slide-up [animation-delay:300ms]">
            <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-foreground/80">Novos (30 dias)</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors duration-300">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{statistics.recent}</div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-purple-500" />
                <p className="text-xs text-muted-foreground">Cadastros recentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Data Display with Responsive Design */}
        {personais && personais.length > 0 ? (
          <div className="space-y-6">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card className="border-0 shadow-elevated hover:shadow-glass transition-all duration-300 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850">
                    <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                      <TableHead className="w-[250px] font-semibold text-gray-700 dark:text-gray-300 py-4">Nome</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Função (Role)</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Data de Criação</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personais.map((personal) => (
                      <TableRow key={personal._id} className="dark:border-gray-700 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent dark:hover:from-gray-700/30 dark:hover:to-transparent transition-all duration-200 group">
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 py-4">{personal.nome || 'Nome não informado'}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-300">{personal.email || 'Email não informado'}</TableCell>
                        <TableCell>
                          <Badge variant={(personal.role?.toLowerCase() ?? '') === 'admin' ? 'destructive' : 'outline'}
                                 className={`font-medium transition-all duration-200 ${(personal.role?.toLowerCase() ?? '') === 'admin' ? 
                                            'border-red-500 text-red-600 bg-red-100 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/80' : 
                                            'border-blue-500 text-blue-600 bg-blue-100 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-700 hover:bg-blue-200 dark:hover:bg-sky-900/80'}`}>
                              {(personal.role?.toLowerCase() ?? '') === 'admin' && <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                              {personal.role || 'Não definido'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-300">
                          {new Date(personal.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1">
                              <div className="flex flex-col space-y-1">
                                  <Button variant="ghost" className="w-full justify-start text-sm hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200" onClick={() => handleVisualizarClick(personal._id)}>
                                      <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> Visualizar
                                  </Button>
                                  <Button variant="ghost" className="w-full justify-start text-sm hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200" onClick={() => setLocation(`/admin/personais/editar/${personal._id}`)}>
                                      <Edit className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" /> Editar
                                  </Button>
                                  <div className="border-t my-1"></div>
                                  <Button variant="ghost" className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200" onClick={() => handleExcluirClick(personal)} disabled={deletePersonalMutation.isPending && personalParaExcluir?._id === personal._id}>
                                      {deletePersonalMutation.isPending && personalParaExcluir?._id === personal._id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                          <Trash2 className="mr-2 h-4 w-4" />
                                      )}
                                      Excluir
                                  </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {personais.map((personal, index) => (
                <Card key={personal._id} className={`group border-0 shadow-elevated hover:shadow-glass transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-slide-up`} style={{animationDelay: `${index * 50}ms`}}>
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-3 transition-opacity duration-300"></div>
                  <CardContent className="p-4 space-y-4 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground">{personal.nome || 'Nome não informado'}</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                            <span>{personal.email || 'Email não informado'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 flex items-center justify-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                            <Badge variant={(personal.role?.toLowerCase() ?? '') === 'admin' ? 'destructive' : 'outline'}
                                   className={`font-medium text-xs ${(personal.role?.toLowerCase() ?? '') === 'admin' ? 
                                              'border-red-500 text-red-600 bg-red-100 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700' : 
                                              'border-blue-500 text-blue-600 bg-blue-100 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-700'}`}>
                                {(personal.role?.toLowerCase() ?? '') === 'admin' && <ShieldCheck className="mr-1.5 h-3 w-3" />}
                                {personal.role || 'Não definido'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(personal.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 p-0 touch-target">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1">
                          <div className="flex flex-col space-y-1">
                              <Button variant="ghost" className="w-full justify-start text-sm py-3 touch-target hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors duration-200" onClick={() => handleVisualizarClick(personal._id)}>
                                  <Eye className="mr-3 h-4 w-4 text-blue-600 dark:text-blue-400" /> 
                                  <span>Visualizar</span>
                              </Button>
                              <Button variant="ghost" className="w-full justify-start text-sm py-3 touch-target hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors duration-200" onClick={() => setLocation(`/admin/personais/editar/${personal._id}`)}>
                                  <Edit className="mr-3 h-4 w-4 text-green-600 dark:text-green-400" /> 
                                  <span>Editar</span>
                              </Button>
                              <div className="border-t my-1"></div>
                              <Button variant="ghost" className="w-full justify-start text-sm py-3 touch-target text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200" onClick={() => handleExcluirClick(personal)} disabled={deletePersonalMutation.isPending && personalParaExcluir?._id === personal._id}>
                                  {deletePersonalMutation.isPending && personalParaExcluir?._id === personal._id ? (
                                      <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                                  ) : (
                                      <Trash2 className="mr-3 h-4 w-4" />
                                  )}
                                  <span>Excluir</span>
                              </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-elevated">
            <CardContent className="py-16 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Nenhum personal encontrado</h3>
                <p className="text-sm text-muted-foreground">Começe criando um novo personal trainer</p>
              </div>
              <Link href="/admin/criar-personal">
                <Button className="mt-4 bg-gradient-primary hover:bg-gradient-secondary transition-all duration-300">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Primeiro Personal
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Modals and Dialogs */}
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <AlertDialogContent className="border-0 shadow-glass">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-semibold text-foreground">Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-muted-foreground">
                Tem certeza que deseja excluir o personal trainer <span className="font-semibold">"{personalParaExcluir?.nome}"</span> ({personalParaExcluir?.email})? 
                <br />
                <span className="text-red-600 dark:text-red-400">Esta ação não pode ser desfeita.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel 
                onClick={() => setIsConfirmDeleteOpen(false)} 
                disabled={deletePersonalMutation.isPending}
                className="touch-target"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmarExclusao}
                disabled={deletePersonalMutation.isPending}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 touch-target border-0 shadow-elevated hover:shadow-glass transition-all duration-300"
              >
                {deletePersonalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <VisualizarPersonalModal
          isOpen={isViewModalOpen}
          onClose={handleModalClose}
          personal={personalParaVisualizar}
          isLoading={isLoadingPersonalDetails}
        />
      </div>
    </div>
  );
}