// client/src/components/dialogs/AlunoViewModal.tsx
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
  Clock, MessageSquare, TrendingUp, CalendarCheck, Loader2, Crown, Users, Zap, Ticket // <-- CORREÇÃO AQUI
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
import TokenInfoDisplay from '../TokenInfoDisplay';
import { Separator } from '../ui/separator';
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

interface AlunoViewModalProps {
  aluno: Aluno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RotinasTab = ({ alunoId, onVisualizarRotina, onAssociarRotina, onDeleteRotina }: { alunoId: string, onVisualizarRotina: (id: string) => void, onAssociarRotina: () => void, onDeleteRotina: (rotinaId: string, rotinaTitulo: string) => void }) => {
    const { data: rotinas, isLoading, isError, error } = useQuery<AlunoRotina[]>({
        queryKey: ['alunoRotinas', alunoId],
        queryFn: () => apiRequest("GET", `/api/treinos/aluno/${alunoId}`),
        enabled: !!alunoId,
    });

    if (isLoading) {
        return ( <div className="space-y-3 mt-4"> {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)} </div> );
    }

    if (isError) {
        return <ErrorMessage title="Erro ao buscar rotinas" message={error.message} />;
    }

    return (
        <div className="mt-4 pr-2 h-[250px] overflow-y-auto space-y-2">
            <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={onAssociarRotina}> <PlusCircle className="mr-2 h-4 w-4" /> Associar Rotina </Button>
            </div>
            {(!rotinas || rotinas.length === 0) ? (
                <div className="text-center text-muted-foreground pt-10"> <Dumbbell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" /> <p className="mt-2">Nenhuma rotina associada a este aluno.</p> </div>
            ) : (
                rotinas.map(rotina => (
                    <div key={rotina._id} className="flex items-center justify-between p-3 rounded-md border bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div> <p className="font-semibold text-sm">{rotina.titulo}</p> <p className="text-xs text-muted-foreground"> Atualizada em: {new Date(rotina.atualizadoEm).toLocaleDateString('pt-BR')} </p> </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreVertical className="h-4 w-4" /> </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onVisualizarRotina(rotina._id)} className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                    <View className="mr-2 h-4 w-4" /> Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDeleteRotina(rotina._id, rotina.titulo)} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/40">
                                    <span className="flex items-center">
                                        <Trash2 className="mr-2 h-4 w-4" /> Remover
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))
            )}
        </div>
    );
};

