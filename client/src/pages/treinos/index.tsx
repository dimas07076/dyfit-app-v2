// client/src/pages/treinos/index.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Folder, FolderPlus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import RotinaFormModal, { RotinaParaEditar } from "@/components/dialogs/RotinaFormModal"; 
import LoadingSpinner from "@/components/LoadingSpinner";
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

    // Estados para a nova funcionalidade de "Tornar Modelo"
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

    // Nova mutação para copiar e transformar em modelo
    const convertToModelMutation = useMutation<RotinaListagemItem, Error, string>({
      mutationFn: (rotinaId) => apiRequest("POST", `/api/treinos/copiar-para-modelo/${rotinaId}`),
      onSuccess: (newModelRotina) => {
        toast({ title: "Sucesso!", description: `Rotina "${newModelRotina.titulo}" criada como modelo.` });
        queryClient.invalidateQueries({ queryKey: ["/api/treinos"] }); // Invalida para recarregar todas as rotinas
      },
      onError: (err) => toast({ variant: "destructive", title: "Erro ao Converter", description: err.message }),
      onSettled: () => setIsConvertToModelAlertOpen(false),
    });

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

    // Nova função para abrir o modal de confirmação de "Tornar Modelo"
    const handleConvertToModelClick = (rotina: RotinaListagemItem) => {
      setRotinaParaConverterEmModelo(rotina);
      setIsConvertToModelAlertOpen(true);
    };

    // Função para confirmar a conversão para modelo
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


    if (isLoadingRotinas || isLoadingPastas || isLoadingAlunos) return <LoadingSpinner text="Carregando dados..." />;
    if (errorRotinas) return <ErrorMessage title="Erro ao Carregar Dados" message={errorRotinas.message} />;

    const rotinasModelo = rotinas.filter(r => r.tipo === 'modelo');
    const rotinasPorPasta = pastas.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map(p => ({ ...p, rotinas: rotinasModelo.filter(r => (typeof r.pastaId === 'string' ? r.pastaId : r.pastaId?._id) === p._id) }));
    const rotinasSemPasta = rotinasModelo.filter(r => !r.pastaId);

    // Adicionado onConvertToModel aos handlers
    const cardHandlers = { 
      onView: handleOpenViewModal, 
      onEdit: handleOpenEditModal, 
      onDelete: handleDeleteRotinaClick, 
      onAssign: handleAssignClick, 
      onMoveToFolder: handleMoveToFolder, 
      onRemoveFromFolder: handleRemoveFromFolder,
      onConvertToModel: handleConvertToModelClick, // Passa a nova função
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    <Dumbbell className="mr-3 h-8 w-8 text-primary"/>
                    Gerenciar Rotinas
                </h1>
                <div className="flex w-full md:w-auto gap-2">
                    <Button variant="outline" onClick={() => handleOpenPastaModal()} className="flex-1 md:flex-none">
                        <FolderPlus className="mr-2 h-4 w-4"/> Nova Pasta
                    </Button>
                    <Button onClick={handleOpenCreateModal} className="flex-1 md:flex-none">
                        <Plus className="mr-2 h-4 w-4" /> Nova Rotina
                    </Button>
                </div>
            </div>
            
            <Tabs value={aba} onValueChange={(v) => setAba(v as any)} className="mb-6">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="modelos">Rotinas Modelo</TabsTrigger><TabsTrigger value="individuais">Rotinas Individuais</TabsTrigger></TabsList>
                
                <TabsContent value="modelos" className="mt-6">
                    <div className="space-y-6">
                        <Accordion type="multiple" className="w-full space-y-3">
                            {rotinasPorPasta.map(pasta => (
                                <AccordionItem value={pasta._id} key={pasta._id} className="border dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 shadow-sm">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold text-lg">
                                        <div className="flex-grow flex items-center gap-3"><Folder className="h-5 w-5 text-primary"/> {pasta.nome} <Badge variant="secondary">{pasta.rotinas.length}</Badge></div>
                                        {/* Ajuste para evitar aninhamento de botões */}
                                        <div className="flex-shrink-0 flex items-center gap-1">
                                            <span 
                                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7 cursor-pointer" 
                                                onClick={(e) => { e.stopPropagation(); handleOpenPastaModal(pasta); }}
                                                title="Editar Pasta"
                                            >
                                                <Edit className="h-4 w-4"/>
                                            </span>
                                            <span 
                                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7 text-red-500 cursor-pointer" 
                                                onClick={(e) => { e.stopPropagation(); handleDeletePastaClick(pasta); }}
                                                title="Excluir Pasta"
                                            >
                                                <Trash2 className="h-4 w-4"/>
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 border-t dark:border-slate-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[50px]">
                                            {pasta.rotinas.map(rotina => <RotinaCard key={rotina._id} rotina={rotina} pastas={pastas} {...cardHandlers} />)}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        {rotinasSemPasta.length > 0 && (<div><h3 className="text-lg font-semibold mb-4 pt-4 border-t dark:border-slate-700">Rotinas Sem Pasta</h3><div className="p-4 border-2 border-dashed dark:border-slate-700 rounded-lg min-h-[100px]"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{rotinasSemPasta.map(rotina => <RotinaCard key={rotina._id} rotina={rotina} pastas={pastas} {...cardHandlers} />)}</div></div></div>)}
                    </div>
                </TabsContent>

                <TabsContent value="individuais" className="mt-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input type="search" placeholder="Buscar por nome do aluno ou título da rotina..." className="pl-9 w-full sm:w-96" value={buscaAluno} onChange={(e) => setBuscaAluno(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {rotinasIndividuaisFiltradas.map(rotina => {
                            const aluno = alunos.find(a => a._id === (typeof rotina.alunoId === 'string' ? rotina.alunoId : rotina.alunoId?._id)); 
                            return (<RotinaCard key={rotina._id} rotina={rotina} pastas={[]} alunoNome={aluno?.nome} {...cardHandlers} />)
                        })}
                    </div>
                    {rotinasIndividuaisFiltradas.length === 0 && (
                        <div className="text-center text-muted-foreground col-span-full mt-10">
                            <p>Nenhuma rotina individual encontrada.</p>
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
                onConvertToModel={handleConvertToModelClick} // Passa a nova função para o RotinaViewModal
            />
            {isAssociarModeloModalOpen && rotinaModeloParaAssociar && <AssociarModeloAlunoModal isOpen={isAssociarModeloModalOpen} onClose={() => setIsAssociarModeloModalOpen(false)} fichaModeloId={rotinaModeloParaAssociar.id} fichaModeloTitulo={rotinaModeloParaAssociar.titulo}/>}
            <PastaFormModal isOpen={isPastaModalOpen} onClose={() => {setIsPastaModalOpen(false); setPastaParaEditar(null);}} onSuccessCallback={handlePastaSuccess} initialData={pastaParaEditar} />
            
            {/* AlertDialog para confirmar exclusão (já existente) */}
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

            {/* Novo AlertDialog para confirmar conversão para modelo */}
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
