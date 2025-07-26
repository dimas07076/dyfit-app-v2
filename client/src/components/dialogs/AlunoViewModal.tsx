// client/src/components/dialogs/AlunoViewModal.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
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
  Clock, MessageSquare, TrendingUp, CalendarCheck, Loader2
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

// Interface para o histórico de sessões (baseado na API que criamos)
interface ISessaoHistorico {
  concluidaEm: string;
  inicioSessao?: string;
  fimSessao?: string;
  duracaoMinutos?: number;
  pseAluno?: 'Muito Leve' | 'Leve' | 'Moderado' | 'Intenso' | 'Muito Intenso' | 'Máximo Esforço';
  comentariosAluno?: string;
  cargaAumentada?: boolean;
  rotinaId?: {
      titulo: string;
  };
}

interface AlunoViewModalProps {
  aluno: Aluno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RotinasTab = ({ alunoId, onVisualizarRotina, onAssociarRotina, onDeleteRotina }: { alunoId: string, onVisualizarRotina: (id: string) => void, onAssociarRotina: () => void, onDeleteRotina: (rotinaId: string, rotinaTitulo: string) => void }) => {
    const { data: rotinas, isLoading, isError, error } = useQuery<AlunoRotina[]>({
        queryKey: ['alunoRotinas', alunoId],
        queryFn: () => fetchWithAuth(`/api/aluno/${alunoId}/rotinas`),
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
                        {/* Dropdown Menu para Visualizar e Excluir */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"> <MoreVertical className="h-4 w-4" /> </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onVisualizarRotina(rotina._id)}> <View className="mr-2 h-4 w-4" /> Visualizar </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDeleteRotina(rotina._id, rotina.titulo)} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/40"> <Trash2 className="mr-2 h-4 w-4" /> Remover </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))
            )}
        </div>
    );
};

