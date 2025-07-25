// client/src/components/dialogs/AlunoViewModal.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'; // Importar useMutation
import { Link } from 'wouter';
import { fetchWithAuth, apiRequest } from '@/lib/apiClient'; // Importar apiRequest
import { useToast } from '@/hooks/use-toast'; // Importar useToast
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
import { Dumbbell, Edit, History, Mail, Phone, User, Weight, Ruler, Cake, Target, CalendarDays, BarChart, CheckCircle2, Sigma, FileText, View, PlusCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import ErrorMessage from '../ErrorMessage';
import RotinaViewModal from './RotinaViewModal';
import VideoPlayerModal from './VideoPlayerModal';
import RotinaFormModal from './RotinaFormModal';
import SelectModeloRotinaModal from './SelectModeloRotinaModal'; // Importar o novo modal de seleção de modelo
// import AssociarModeloAlunoModal from './AssociarModeloAlunoModal'; // Este modal não será mais aberto diretamente aqui
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';

interface AlunoRotina {
    _id: string;
    titulo: string;
    descricao?: string;
    atualizadoEm: string;
}

interface AlunoViewModalProps {
  aluno: Aluno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RotinasTab = ({ alunoId, onVisualizarRotina, isVisualizingRotina, onAssociarRotina }: { alunoId: string, onVisualizarRotina: (id: string) => void, isVisualizingRotina: boolean, onAssociarRotina: () => void }) => {
    const { data: rotinas, isLoading, isError, error } = useQuery<AlunoRotina[]>({
        queryKey: ['alunoRotinas', alunoId],
        queryFn: () => fetchWithAuth(`/api/aluno/${alunoId}/rotinas`),
        enabled: !!alunoId,
    });

    if (isLoading) {
        return (
            <div className="space-y-3 mt-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        );
    }

    if (isError) {
        return <ErrorMessage title="Erro ao buscar rotinas" message={error.message} />;
    }

    return (
        <div className="mt-4 pr-2 h-[250px] overflow-y-auto space-y-2">
            {/* Botão Associar Rotina - AGORA SEMPRE VISÍVEL */}
            <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={onAssociarRotina}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Associar Rotina
                </Button>
            </div>

            {(!rotinas || rotinas.length === 0) ? (
                <div className="text-center text-muted-foreground pt-10">
                    <Dumbbell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                    <p className="mt-2">Nenhuma rotina associada a este aluno.</p>
                </div>
            ) : (
                rotinas.map(rotina => (
                    <div key={rotina._id} className="flex items-center justify-between p-3 rounded-md border bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold text-sm">{rotina.titulo}</p>
                                <p className="text-xs text-muted-foreground"> Atualizada em: {new Date(rotina.atualizadoEm).toLocaleDateString('pt-BR')} </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onVisualizarRotina(rotina._id)} disabled={isVisualizingRotina}>
                            {isVisualizingRotina ? <Loader2 className="h-4 w-4 animate-spin"/> : <View className="h-4 w-4" />}
                        </Button>
                    </div>
                ))
            )}
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => ( <div className="flex items-start text-sm py-2 border-b border-slate-100 dark:border-slate-800"> <Icon className="h-4 w-4 mr-3 mt-0.5 text-slate-500" /> <span className="font-medium text-slate-600 dark:text-slate-400 w-32">{label}:</span> <span className="text-slate-900 dark:text-slate-100">{value || <span className="italic text-slate-400">Não informado</span>}</span> </div> );
const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => ( <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</CardTitle> <Icon className="h-4 w-4 text-slate-500" /> </CardHeader> <CardContent> <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div> </CardContent> </Card> );

const AlunoViewModal: React.FC<AlunoViewModalProps> = ({ aluno, open, onOpenChange }) => {
    const queryClient = useQueryClient();
    const { toast } = useToast(); // Inicializar useToast
    const [rotinaIdParaVer, setRotinaIdParaVer] = useState<string | null>(null);
    const [isRotinaViewModalOpen, setIsRotinaViewModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaListagemItem | null>(null);
    const [isRotinaFormModalOpen, setIsRotinaFormModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    // NOVO ESTADO: Para controlar a abertura do modal de seleção de modelo
    const [isSelectModeloRotinaModalOpen, setIsSelectModeloRotinaModalOpen] = useState(false);

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

    // NOVA FUNÇÃO: Para abrir o modal de seleção de modelo
    const handleAssociarRotina = () => {
        setIsSelectModeloRotinaModalOpen(true);
    };

    // NOVA FUNÇÃO: Para associar a rotina selecionada do modal de modelos
    const associateModelMutation = useMutation({
        mutationFn: async ({ fichaModeloId, alunoId }: { fichaModeloId: string; alunoId: string }) => {
            const payload = { fichaModeloId, alunoId };
            const apiPath = "/api/treinos/associar-modelo";
            return apiRequest("POST", apiPath, payload);
        },
        onSuccess: (data) => {
            toast({
                title: "Sucesso!",
                description: `Ficha "${data.titulo}" criada para ${data.alunoId.nome}.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
            queryClient.invalidateQueries({ queryKey: ["alunoRotinas", aluno?._id] });
        },
        onError: (error: any) => {
            toast({
                variant: "destructive",
                title: "Erro ao Associar",
                description: error.message || "Não foi possível criar a ficha individual a partir do modelo.",
            });
        },
        onSettled: () => {
            setIsSelectModeloRotinaModalOpen(false); // Fechar o modal após a tentativa de associação
        }
    });

    const handleSelectModelAndAssociate = (modelId: string) => { // REMOÇÃO: modelTitle não é mais necessário aqui
        if (aluno?._id) {
            associateModelMutation.mutate({ fichaModeloId: modelId, alunoId: aluno._id });
        } else {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível associar a rotina: Aluno não identificado.",
            });
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
                            <Tabs defaultValue="detalhes" className="w-full flex-grow">
                                <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="detalhes">Detalhes</TabsTrigger><TabsTrigger value="rotinas">Rotinas</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>
                                <TabsContent value="detalhes" className="mt-4 pr-2 h-[250px] overflow-y-auto"><div className="space-y-1"><InfoItem icon={Target} label="Objetivo" value={aluno.goal} /><InfoItem icon={Cake} label="Nascimento" value={formatDateBR(aluno.birthDate)} /><InfoItem icon={Weight} label="Peso" value={`${aluno.weight} kg`} /><InfoItem icon={Ruler} label="Altura" value={`${aluno.height} cm`} /><InfoItem icon={User} label="Gênero" value={aluno.gender} /><InfoItem icon={CalendarDays} label="Início" value={formatDateBR(aluno.startDate)} /></div></TabsContent>
                                <TabsContent value="rotinas"><RotinasTab alunoId={aluno._id} onVisualizarRotina={handleVisualizarRotina} isVisualizingRotina={isFetchingRotina} onAssociarRotina={handleAssociarRotina} /></TabsContent>
                                <TabsContent value="historico" className="mt-4"><div className="text-center text-muted-foreground pt-10"><History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" /><p className="mt-2">Histórico de treinos em breve.</p></div></TabsContent>
                            </Tabs>
                            <DialogFooter className="mt-auto pt-6"><Button variant="outline" asChild><Link href={`/alunos/editar/${aluno._id}`}> <Edit className="mr-2 h-4 w-4" /> Editar Aluno </Link></Button></DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <RotinaViewModal
                isOpen={isRotinaViewModalOpen}
                onClose={() => { setIsRotinaViewModalOpen(false); setRotinaIdParaVer(null); }}
                rotina={rotinaDetalhada || null}
                onEdit={handleEditFromView}
                onAssign={() => {}}
                onPlayVideo={handlePlayVideo}
                onConvertToModel={() => console.log("Converter para modelo (lógica a ser implementada)")}
            />
            {videoUrl && <VideoPlayerModal videoUrl={videoUrl} onClose={() => setVideoUrl(null)} />}

            <RotinaFormModal
                open={isRotinaFormModalOpen}
                onClose={() => { setIsRotinaFormModalOpen(false); setRotinaParaEditar(null); }}
                rotinaParaEditar={rotinaParaEditar}
                onSuccess={handleEditSuccess}
                alunos={[aluno]}
            />

            {/* NOVO MODAL: SelectModeloRotinaModal */}
            <SelectModeloRotinaModal
                isOpen={isSelectModeloRotinaModalOpen}
                onClose={() => setIsSelectModeloRotinaModalOpen(false)}
                onSelect={handleSelectModelAndAssociate}
            />
        </>
    );
};

export default AlunoViewModal;