const HistoricoTab = ({ alunoId, isActive }: { alunoId: string, isActive: boolean }) => {
    const { data: historico, isLoading, isError, error } = useQuery<IWorkoutHistoryLog[]>({
        queryKey: ['historicoAlunoWorkoutLogs', alunoId],
        queryFn: () => fetchWithAuth(`/api/activity-logs/aluno/${alunoId}`),
        enabled: isActive && !!alunoId,
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return ( <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground pt-10"> <Loader2 className="h-4 w-4 animate-spin" /> <span>Carregando histórico de treinos...</span> </div> );
    }
    if (isError) {
        return <ErrorMessage title="Erro ao carregar histórico" message={error.message} />;
    }
    if (!historico || historico.length === 0) {
        return ( <div className="text-center text-muted-foreground pt-10"> <History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" /> <p className="mt-2">Nenhum registro de treino encontrado.</p> </div> );
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

    const InfoHistoricoItem = ({ icon: Icon, label, value, highlight = false }: { icon: React.ElementType, label: string, value?: string | number | null, highlight?: boolean }) => (
        <div className="flex items-start text-sm">
            <Icon className="h-4 w-4 mr-3 mt-0.5 text-slate-500" />
            <span className="font-medium text-slate-600 dark:text-slate-400 w-28">{label}:</span>
            {value || (value === 0) ? (
                <span className={`flex-1 ${highlight ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-slate-900 dark:text-slate-100'}`}>
                    {label === 'Duração' ? `${value} min` : value}
                </span>
            ) : (
                <span className="italic text-slate-400">Não informado</span>
            )}
        </div>
    );
    
    const formatDateTime = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="mt-4 pr-2 h-[250px] overflow-y-auto space-y-3">
            {historico.map((log) => (
                <Card key={log._id} className="bg-slate-50 dark:bg-slate-800/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <CardTitle className="text-base font-semibold">{log.treinoTitulo}</CardTitle>
                        {log.nivelTreino && <Badge variant={getNivelBadgeVariant(log.nivelTreino)}>{nivelTreinoMap[log.nivelTreino] || log.nivelTreino}</Badge>}
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                        <InfoHistoricoItem icon={CalendarDays} label="Iniciado em" value={formatDateTime(log.dataInicio)} />
                        <InfoHistoricoItem icon={CalendarCheck} label="Concluído em" value={formatDateTime(log.dataFim)} />
                        <InfoHistoricoItem icon={Clock} label="Duração" value={log.duracaoTotalMinutos} />
                        <InfoHistoricoItem icon={MessageSquare} label="Comentários" value={log.comentarioAluno} />
                        <InfoHistoricoItem icon={TrendingUp} label="Aumentou Carga" value={log.aumentoCarga ? 'Sim' : 'Não'} highlight={!!log.aumentoCarga} />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => ( <div className="flex items-start text-sm py-2 border-b border-slate-100 dark:border-slate-800"> <Icon className="h-4 w-4 mr-3 mt-0.5 text-slate-500" /> <span className="font-medium text-slate-600 dark:text-slate-400 w-32">{label}:</span> <span className="text-slate-900 dark:text-slate-100">{value || <span className="italic text-slate-400">Não informado</span>}</span> </div> );
const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => ( <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</CardTitle> <Icon className="h-4 w-4 text-slate-500" /> </CardHeader> <CardContent> <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div> </CardContent> </Card> );

const AlunoViewModal: React.FC<AlunoViewModalProps> = ({ aluno, open, onOpenChange }) => {
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

    const handleVisualizarRotina = (rotinaId: string) => {
        setRotinaIdParaVer(rotinaId);
    };

    const handleEditFromView = (rotina: RotinaListagemItem) => {
        setRotinaParaEditar(rotina);
        setIsRotinaViewModalOpen(false);
        setTimeout(() => {
            setIsRotinaFormModalOpen(true);
        }, 100);
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
            onConfirm: handleConfirmDelete, 
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
        queryClient.removeQueries({ queryKey: ['rotinaDetalhes'] });
    };

    if (!aluno) {
        return null;
    }

    const getInitials = (nome: string) => nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
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
    const frequenciaSemanal = 3; const progressoFicha = 66; const pseMedio = 7.5;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl p-0" aria-describedby="aluno-modal-description">
                    <div className="flex">
                        <div className="w-1/3 bg-slate-50 dark:bg-slate-900/50 p-6 border-r dark:border-slate-800 hidden md:flex flex-col">
                            <div className="flex flex-col items-center text-center"><Avatar className="h-24 w-24 mb-4 border-4 border-primary/50"><AvatarFallback className="text-3xl bg-slate-200 dark:bg-slate-700 text-primary">{getInitials(aluno.nome)}</AvatarFallback></Avatar><h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{aluno.nome}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{aluno.email}</p><Badge variant={aluno.status === "active" ? "success" : "destructive"} className="mt-3">{aluno.status === "active" ? "Ativo" : "Inativo"}</Badge></div>
                            <div className="mt-8 space-y-4">
                                <InfoItem icon={Mail} label="Email" value={aluno.email} />
                                <InfoItem icon={Phone} label="Telefone" value={aluno.phone} />
                                
                                {trainerPlanStatus && (
                                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Informações do Plano</h3>
                                        <InfoItem icon={Crown} label="Plano" value={trainerPlanStatus.plano?.nome || "Sem plano ativo"} />
                                        {trainerPlanStatus.tokensAvulsos > 0 && (<InfoItem icon={Zap} label="Tokens Avulsos" value={`${trainerPlanStatus.tokensAvulsos} disponíveis`} />)}
                                        <InfoItem icon={Users} label="Vagas" value={`${trainerPlanStatus.alunosAtivos}/${trainerPlanStatus.limiteAtual}`} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-full md:w-2/3 p-6 flex flex-col">
                            <DialogHeader className="md:hidden mb-4 text-center">
                                <DialogTitle>{aluno.nome}</DialogTitle>
                                <DialogDescription id="aluno-modal-description">
                                    Informações detalhadas do aluno, incluindo dados pessoais, rotinas de treino e histórico de atividades
                                </DialogDescription>
                            </DialogHeader>
                            <div id="aluno-modal-description" className="hidden md:block sr-only">
                                Informações detalhadas do aluno {aluno.nome}, incluindo dados pessoais, rotinas de treino e histórico de atividades
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-6"><KpiCard title="Frequência" value={`${frequenciaSemanal}/sem`} icon={BarChart} /><KpiCard title="PSE Médio" value={pseMedio.toFixed(1)} icon={Sigma} /><KpiCard title="Progresso" value={`${progressoFicha}%`} icon={CheckCircle2} /></div>
                            {progressoFicha > 0 && <Progress value={progressoFicha} className="w-full h-2 mb-6" />}
                            <Tabs defaultValue="detalhes" className="w-full flex-grow" onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="detalhes">Detalhes</TabsTrigger><TabsTrigger value="rotinas">Rotinas</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>
                                <TabsContent value="detalhes" className="mt-4 pr-2 h-[250px] overflow-y-auto">
                                    <h3 className="text-md font-semibold mb-2 text-slate-800 dark:text-slate-200">Dados Pessoais</h3>
                                    <div className="space-y-1">
                                        <InfoItem icon={Target} label="Objetivo" value={aluno.goal} />
                                        <InfoItem icon={Cake} label="Nascimento" value={formatDateBR(aluno.birthDate)} />
                                        <InfoItem icon={Weight} label="Peso" value={aluno.weight ? `${aluno.weight} kg` : 'N/A'} />
                                        <InfoItem icon={Ruler} label="Altura" value={aluno.height ? `${aluno.height} cm` : 'N/A'} />
                                        <InfoItem icon={User} label="Gênero" value={aluno.gender} />
                                        <InfoItem icon={CalendarDays} label="Início" value={formatDateBR(aluno.startDate)} />
                                    </div>
                                    
                                    <Separator className="my-4" />
                                    
                                    <h3 className="text-md font-semibold mb-2 text-slate-800 dark:text-slate-200">
                                        <div className="flex items-center">
                                            <Ticket className="mr-2 h-5 w-5 text-primary"/> Token Associado
                                        </div>
                                    </h3>
                                    <div className="p-1">
                                        <TokenInfoDisplay studentId={aluno._id} />
                                    </div>

                                </TabsContent>
                                <TabsContent value="rotinas"><RotinasTab alunoId={aluno._id} onVisualizarRotina={handleVisualizarRotina} onAssociarRotina={handleAssociarRotina} onDeleteRotina={handleDeleteRotina} /></TabsContent>
                                <TabsContent value="historico"><HistoricoTab alunoId={aluno._id} isActive={activeTab === "historico"} /></TabsContent>
                            </Tabs>
                            <DialogFooter className="mt-auto pt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/alunos/editar/${aluno._id}`)}
                                >
                                    <Edit className="mr-2 h-4 w-4" /> Editar Aluno
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {rotinaDetalhada && (
                <RotinaViewModal 
                    isOpen={isRotinaViewModalOpen} 
                    onClose={() => { 
                        setIsRotinaViewModalOpen(false); 
                        setTimeout(() => {
                            setRotinaIdParaVer(null);
                        }, 150);
                    }} 
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
                onClose={() => { 
                    setIsRotinaFormModalOpen(false); 
                    setRotinaParaEditar(null); 
                }} 
                rotinaParaEditar={rotinaParaEditar} 
                onSuccess={handleEditSuccess} 
                alunos={[aluno]} 
            />
            <SelectModeloRotinaModal isOpen={isSelectModeloRotinaModalOpen} onClose={() => setIsSelectModeloRotinaModalOpen(false)} onSelect={handleSelectModelAndAssociate} />
            
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

export default AlunoViewModal;