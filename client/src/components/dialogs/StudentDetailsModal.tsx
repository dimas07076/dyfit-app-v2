import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { fetchWithAuth, apiRequest } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Aluno } from "@/types/aluno";
import {
  Dumbbell, Edit, History, Mail, Phone, User, Weight, Ruler, Cake, Target, CalendarDays,
  BarChart, CheckCircle2, Sigma, FileText, View, PlusCircle, MoreVertical, Trash2,
  Clock, MessageSquare, TrendingUp, CalendarCheck, Loader2, Crown, Users, Zap,
  Activity, Award, Calendar, MapPin, Heart, Flame
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '../ui/skeleton';
import ErrorMessage from '../ErrorMessage';
import RotinaViewModal from './RotinaViewModal';
import VideoPlayerModal from './VideoPlayerModal';
import RotinaFormModal from './RotinaFormModal';
import SelectModeloRotinaModal from './SelectModeloRotinaModal';
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';

interface AlunoRotina {
    _id: string;
    titulo: string;
    descricao?: string;
    atualizadoEm: string;
}

interface IWorkoutHistoryLog {
    _id: string;
    treinoId: string;
    treinoTitulo: string;
    dataInicio: string;
    dataFim: string; 
    duracaoTotalMinutos: number;
    nivelTreino: 'muito_facil' | 'facil' | 'moderado' | 'dificil' | 'muito_dificil';
    comentarioAluno?: string;
    aumentoCarga?: boolean;
}

interface StudentDetailsModalProps {
  aluno: Aluno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Enhanced info item with modern styling
const InfoItem = ({ 
  icon: Icon, 
  label, 
  value, 
  highlight = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: React.ReactNode; 
  highlight?: boolean;
}) => (
  <div className="flex items-center p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 transition-all duration-200 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600">
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm mr-4">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`text-base font-semibold ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value || <span className="italic text-gray-400">Não informado</span>}
      </p>
    </div>
  </div>
);

// Enhanced KPI card with gradients
const KpiCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend,
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}) => {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800",
    green: "from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800",
    orange: "from-orange-500/10 to-orange-600/10 border-orange-200 dark:border-orange-800",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-800",
  };

  const iconColors = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400", 
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border transition-all duration-200 hover:shadow-md hover:scale-105`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-1">
          {trend && (
            <TrendingUp className={`h-3 w-3 ${
              trend === 'up' ? 'text-green-500 rotate-0' : 
              trend === 'down' ? 'text-red-500 rotate-180' : 
              'text-gray-400'
            }`} />
          )}
          <Icon className={`h-5 w-5 ${iconColors[color as keyof typeof iconColors]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

// Enhanced Routines Tab with modern styling
const RotinasTab = ({ 
  alunoId, 
  onVisualizarRotina, 
  onAssociarRotina, 
  onDeleteRotina 
}: { 
  alunoId: string;
  onVisualizarRotina: (id: string) => void;
  onAssociarRotina: () => void;
  onDeleteRotina: (rotinaId: string, rotinaTitulo: string) => void;
}) => {
    const { data: rotinas, isLoading, isError, error } = useQuery<AlunoRotina[]>({
        queryKey: ['alunoRotinas', alunoId],
        queryFn: () => fetchWithAuth(`/api/aluno/${alunoId}/rotinas`),
        enabled: !!alunoId,
    });

    if (isLoading) {
        return (
          <div className="space-y-3 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
    }

    if (isError) {
        return <ErrorMessage title="Erro ao buscar rotinas" message={error.message} />;
    }

    return (
        <div className="mt-4 space-y-4">
            <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onAssociarRotina}
                  className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 border-blue-200 dark:border-blue-800"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Associar Rotina
                </Button>
            </div>

            <div className="pr-2 h-[250px] overflow-y-auto space-y-3">
                {(!rotinas || rotinas.length === 0) ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-4">
                        <Dumbbell className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Nenhuma rotina encontrada
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Este aluno ainda não possui rotinas associadas.
                      </p>
                    </div>
                ) : (
                    rotinas.map(rotina => (
                        <Card key={rotina._id} className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
                                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                {rotina.titulo}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Atualizada em: {new Date(rotina.atualizadoEm).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onVisualizarRotina(rotina._id)}>
                                                <View className="mr-2 h-4 w-4" />
                                                Visualizar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                onClick={() => onDeleteRotina(rotina._id, rotina.titulo)}
                                                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/40"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remover
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

// Enhanced History Tab
const HistoricoTab = ({ alunoId, isActive }: { alunoId: string; isActive: boolean }) => {
    const { data: historico, isLoading, isError, error } = useQuery<IWorkoutHistoryLog[]>({
        queryKey: ['historicoAlunoWorkoutLogs', alunoId],
        queryFn: () => fetchWithAuth(`/api/activity-logs/aluno/${alunoId}`),
        enabled: isActive && !!alunoId,
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando histórico de treinos...</span>
          </div>
        );
    }

    if (isError) {
        return <ErrorMessage title="Erro ao carregar histórico" message={error.message} />;
    }

    if (!historico || historico.length === 0) {
        return (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-4">
              <History className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Nenhum treino registrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Este aluno ainda não possui registros de treinos.
            </p>
          </div>
        );
    }

    const nivelTreinoMap: Record<string, string> = {
        muito_facil: 'Muito Fácil',
        facil: 'Fácil',
        moderado: 'Moderado',
        dificil: 'Difícil',
        muito_dificil: 'Muito Difícil',
    };

    const getNivelBadgeVariant = (nivel?: string | null) => {
        switch (nivel) {
            case 'muito_facil': return 'outline';
            case 'facil': return 'secondary';
            case 'moderado': return 'default';
            case 'dificil': return 'destructive';
            case 'muito_dificil': return 'destructive';
            default: return 'default';
        }
    };

    const formatDateTime = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="mt-4 pr-2 h-[250px] overflow-y-auto space-y-4">
            {historico.map((log, index) => (
                <Card key={log._id} className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 font-semibold text-sm">
                                {index + 1}
                            </div>
                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {log.treinoTitulo}
                            </CardTitle>
                        </div>
                        {log.nivelTreino && (
                            <Badge variant={getNivelBadgeVariant(log.nivelTreino)}>
                                {nivelTreinoMap[log.nivelTreino] || log.nivelTreino}
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center space-x-2">
                                <CalendarDays className="h-4 w-4 text-blue-500" />
                                <span className="text-gray-600 dark:text-gray-400">Iniciado:</span>
                                <span className="font-medium">{formatDateTime(log.dataInicio)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CalendarCheck className="h-4 w-4 text-green-500" />
                                <span className="text-gray-600 dark:text-gray-400">Concluído:</span>
                                <span className="font-medium">{formatDateTime(log.dataFim)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-orange-500" />
                                <span className="text-gray-600 dark:text-gray-400">Duração:</span>
                                <span className="font-medium">{log.duracaoTotalMinutos} min</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <TrendingUp className="h-4 w-4 text-purple-500" />
                                <span className="text-gray-600 dark:text-gray-400">Carga:</span>
                                <span className={`font-medium ${log.aumentoCarga ? 'text-green-600 dark:text-green-400' : ''}`}>
                                    {log.aumentoCarga ? 'Aumentou' : 'Manteve'}
                                </span>
                            </div>
                        </div>
                        {log.comentarioAluno && (
                            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div className="flex items-start space-x-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Comentários:</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{log.comentarioAluno}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ 
  aluno, 
  open, 
  onOpenChange 
}) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog } = useConfirmDialog();
    const [, navigate] = useLocation();

    const [rotinaIdParaVer, setRotinaIdParaVer] = useState<string | null>(null);
    const [isRotinaViewModalOpen, setIsRotinaViewModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaListagemItem | null>(null);
    const [isRotinaFormModalOpen, setIsRotinaFormModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isSelectModeloRotinaModalOpen, setIsSelectModeloRotinaModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("detalhes");
    const [rotinaIdToDelete, setRotinaIdToDelete] = useState<string | null>(null);

    const { data: trainerPlanStatus } = useQuery({
        queryKey: ['trainerPlanStatus', aluno?.trainerId],
        queryFn: () => fetchWithAuth(`/api/personal/meu-plano`),
        enabled: !!aluno?.trainerId && open,
        staleTime: 1000 * 60 * 5,
    });

    const { data: rotinaDetalhada, isFetching: isFetchingRotina } = useQuery<RotinaListagemItem>({
        queryKey: ['rotinaDetalhes', rotinaIdParaVer],
        queryFn: () => fetchWithAuth(`/api/treinos/${rotinaIdParaVer}`),
        enabled: !!rotinaIdParaVer,
        staleTime: 0,
        gcTime: 0,
    });

    useEffect(() => {
        if (rotinaDetalhada && !isFetchingRotina && rotinaIdParaVer) {
            setIsRotinaViewModalOpen(true);
        }
    }, [rotinaDetalhada, isFetchingRotina, rotinaIdParaVer]);

    // All the mutation handlers and functions remain the same
    const handleVisualizarRotina = (rotinaId: string) => {
        setRotinaIdParaVer(rotinaId);
    };

    const handleEditFromView = (rotina: RotinaListagemItem) => {
        setRotinaParaEditar(rotina);
        setIsRotinaViewModalOpen(false);
        setIsRotinaFormModalOpen(true);
    };

    const handlePlayVideo = (url: string) => {
        setVideoUrl(url);
    };

    const handleAssociarRotina = () => {
        setIsSelectModeloRotinaModalOpen(true);
    };

    const deleteRotinaMutation = useMutation({
        mutationFn: (rotinaId: string) => apiRequest("DELETE", `/api/treinos/${rotinaId}`),
        onSuccess: () => {
            toast({ title: "Sucesso!", description: "Rotina removida com sucesso." });
            queryClient.invalidateQueries({ queryKey: ["alunoRotinas", aluno?._id] });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro ao Remover", description: error.message || "Não foi possível remover a rotina." });
        },
        onSettled: () => {
            closeConfirmDialog();
            setRotinaIdToDelete(null);
        }
    });
    
    const handleDeleteRotina = (rotinaId: string, rotinaTitulo: string) => {
        setRotinaIdToDelete(rotinaId); 
        openConfirmDialog({
            titulo: "Confirmar Remoção",
            mensagem: `Tem certeza que deseja remover a rotina "${rotinaTitulo}" deste aluno?`,
            onConfirm: () => {}, 
        });
    };

    const handleConfirmDelete = () => {
        if (rotinaIdToDelete) {
            deleteRotinaMutation.mutate(rotinaIdToDelete);
        }
    };

    const associateModelMutation = useMutation({
        mutationFn: async ({ fichaModeloId, alunoId }: { fichaModeloId: string; alunoId: string }) => {
            return apiRequest("POST", "/api/treinos/associar-modelo", { fichaModeloId, alunoId });
        },
        onSuccess: (data) => {
            toast({ title: "Sucesso!", description: `Ficha "${data.titulo}" criada para o aluno.` });
            queryClient.invalidateQueries({ queryKey: ["alunoRotinas", aluno?._id] });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro ao Associar", description: error.message });
        },
        onSettled: () => setIsSelectModeloRotinaModalOpen(false)
    });

    const handleSelectModelAndAssociate = (modelId: string) => {
        if (aluno?._id) {
            associateModelMutation.mutate({ fichaModeloId: modelId, alunoId: aluno._id });
        }
    };

    const convertToModelMutation = useMutation({
        mutationFn: (rotinaId: string) => apiRequest<RotinaListagemItem>("POST", `/api/treinos/${rotinaId}/tornar-modelo`),
        onSuccess: (novoModelo) => {
            toast({ title: "Sucesso!", description: `Rotina "${novoModelo.titulo}" copiada para modelo!` });
            queryClient.setQueryData<RotinaListagemItem[]>(['/api/treinos'], (oldData) => {
                if (oldData) {
                    return [novoModelo, ...oldData];
                }
                return [novoModelo];
            });
            queryClient.invalidateQueries({ queryKey: ["modelosRotina"] });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro ao Copiar", description: error.message || "Não foi possível copiar a rotina para modelo." });
        },
        onSettled: () => {
            setIsRotinaViewModalOpen(false);
            setRotinaIdParaVer(null);
        }
    });

    const handleConvertToModelFromRotinaView = (rotina: RotinaListagemItem) => {
        if (rotina && rotina._id) {
            convertToModelMutation.mutate(rotina._id);
        } else {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível obter o ID da rotina para converter." });
        }
    };

    const handleEditSuccess = (rotinaAtualizada: RotinaListagemItem) => {
        queryClient.invalidateQueries({ queryKey: ['alunoRotinas', aluno?._id] });
        queryClient.invalidateQueries({ queryKey: ['rotinaDetalhes', rotinaAtualizada._id] });
        setRotinaParaEditar(null);
        setRotinaIdParaVer(null);
    };

    if (!aluno) {
        return null;
    }

    const getInitials = (nome: string) => {
        const parts = nome?.split(' ').filter(Boolean) || [];
        if (parts.length > 1) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return parts[0] ? parts[0].substring(0, 2).toUpperCase() : '?';
    };

    const formatDateBR = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch (e) {
            return 'N/A';
        }
    };

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return 'N/A';
        try {
            const birth = new Date(birthDate);
            const today = new Date();
            const age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                return age - 1;
            }
            return age;
        } catch {
            return 'N/A';
        }
    };

    const calculateBMI = () => {
        if (!aluno.weight || !aluno.height) return 'N/A';
        const heightInMeters = aluno.height / 100;
        const bmi = aluno.weight / (heightInMeters * heightInMeters);
        return bmi.toFixed(1);
    };

    // Mock data for enhanced stats
    const frequenciaSemanal = 3; 
    const progressoFicha = 66; 
    const pseMedio = 7.5;
    const treinos = 24;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl p-0 max-h-[90vh] overflow-hidden" aria-describedby="student-modal-description">
                    <div className="flex h-full">
                        {/* Left Sidebar - Enhanced */}
                        <div className="w-1/3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 border-r dark:border-gray-700 hidden md:flex flex-col">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="relative mb-4">
                                    <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-gray-800 shadow-lg">
                                        <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
                                            {getInitials(aluno.nome)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center ${
                                        aluno.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                    }`}>
                                        {aluno.status === 'active' ? (
                                            <Activity className="w-4 h-4 text-white" />
                                        ) : (
                                            <User className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">
                                    {aluno.nome}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    {aluno.email}
                                </p>
                                <Badge 
                                    variant={aluno.status === "active" ? "success" : "destructive"}
                                    className="mb-2"
                                >
                                    {aluno.status === "active" ? "Ativo" : "Inativo"}
                                </Badge>
                                {aluno.phone && (
                                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                        <Phone className="w-3 h-3" />
                                        <span>{aluno.phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <Cake className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Idade</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {calculateAge(aluno.birthDate)} anos
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <Activity className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">IMC</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {calculateBMI()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Início</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {formatDateBR(aluno.startDate)}
                                    </span>
                                </div>
                            </div>

                            {/* Trainer Plan Info */}
                            {trainerPlanStatus && (
                                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                                        Plano do Personal
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                            <span className="text-gray-600 dark:text-gray-400">Plano:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {trainerPlanStatus.plano?.nome || "Sem plano"}
                                            </span>
                                        </div>
                                        {trainerPlanStatus.tokensAvulsos > 0 && (
                                            <div className="flex items-center space-x-2 text-sm">
                                                <Zap className="w-4 h-4 text-blue-500" />
                                                <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {trainerPlanStatus.tokensAvulsos}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Users className="w-4 h-4 text-green-500" />
                                            <span className="text-gray-600 dark:text-gray-400">Vagas:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {trainerPlanStatus.alunosAtivos}/{trainerPlanStatus.limiteAtual}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content - Enhanced */}
                        <div className="w-full md:w-2/3 p-6 flex flex-col">
                            <DialogHeader className="md:hidden mb-4 text-center">
                                <DialogTitle>{aluno.nome}</DialogTitle>
                                <DialogDescription id="student-modal-description">
                                    Informações detalhadas do aluno, incluindo dados pessoais, rotinas de treino e histórico de atividades
                                </DialogDescription>
                            </DialogHeader>
                            <div id="student-modal-description" className="hidden md:block sr-only">
                                Informações detalhadas do aluno {aluno.nome}, incluindo dados pessoais, rotinas de treino e histórico de atividades
                            </div>

                            {/* Enhanced KPI Cards */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <KpiCard 
                                    title="Frequência" 
                                    value={`${frequenciaSemanal}/sem`} 
                                    icon={BarChart} 
                                    color="blue"
                                    trend="up"
                                    subtitle="Esta semana"
                                />
                                <KpiCard 
                                    title="PSE Médio" 
                                    value={pseMedio.toFixed(1)} 
                                    icon={Heart} 
                                    color="green"
                                    trend="neutral"
                                    subtitle="Intensidade"
                                />
                                <KpiCard 
                                    title="Progresso" 
                                    value={`${progressoFicha}%`} 
                                    icon={CheckCircle2} 
                                    color="orange"
                                    trend="up"
                                    subtitle="Meta atual"
                                />
                                <KpiCard 
                                    title="Treinos" 
                                    value={treinos} 
                                    icon={Flame} 
                                    color="purple"
                                    trend="up"
                                    subtitle="Total"
                                />
                            </div>

                            {/* Progress Bar */}
                            {progressoFicha > 0 && (
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Progresso da ficha atual
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {progressoFicha}%
                                        </span>
                                    </div>
                                    <Progress value={progressoFicha} className="h-3" />
                                </div>
                            )}

                            {/* Enhanced Tabs */}
                            <Tabs defaultValue="detalhes" className="w-full flex-grow" onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-3 mb-4">
                                    <TabsTrigger value="detalhes" className="flex items-center space-x-2">
                                        <User className="w-4 h-4" />
                                        <span>Detalhes</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="rotinas" className="flex items-center space-x-2">
                                        <Dumbbell className="w-4 h-4" />
                                        <span>Rotinas</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="historico" className="flex items-center space-x-2">
                                        <History className="w-4 h-4" />
                                        <span>Histórico</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="detalhes" className="mt-4 h-[300px] overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoItem icon={Target} label="Objetivo" value={aluno.goal} />
                                        <InfoItem icon={User} label="Gênero" value={aluno.gender} />
                                        <InfoItem icon={Weight} label="Peso" value={`${aluno.weight} kg`} />
                                        <InfoItem icon={Ruler} label="Altura" value={`${aluno.height} cm`} />
                                        <InfoItem icon={Cake} label="Data Nascimento" value={formatDateBR(aluno.birthDate)} />
                                        <InfoItem icon={CalendarDays} label="Data de Início" value={formatDateBR(aluno.startDate)} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="rotinas">
                                    <RotinasTab 
                                        alunoId={aluno._id} 
                                        onVisualizarRotina={handleVisualizarRotina} 
                                        onAssociarRotina={handleAssociarRotina} 
                                        onDeleteRotina={handleDeleteRotina} 
                                    />
                                </TabsContent>

                                <TabsContent value="historico">
                                    <HistoricoTab 
                                        alunoId={aluno._id} 
                                        isActive={activeTab === "historico"} 
                                    />
                                </TabsContent>
                            </Tabs>

                            {/* Enhanced Footer */}
                            <DialogFooter className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/alunos/editar/${aluno._id}`)}
                                    className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 border-blue-200 dark:border-blue-800"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Aluno
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modals remain the same */}
            {rotinaDetalhada && (
                <RotinaViewModal 
                    isOpen={isRotinaViewModalOpen} 
                    onClose={() => { setIsRotinaViewModalOpen(false); setRotinaIdParaVer(null); }} 
                    rotina={rotinaDetalhada} 
                    onEdit={handleEditFromView} 
                    onAssign={() => {}} 
                    onPlayVideo={handlePlayVideo} 
                    onConvertToModel={handleConvertToModelFromRotinaView} 
                />
            )}
            {videoUrl && <VideoPlayerModal videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}
            <RotinaFormModal 
                open={isRotinaFormModalOpen} 
                onClose={() => { setIsRotinaFormModalOpen(false); setRotinaParaEditar(null); }} 
                rotinaParaEditar={rotinaParaEditar} 
                onSuccess={handleEditSuccess} 
                alunos={[aluno]} 
            />
            <SelectModeloRotinaModal 
                isOpen={isSelectModeloRotinaModalOpen} 
                onClose={() => setIsSelectModeloRotinaModalOpen(false)} 
                onSelect={handleSelectModelAndAssociate} 
            />
            
            <ModalConfirmacao
                isOpen={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmDelete}
                titulo={confirmOptions.titulo}
                mensagem={confirmOptions.mensagem}
                isLoadingConfirm={deleteRotinaMutation.isPending}
            />
        </>
    );
};

export default StudentDetailsModal;