const HistoricoTab = ({ alunoId, isActive }: { alunoId: string, isActive: boolean }) => {
    const { data: historicoSessoes = [], isLoading, isError, error } = useQuery<ISessaoHistorico[]>({
        queryKey: ['historicoAluno', alunoId],
        queryFn: () => fetchWithAuth(`/api/aluno/gerenciar/${alunoId}/historico`),
        enabled: isActive && !!alunoId,
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return ( <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground pt-10"> <Loader2 className="h-4 w-4 animate-spin" /> <span>Carregando histórico de treinos...</span> </div> );
    }
    if (isError) {
        return <ErrorMessage title="Erro ao carregar histórico" message={error.message} />;
    }
    if (historicoSessoes.length === 0) {
        return ( <div className="text-center text-muted-foreground pt-10"> <History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" /> <p className="mt-2">Nenhum registro de treino encontrado.</p> </div> );
    }

    const getNivelBadgeVariant = (nivel?: ISessaoHistorico['pseAluno']) => {
        switch (nivel) {
            case 'Muito Leve': return 'outline'; case 'Leve': return 'secondary'; case 'Moderado': return 'default'; case 'Intenso': return 'destructive'; case 'Muito Intenso': return 'destructive'; case 'Máximo Esforço': return 'destructive'; default: return 'default';
        }
    };

    const InfoHistoricoItem = ({ icon: Icon, label, value, highlight = false }: { icon: React.ElementType, label: string, value?: string | number | null, highlight?: boolean }) => (
        <div className="flex items-start text-sm">
            <Icon className="h-4 w-4 mr-3 mt-0.5 text-slate-500" />
            <span className="font-medium text-slate-600 dark:text-slate-400 w-24">{label}:</span>
            {value ? (
                <span className={`flex-1 ${highlight ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-slate-900 dark:text-slate-100'}`}>
                    {label === 'Duração' ? `${value} min` : value}
                </span>
            ) : (
                <span className="italic text-slate-400">Não informado</span>
            )}
        </div>
    );

    return (
        <div className="mt-4 pr-2 h-[250px] overflow-y-auto space-y-3">
            {historicoSessoes.map((sessao, index) => (
                <Card key={index} className="bg-slate-50 dark:bg-slate-800/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
                        <CardTitle className="text-base font-semibold">{sessao.rotinaId?.titulo || 'Treino Avulso'}</CardTitle>
                        {sessao.pseAluno && <Badge variant={getNivelBadgeVariant(sessao.pseAluno)}>{sessao.pseAluno}</Badge>}
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                        <InfoHistoricoItem icon={CalendarCheck} label="Realizado em" value={new Date(sessao.concluidaEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                        <InfoHistoricoItem icon={Clock} label="Duração" value={sessao.duracaoMinutos} />
                        <InfoHistoricoItem icon={MessageSquare} label="Comentários" value={sessao.comentariosAluno} />
                        <InfoHistoricoItem icon={TrendingUp} label="Carga Aumentada" value={sessao.cargaAumentada ? 'Sim' : 'Não'} highlight={!!sessao.cargaAumentada} />
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

    const [rotinaIdParaVer, setRotinaIdParaVer] = useState<string | null>(null);
    const [isRotinaViewModalOpen, setIsRotinaViewModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaListagemItem | null>(null);
    const [isRotinaFormModalOpen, setIsRotinaFormModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isSelectModeloRotinaModalOpen, setIsSelectModeloRotinaModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("detalhes");
    const [rotinaIdToDelete, setRotinaIdToDelete] = useState<string | null>(null);

    const { data: rotinaDetalhada, isFetching: isFetchingRotina } = useQuery<RotinaListagemItem>({
        queryKey: ['rotinaDetalhes', rotinaIdParaVer],
        queryFn: () => fetchWithAuth(`/api/treinos/${rotinaIdParaVer}`),
        enabled: !!rotinaIdParaVer,
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
    
    // <<< LÓGICA DE EXCLUSÃO CORRIGIDA >>>
    const handleDeleteRotina = (rotinaId: string, rotinaTitulo: string) => {
        setRotinaIdToDelete(rotinaId); // Armazena o ID no estado ao abrir o diálogo
        openConfirmDialog({
            titulo: "Confirmar Remoção",
            mensagem: `Tem certeza que deseja remover a rotina "${rotinaTitulo}" deste aluno?`,
            // onConfirm é definido aqui, mas a ação real acontece no ModalConfirmacao
            onConfirm: () => {}, 
        });
    };

    // Esta função é chamada diretamente pelo botão de confirmação no modal.
    const handleConfirmDelete = () => {
        if (rotinaIdToDelete) { // Lê o ID do estado
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

    const handleEditSuccess = (rotinaAtualizada: RotinaListagemItem) => {
        queryClient.invalidateQueries({ queryKey: ['alunoRotinas', aluno?._id] });
        queryClient.invalidateQueries({ queryKey: ['rotinaDetalhes', rotinaAtualizada._id] });
        setRotinaParaEditar(null);
        setRotinaIdParaVer(null);
    };

    if (!aluno) return null;

    const getInitials = (nome: string) => nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
    const formatDateBR = (dateStr?: string) => dateStr ? new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr)) : 'N/A';
    const frequenciaSemanal = 3; const progressoFicha = 66; const pseMedio = 7.5;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl p-0">
                    <div className="flex">
                        <div className="w-1/3 bg-slate-50 dark:bg-slate-900/50 p-6 border-r dark:border-slate-800 hidden md:flex flex-col">
                            <div className="flex flex-col items-center text-center"><Avatar className="h-24 w-24 mb-4 border-4 border-primary/50"><AvatarFallback className="text-3xl bg-slate-200 dark:bg-slate-700 text-primary">{getInitials(aluno.nome)}</AvatarFallback></Avatar><h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{aluno.nome}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{aluno.email}</p><Badge variant={aluno.status === "active" ? "success" : "destructive"} className="mt-3">{aluno.status === "active" ? "Ativo" : "Inativo"}</Badge></div>
                            <div className="mt-8 space-y-4"><InfoItem icon={Mail} label="Email" value={aluno.email} /><InfoItem icon={Phone} label="Telefone" value={aluno.phone} /></div>
                        </div>
                        <div className="w-full md:w-2/3 p-6 flex flex-col">
                            <DialogHeader className="md:hidden mb-4 text-center"><DialogTitle>{aluno.nome}</DialogTitle><DialogDescription>{aluno.email}</DialogDescription></DialogHeader>
                            <div className="grid grid-cols-3 gap-4 mb-6"><KpiCard title="Frequência" value={`${frequenciaSemanal}/sem`} icon={BarChart} /><KpiCard title="PSE Médio" value={pseMedio.toFixed(1)} icon={Sigma} /><KpiCard title="Progresso" value={`${progressoFicha}%`} icon={CheckCircle2} /></div>
                            {progressoFicha > 0 && <Progress value={progressoFicha} className="w-full h-2 mb-6" />}
                            <Tabs defaultValue="detalhes" className="w-full flex-grow" onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="detalhes">Detalhes</TabsTrigger><TabsTrigger value="rotinas">Rotinas</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>
                                <TabsContent value="detalhes" className="mt-4 pr-2 h-[250px] overflow-y-auto"><div className="space-y-1"><InfoItem icon={Target} label="Objetivo" value={aluno.goal} /><InfoItem icon={Cake} label="Nascimento" value={formatDateBR(aluno.birthDate)} /><InfoItem icon={Weight} label="Peso" value={`${aluno.weight} kg`} /><InfoItem icon={Ruler} label="Altura" value={`${aluno.height} cm`} /><InfoItem icon={User} label="Gênero" value={aluno.gender} /><InfoItem icon={CalendarDays} label="Início" value={formatDateBR(aluno.startDate)} /></div></TabsContent>
                                <TabsContent value="rotinas"><RotinasTab alunoId={aluno._id} onVisualizarRotina={handleVisualizarRotina} onAssociarRotina={handleAssociarRotina} onDeleteRotina={handleDeleteRotina} /></TabsContent>
                                <TabsContent value="historico"><HistoricoTab alunoId={aluno._id} isActive={activeTab === "historico"} /></TabsContent>
                            </Tabs>
                            <DialogFooter className="mt-auto pt-6"><Button variant="outline" asChild><Link href={`/alunos/editar/${aluno._id}`}> <Edit className="mr-2 h-4 w-4" /> Editar Aluno </Link></Button></DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <RotinaViewModal isOpen={isRotinaViewModalOpen} onClose={() => { setIsRotinaViewModalOpen(false); setRotinaIdParaVer(null); }} rotina={rotinaDetalhada || null} onEdit={handleEditFromView} onAssign={() => {}} onPlayVideo={handlePlayVideo} onConvertToModel={() => console.log("Converter para modelo (lógica a ser implementada)")} />
            {videoUrl && <VideoPlayerModal videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}
            <RotinaFormModal open={isRotinaFormModalOpen} onClose={() => { setIsRotinaFormModalOpen(false); setRotinaParaEditar(null); }} rotinaParaEditar={rotinaParaEditar} onSuccess={handleEditSuccess} alunos={[aluno]} />
            <SelectModeloRotinaModal isOpen={isSelectModeloRotinaModalOpen} onClose={() => setIsSelectModeloRotinaModalOpen(false)} onSelect={handleSelectModelAndAssociate} />
            
            <ModalConfirmacao
                isOpen={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmDelete} // Chama a função que lê o estado
                titulo={confirmOptions.titulo}
                mensagem={confirmOptions.mensagem}
                isLoadingConfirm={deleteRotinaMutation.isPending}
            />
        </>
    );
};

export default AlunoViewModal;