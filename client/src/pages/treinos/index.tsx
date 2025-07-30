// client/src/pages/treinos/index.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Folder, FolderPlus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import RotinaFormModal, { RotinaParaEditar } from "@/components/dialogs/RotinaFormModal"; 
import PageLoader from "@/components/PageLoader";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiRequest } from "@/lib/queryClient";
import AssociarModeloAlunoModal from "@/components/dialogs/AssociarModeloAlunoModal";
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes'; 
import { RotinaCard } from '@/components/rotinas/RotinaCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RotinaViewModal from "@/components/dialogs/RotinaViewModal";
import PastaFormModal, { PastaExistente } from "@/components/dialogs/PastaFormModal";
import { Badge } from "@/components/ui/badge";
import VideoPlayerModal from "@/components/dialogs/VideoPlayerModal";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";

export interface Pasta { _id: string; nome: string; ordem?: number; }

export default function TreinosPage() {
    const [isRotinaModalOpen, setIsRotinaModalOpen] = useState(false);
    const [rotinaParaEditar, setRotinaParaEditar] = useState<RotinaParaEditar | null>(null); 
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [rotinaParaVisualizar, setRotinaParaVisualizar] = useState<RotinaListagemItem | null>(null);
    const [isAssociarModeloModalOpen, setIsAssociarModeloModalOpen] = useState(false);
    const [rotinaModeloParaAssociar, setRotinaModeloParaAssociar] = useState<{id: string; titulo: string} | null>(null);
    const [aba, setAba] = useState<'modelos' | 'individuais'>('modelos');
    const [isPastaModalOpen, setIsPastaModalOpen] = useState(false);
    const [pastaParaEditar, setPastaParaEditar] = useState<PastaExistente | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; nome: string; tipo: 'rotina' | 'pasta' } | null>(null);
    const [videoUrlToPlay, setVideoUrlToPlay] = useState<string | null>(null);
    const [buscaAluno, setBuscaAluno] = useState("");

    const [isConvertToModelAlertOpen, setIsConvertToModelAlertOpen] = useState(false);
    const [rotinaParaConverterEmModelo, setRotinaParaConverterEmModelo] = useState<RotinaListagemItem | null>(null);

    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useUser();
    const trainerId = user?.id;

    const { data: rotinas = [], isLoading: isLoadingRotinas, error: errorRotinas } = useQuery<RotinaListagemItem[], Error>({ queryKey: ["/api/treinos"], queryFn: () => apiRequest("GET", "/api/treinos") });
    const { data: alunos = [], isLoading: isLoadingAlunos } = useQuery<Aluno[], Error>({ queryKey: ["/api/aluno/gerenciar"], queryFn: () => apiRequest("GET", "/api/aluno/gerenciar"), staleTime: 1000 * 60 * 5 });
    const { data: pastas = [], isLoading: isLoadingPastas } = useQuery<Pasta[], Error>({ queryKey: ["/api/pastas/treinos"], queryFn: () => apiRequest("GET", "/api/pastas/treinos")});
    
    const deleteMutation = useMutation<any, Error, { id: string; tipo: 'rotina' | 'pasta' }>({ 
        mutationFn: ({ id, tipo }) => apiRequest("DELETE", tipo === 'rotina' ? `/api/treinos/${id}` : `/api/pastas/treinos/${id}`), 
        onSuccess: (_, variables) => { 
            const itemTipo = variables.tipo === 'rotina' ? 'Rotina' : 'Pasta'; 
            toast({ title: "Sucesso!", description: `${itemTipo} excluída com sucesso.` }); 
            queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); 
            queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] });
            if (trainerId) {
                queryClient.invalidateQueries({ queryKey: ["dashboardGeral", trainerId] });
            }
        }, 
        onError: (err) => toast({ variant: "destructive", title: "Erro ao Excluir", description: err.message }), 
        onSettled: () => setIsDeleteAlertOpen(false), 
    });

    const moveRotinaMutation = useMutation<RotinaListagemItem, Error, { rotinaId: string; pastaId: string | null }>({ mutationFn: ({ rotinaId, pastaId }) => apiRequest("PUT", `/api/treinos/${rotinaId}/pasta`, { pastaId }), onSuccess: (updatedRotina) => { toast({ title: "Sucesso!", description: `Rotina "${updatedRotina.titulo}" movida.` }); queryClient.setQueryData<RotinaListagemItem[]>(["/api/treinos"], (oldData) => { if (!oldData) return [updatedRotina]; return oldData.map(r => r._id === updatedRotina._id ? updatedRotina : r); }); }, onError: (err) => toast({ variant: "destructive", title: "Erro ao Mover", description: err.message }), });

    // <<< INÍCIO DA ALTERAÇÃO >>>
    const convertToModelMutation = useMutation<RotinaListagemItem, Error, string>({
      // 1. URL da API corrigida para a rota unificada.
      mutationFn: (rotinaId) => apiRequest("POST", `/api/treinos/${rotinaId}/tornar-modelo`),
      onSuccess: (newModelRotina) => {
        toast({ title: "Sucesso!", description: `Rotina "${newModelRotina.titulo}" criada como modelo.` });
        
        // 2. Implementada a atualização manual e instantânea do cache.
        queryClient.setQueryData<RotinaListagemItem[]>(['/api/treinos'], (oldData) => {
            if (oldData) {
                return [newModelRotina, ...oldData];
            }
            return [newModelRotina];
        });
      },
      onError: (err) => toast({ variant: "destructive", title: "Erro ao Converter", description: err.message }),
      onSettled: () => setIsConvertToModelAlertOpen(false),
    });
    // <<< FIM DA ALTERAÇÃO >>>

    const handleOpenCreateModal = () => { setRotinaParaEditar(null); setIsRotinaModalOpen(true); };
    const handleOpenEditModal = (r: RotinaListagemItem) => { setIsViewModalOpen(false); setRotinaParaEditar(r); setIsRotinaModalOpen(true); };
    const handleOpenViewModal = (r: RotinaListagemItem) => { setRotinaParaVisualizar(r); setIsViewModalOpen(true); };
    const handleAssignClick = (id: string, t: string) => { setIsViewModalOpen(false); setRotinaModeloParaAssociar({ id, titulo: t }); setIsAssociarModeloModalOpen(true); };
    const handleOpenPastaModal = (p?: PastaExistente) => { setPastaParaEditar(p || null); setIsPastaModalOpen(true); };
    const handleDeleteRotinaClick = (rotina: RotinaListagemItem) => { setItemParaExcluir({ id: rotina._id, nome: rotina.titulo, tipo: 'rotina' }); setIsDeleteAlertOpen(true); };
    const handleDeletePastaClick = (pasta: Pasta) => { setItemParaExcluir({ id: pasta._id, nome: pasta.nome, tipo: 'pasta' }); setIsDeleteAlertOpen(true); };
    const handleConfirmDelete = () => { if (itemParaExcluir) deleteMutation.mutate(itemParaExcluir); };
    const handleMoveToFolder = (rotinaId: string, pastaId: string) => moveRotinaMutation.mutate({ rotinaId, pastaId });
    const handleRemoveFromFolder = (rotinaId: string) => moveRotinaMutation.mutate({ rotinaId, pastaId: null });
    const handlePastaSuccess = () => { queryClient.invalidateQueries({ queryKey: ["/api/pastas/treinos"] }); setIsPastaModalOpen(false); setPastaParaEditar(null); };
    const handlePlayVideo = (url: string) => setVideoUrlToPlay(url);

    const handleConvertToModelClick = (rotina: RotinaListagemItem) => {
      setRotinaParaConverterEmModelo(rotina);
      setIsConvertToModelAlertOpen(true);
    };

    const handleConfirmConvertToModel = () => {
      if (rotinaParaConverterEmModelo) {
        convertToModelMutation.mutate(rotinaParaConverterEmModelo._id);
      }
    };

    const rotinasIndividuaisFiltradas = useMemo(() => {
        const rotinasBase = rotinas.filter(r => r.tipo === 'individual');
        if (!buscaAluno.trim()) { return rotinasBase; }
        const lowerCaseBusca = buscaAluno.toLowerCase();
        return rotinasBase.filter(rotina => {
            const aluno = alunos.find(a => a._id === (typeof rotina.alunoId === 'string' ? rotina.alunoId : rotina.alunoId?._id));
            return aluno?.nome.toLowerCase().includes(lowerCaseBusca) || rotina.titulo.toLowerCase().includes(lowerCaseBusca);
        });
    }, [rotinas, alunos, buscaAluno]);


    if (isLoadingRotinas || isLoadingPastas || isLoadingAlunos) return <PageLoader message="Carregando suas rotinas..." submessage="Organizando seus treinos e dados..." />;
    if (errorRotinas) return <ErrorMessage title="Erro ao Carregar Dados" message={errorRotinas.message} />;

    const rotinasModelo = rotinas.filter(r => r.tipo === 'modelo');
    const rotinasPorPasta = pastas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(p => ({ ...p, rotinas: rotinasModelo.filter(r => (typeof r.pastaId === 'string' ? r.pastaId : r.pastaId?._id) === p._id) }));
    const rotinasSemPasta = rotinasModelo.filter(r => !r.pastaId);

    const cardHandlers = { 
      onView: handleOpenViewModal, 
      onEdit: handleOpenEditModal, 
      onDelete: handleDeleteRotinaClick, 
      onAssign: handleAssignClick, 
      onMoveToFolder: handleMoveToFolder, 
      onRemoveFromFolder: handleRemoveFromFolder,
      onConvertToModel: handleConvertToModelClick,
    };

    return (
        <div className="container mx-auto py-6 px-4 md:py-8 max-w-7xl">
            {/* Header Section with improved spacing and gradient */}
            <div className="flex flex-col gap-6 sm:gap-4 md:flex-row md:justify-between md:items-center mb-8">
                <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                        <Dumbbell className="h-8 w-8 text-primary"/>
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Gerenciar Rotinas
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Organize e gerencie suas rotinas de treino
                        </p>
                    </div>
                </div>
                
                {/* Action buttons with improved mobile layout */}
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => handleOpenPastaModal()} 
                        className="flex-1 sm:flex-none h-11 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                    >
                        <FolderPlus className="mr-2 h-4 w-4"/> 
                        Nova Pasta
                    </Button>
                    <Button 
                        onClick={handleOpenCreateModal} 
                        className="flex-1 sm:flex-none h-11 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        <Plus className="mr-2 h-4 w-4" /> 
                        Nova Rotina
                    </Button>
                </div>
            </div>
            
            {/* Tabs with improved styling */}
            <Tabs value={aba} onValueChange={(v) => setAba(v as any)} className="mb-8">
                <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm border border-border/50">
                    <TabsTrigger 
                        value="modelos" 
                        className="h-10 font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground transition-all duration-200"
                    >
                        Rotinas Modelo
                    </TabsTrigger>
                    <TabsTrigger 
                        value="individuais"
                        className="h-10 font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground transition-all duration-200"
                    >
                        Rotinas Individuais
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="modelos" className="mt-8 space-y-6">
                    <div className="space-y-6">
                        <Accordion type="multiple" className="w-full space-y-4">
                            {rotinasPorPasta.map(pasta => (
                                <AccordionItem 
                                    value={pasta._id} 
                                    key={pasta._id} 
                                    className="border border-border/60 rounded-xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
                                >
                                    <AccordionTrigger className="px-6 py-4 hover:no-underline font-semibold text-lg group">
                                        <div className="flex-grow flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-200">
                                                <Folder className="h-5 w-5 text-primary"/> 
                                            </div>
                                            <span className="font-semibold">{pasta.nome}</span>
                                            <Badge 
                                                variant="secondary" 
                                                className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary font-medium"
                                            >
                                                {pasta.rotinas.length}
                                            </Badge>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-primary/10 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); handleOpenPastaModal(pasta); }}
                                                title="Editar Pasta"
                                            >
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors"
                                                onClick={(e) => { e.stopPropagation(); handleDeletePastaClick(pasta); }}
                                                title="Excluir Pasta"
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6 border-t border-border/30">
                                        <div className="grid grid-responsive pt-4 min-h-[120px]">
                                            {pasta.rotinas.map(rotina => 
                                                <RotinaCard 
                                                    key={rotina._id} 
                                                    rotina={rotina} 
                                                    pastas={pastas} 
                                                    {...cardHandlers} 
                                                />
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        
                        {rotinasSemPasta.length > 0 && (
                            <div className="border border-dashed border-border/60 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-muted to-muted/50">
                                        <Folder className="h-5 w-5 text-muted-foreground"/>
                                    </div>
                                    <h3 className="text-lg font-semibold">Rotinas Sem Pasta</h3>
                                    <Badge variant="outline" className="border-border/60">
                                        {rotinasSemPasta.length}
                                    </Badge>
                                </div>
                                <div className="grid grid-responsive">
                                    {rotinasSemPasta.map(rotina => 
                                        <RotinaCard 
                                            key={rotina._id} 
                                            rotina={rotina} 
                                            pastas={pastas} 
                                            {...cardHandlers} 
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="individuais" className="mt-8 space-y-6">
                    {/* Enhanced search section */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <div className="relative bg-card/50 backdrop-blur-sm border border-border/60 rounded-xl p-4">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input 
                                    type="search" 
                                    placeholder="Buscar por nome do aluno ou título da rotina..." 
                                    className="pl-10 h-11 bg-background/80 border-border/60 focus:border-primary/60 transition-colors" 
                                    value={buscaAluno} 
                                    onChange={(e) => setBuscaAluno(e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Results grid with responsive classes */}
                    <div className="grid grid-responsive">
                        {rotinasIndividuaisFiltradas.map(rotina => {
                            const aluno = alunos.find(a => a._id === (typeof rotina.alunoId === 'string' ? rotina.alunoId : rotina.alunoId?._id)); 
                            return (
                                <RotinaCard 
                                    key={rotina._id} 
                                    rotina={rotina} 
                                    pastas={[]} 
                                    alunoNome={aluno?.nome} 
                                    {...cardHandlers} 
                                />
                            )
                        })}
                    </div>
                    
                    {/* Empty state with better styling */}
                    {rotinasIndividuaisFiltradas.length === 0 && (
                        <div className="text-center py-16 px-4">
                            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-muted/50 to-muted/20 flex items-center justify-center mb-6">
                                <Search className="h-10 w-10 text-muted-foreground/60" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Nenhuma rotina encontrada</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                {buscaAluno.trim() 
                                    ? `Não encontramos rotinas que correspondam à sua busca "${buscaAluno}".`
                                    : "Ainda não há rotinas individuais criadas."
                                }
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            
            <RotinaFormModal open={isRotinaModalOpen} onClose={() => setIsRotinaModalOpen(false)} onSuccess={() => {}} alunos={alunos} rotinaParaEditar={rotinaParaEditar} />
            <RotinaViewModal 
                isOpen={isViewModalOpen} 
                onClose={() => setIsViewModalOpen(false)} 
                rotina={rotinaParaVisualizar} 
                onEdit={handleOpenEditModal} 
                onAssign={handleAssignClick} 
                onPlayVideo={handlePlayVideo} 
                onConvertToModel={handleConvertToModelClick}
            />
            {isAssociarModeloModalOpen && rotinaModeloParaAssociar && <AssociarModeloAlunoModal isOpen={isAssociarModeloModalOpen} onClose={() => setIsAssociarModeloModalOpen(false)} fichaModeloId={rotinaModeloParaAssociar.id} fichaModeloTitulo={rotinaModeloParaAssociar.titulo}/>}
            <PastaFormModal isOpen={isPastaModalOpen} onClose={() => {setIsPastaModalOpen(false); setPastaParaEditar(null);}} onSuccessCallback={handlePastaSuccess} initialData={pastaParaEditar} />
            
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={(open) => !open && setIsDeleteAlertOpen(false)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>Tem certeza que deseja excluir "{itemParaExcluir?.nome}"?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isConvertToModelAlertOpen} onOpenChange={(open) => !open && setIsConvertToModelAlertOpen(false)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tornar Rotina Modelo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja criar uma cópia da rotina "{rotinaParaConverterEmModelo?.titulo}" e transformá-la em uma rotina modelo? A rotina original permanecerá inalterada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmConvertToModel} disabled={convertToModelMutation.isPending}>
                    {convertToModelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <VideoPlayerModal videoUrl={videoUrlToPlay} onClose={() => setVideoUrlToPlay(null)} />
        </div>
    );
}