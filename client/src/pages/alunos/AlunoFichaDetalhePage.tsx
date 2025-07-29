// Caminho: ./client/src/pages/alunos/AlunoFichaDetalhePage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link as WouterLink, useLocation, useSearch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAluno } from '@/context/AlunoContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ListChecks, Dumbbell, Calendar, PlayCircle, XCircle, Timer, Zap, MessageSquare, Award, Eye } from 'lucide-react';
import VideoPlayerModal from '@/components/dialogs/VideoPlayerModal';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { WorkoutPlayerProvider, useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { WorkoutExerciseCard } from '@/components/alunos/WorkoutExerciseCard';

// --- Interfaces ---
interface ExercicioDetalhePopulado { _id: string; nome: string; urlVideo?: string; }
interface ExercicioEmDiaDeTreinoPopulado { _id: string; exercicioId: ExercicioDetalhePopulado | string | null; series?: string; repeticoes?: string; descanso?: string; ordemNoDia: number; }
interface DiaDeTreinoPopulado { _id: string; identificadorDia: string; nomeSubFicha?: string; ordemNaRotina: number; exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[]; }
interface RotinaDeTreinoAluno { _id: string; titulo: string; descricao?: string; diasDeTreino: DiaDeTreinoPopulado[]; dataValidade?: string | null; sessoesRotinaConcluidas: number; }
type ExercicioRenderizavel = Omit<ExercicioEmDiaDeTreinoPopulado, 'exercicioId'> & { _id: string; exercicioDetalhes: ExercicioDetalhePopulado | null; };
const OPCOES_PSE_FRONTEND = [ 'Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'] as const;
type OpcaoPSEFrontend = typeof OPCOES_PSE_FRONTEND[number];
interface ConcluirSessaoPayload { rotinaId: string; diaDeTreinoId: string; pseAluno?: OpcaoPSEFrontend | null; comentarioAluno?: string | null; duracaoSegundos: number; cargas: Record<string, string>; dataInicio: string; }
interface ConcluirSessaoResponse { _id: string; }
// --- Fim das Interfaces ---

// --- Subcomponentes ---
interface FeedbackModalProps { isOpen: boolean; onClose: () => void; onSubmit: (feedback: { pse: OpcaoPSEFrontend | null, comentario: string | null }) => void; isSubmitting: boolean; stats: { inicio: Date; fim: Date; tempoTotal: number; }; }
const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, stats }) => {
    const [pse, setPse] = useState<OpcaoPSEFrontend | ''>('');
    const [comentario, setComentario] = useState('');
    const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return `${m}m ${s}s`; };
    const handleSubmit = () => { onSubmit({ pse: pse || null, comentario: comentario.trim() || null }); };
    return (<Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="sm:max-w-md"><DialogHeader className="text-center items-center"><div className="bg-green-100 rounded-full p-3 w-fit mb-4"><Award className="w-8 h-8 text-green-600" /></div><DialogTitle className="text-2xl font-bold">Parabéns!</DialogTitle><DialogDescription>Você concluiu seu treino!</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-4 py-4 text-center border-y my-4"><div><p className="text-sm text-gray-500">Início</p><p className="font-semibold">{format(stats.inicio, 'HH:mm')}</p></div><div><p className="text-sm text-gray-500">Fim</p><p className="font-semibold">{format(stats.fim, 'HH:mm')}</p></div><div className="col-span-2"><p className="text-sm text-gray-500">Tempo de Treino</p><p className="font-semibold">{formatTime(stats.tempoTotal)}</p></div></div><div className="grid gap-4"><Label htmlFor="pse">O que você achou dessa atividade?</Label><Select value={pse} onValueChange={(v) => setPse(v as OpcaoPSEFrontend)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{OPCOES_PSE_FRONTEND.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent></Select><Label htmlFor="comentario">Se quiser, deixe seu comentário aqui:</Label><Textarea id="comentario" placeholder="..." value={comentario} onChange={(e) => setComentario(e.target.value)} /></div><DialogFooter className="mt-4"><Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}Concluir</Button></DialogFooter></DialogContent></Dialog>);
};
const AlunoFichaDetalhePageWrapper: React.FC = () => ( <WorkoutPlayerProvider> <AlunoFichaDetalhePage /> </WorkoutPlayerProvider> );

const PreWorkoutDialog: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; diaDeTreino: DiaDeTreinoPopulado; }> = ({ isOpen, onClose, onConfirm, diaDeTreino }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Pronto para começar?</DialogTitle>
                <DialogDescription>Você está prestes a iniciar o treino: <span className="font-bold">{diaDeTreino.identificadorDia}{diaDeTreino.nomeSubFicha && ` - ${diaDeTreino.nomeSubFicha}`}</span></DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between gap-2">
                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                <Button type="button" onClick={onConfirm}><PlayCircle className="mr-2 h-4 w-4" /> Iniciar Treino</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

const DiaDetalhesModal: React.FC<{ isOpen: boolean; onClose: () => void; diaDeTreino: DiaDeTreinoPopulado; }> = ({ isOpen, onClose, diaDeTreino }) => {
    const exercicios = diaDeTreino.exerciciosDoDia
        .filter(ex => ex.exercicioId && typeof ex.exercicioId === 'object')
        .sort((a, b) => a.ordemNoDia - b.ordemNoDia);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{diaDeTreino.identificadorDia}{diaDeTreino.nomeSubFicha && ` - ${diaDeTreino.nomeSubFicha}`}</DialogTitle>
                    <DialogDescription>Lista de exercícios para este dia.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4 my-4">
                    <ul className="space-y-3">
                        {exercicios.map(ex => (
                            <li key={ex._id} className="text-sm p-2 bg-slate-50 rounded-md">{(ex.exercicioId as ExercicioDetalhePopulado).nome}</li>
                        ))}
                    </ul>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const WorkoutExecutionView: React.FC<{ diaAtivo: DiaDeTreinoPopulado; rotinaId: string; onFinishWorkout: (payload: { duracao: number; cargas: Record<string, string>; dataInicio: Date }) => void; }> = ({ diaAtivo, rotinaId, onFinishWorkout }) => {
    const { stopWorkout, elapsedTime, activeExerciseId, completedExercises, getExerciseLoad, workoutStartTime } = useWorkoutPlayer();
    const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

    const exerciciosParaRenderizar = useMemo(() => diaAtivo.exerciciosDoDia.map((ex): ExercicioRenderizavel | null => (ex.exercicioId && typeof ex.exercicioId === 'object') ? { ...ex, _id: ex._id, exercicioDetalhes: ex.exercicioId } : null).filter((ex): ex is ExercicioRenderizavel => ex !== null).sort((a, b) => a.ordemNoDia - b.ordemNoDia), [diaAtivo.exerciciosDoDia]);

    const handleStopAndFinish = () => {
        if (!workoutStartTime) {
            console.error("Tentativa de finalizar o treino sem uma data de início registrada.");
            return;
        }
        const cargas = exerciciosParaRenderizar.reduce((acc, ex) => { acc[ex._id] = getExerciseLoad(ex._id); return acc; }, {} as Record<string, string>);
        stopWorkout();
        onFinishWorkout({ duracao: elapsedTime, cargas, dataInicio: workoutStartTime });
    };
    
    const formatTime = (seconds: number) => { const h = Math.floor(seconds / 3600).toString().padStart(2, '0'); const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return h !== '00' ? `${h}:${m}:${s}` : `${m}:${s}`; };
    const abrirVideo = (url?: string) => { if (!url) return; setVideoModalUrl(url.includes("watch?v=") ? url.replace("watch?v=", "embed/") : url); };
    
    return (
        <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0 h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
                <WouterLink href={`/aluno/ficha/${rotinaId}`}><Button variant="outline" size="sm" className="mb-2"><XCircle className="w-4 h-4 mr-2" /> Cancelar Treino</Button></WouterLink>
                <div className="flex justify-between items-center pt-2"><h3 className="font-bold text-lg">{diaAtivo.identificadorDia}</h3><div className="flex items-center gap-2 font-mono text-lg bg-gray-800 text-white px-3 py-1 rounded-lg"><Timer size={20} /><span>{formatTime(elapsedTime)}</span></div></div>
                <p className="text-sm text-gray-600 mt-1">Exercícios Concluídos: {completedExercises.size} / {exerciciosParaRenderizar.length}</p>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto px-4 pb-4 space-y-3">{exerciciosParaRenderizar.map(ex => <WorkoutExerciseCard key={ex._id} exercise={ex} isActive={ex._id === activeExerciseId} isCompleted={completedExercises.has(ex._id)} onOpenVideo={() => abrirVideo(ex.exercicioDetalhes?.urlVideo)} />)}</CardContent>
            <CardFooter className="flex-shrink-0 p-4 mt-4 border-t sticky bottom-0 bg-white"><Button onClick={handleStopAndFinish} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" size="lg"><Zap className="w-5 h-5 mr-2" /> Finalizar e Salvar Treino</Button></CardFooter>
            <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} />
        </Card>
    );
};

const SummaryView: React.FC<{ rotina: RotinaDeTreinoAluno; onSelectDiaParaIniciar: (dia: DiaDeTreinoPopulado) => void; onSelectDiaParaVer: (dia: DiaDeTreinoPopulado) => void; }> = ({ rotina, onSelectDiaParaIniciar, onSelectDiaParaVer }) => {
    
    const diasDeTreinoOrdenados = useMemo(() => 
        [...(rotina.diasDeTreino || [])].sort((a, b) => a.ordemNaRotina - b.ordemNaRotina), 
    [rotina.diasDeTreino]);

    return (
        <div>
            <div className="mb-6"><WouterLink href="/aluno/dashboard"><Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 border-white/50 text-white rounded-lg"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Painel</Button></WouterLink></div>
            <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader><CardTitle className="text-2xl sm:text-3xl font-bold text-indigo-700 flex items-center gap-3"><ListChecks className="w-8 h-8" />{rotina.titulo}</CardTitle>{rotina.descricao && <CardDescription className="pt-1">{rotina.descricao}</CardDescription>}{rotina.dataValidade && (<p className="text-sm text-muted-foreground pt-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Válida até: {format(parseISO(rotina.dataValidade), 'dd/MM/yyyy')}</p>)}</CardHeader>
                <CardContent>
                    <h3 className="text-xl font-semibold mb-4 mt-2 flex items-center text-gray-800"><Dumbbell className="w-5 h-5 mr-2" /> Dias da Rotina </h3>
                    <div className="space-y-3">
                        {diasDeTreinoOrdenados.map(dia => (
                            <Card key={dia._id} className="w-full text-left bg-white hover:bg-slate-50 transition-colors duration-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">{dia.identificadorDia}{dia.nomeSubFicha && ` - ${dia.nomeSubFicha}`}</p>
                                            <p className="text-xs text-gray-500">{dia.exerciciosDoDia.length} exercícios</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button size="icon" variant="outline" onClick={() => onSelectDiaParaVer(dia)} aria-label="Ver detalhes do treino">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" onClick={() => onSelectDiaParaIniciar(dia)} aria-label="Iniciar treino">
                                                <PlayCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ============================================================================
// LÓGICA PRINCIPAL DA PÁGINA
// ============================================================================
const AlunoFichaDetalhePage: React.FC = () => {
    const params = useParams<{ fichaId?: string }>();
    const rotinaIdUrl = params.fichaId;
    const [, navigateWouter] = useLocation();
    const search = useSearch();
    const diaIdUrl = new URLSearchParams(search).get('diaId');
    const { aluno, isLoadingAluno } = useAluno();
    const { toast } = useToast();
    const queryClientHook = useQueryClient();
    const { resetWorkout, stopWorkout, startWorkout, isWorkoutActive } = useWorkoutPlayer();

    const [pendingWorkoutData, setPendingWorkoutData] = useState<{ duracao: number; cargas: Record<string, string>; dataInicio: Date } | null>(null);
    const [diaParaIniciar, setDiaParaIniciar] = useState<DiaDeTreinoPopulado | null>(null);
    const [diaParaVer, setDiaParaVer] = useState<DiaDeTreinoPopulado | null>(null);

    const { data: rotinaDetalhes, isLoading: isLoadingRotina, error: errorRotina } = useQuery({
        queryKey: ['alunoRotinaDetalhe', rotinaIdUrl],
        queryFn: () => apiRequest<RotinaDeTreinoAluno>('GET', `/api/aluno/meus-treinos/${rotinaIdUrl}`, undefined, 'aluno'),
        enabled: !!rotinaIdUrl && !!aluno && !isLoadingAluno,
    });
    
    const diaDeTreinoAtivo = useMemo(() => {
        if (!rotinaDetalhes || !diaIdUrl) return null;
        return rotinaDetalhes.diasDeTreino.find(d => d._id === diaIdUrl) || null;
    }, [rotinaDetalhes, diaIdUrl]);
    
    useEffect(() => {
        if (diaDeTreinoAtivo && !isWorkoutActive) {
            console.log('[PAGE_EFFECT] A URL indica um treino ativo, mas o contexto não. Iniciando o treino...');
            const exerciciosParaIniciar = diaDeTreinoAtivo.exerciciosDoDia
                .map((ex): ExercicioRenderizavel | null => (ex.exercicioId && typeof ex.exercicioId === 'object') ? { ...ex, _id: ex._id, exercicioDetalhes: ex.exercicioId } : null)
                .filter((ex): ex is ExercicioRenderizavel => ex !== null)
                .sort((a, b) => a.ordemNoDia - b.ordemNoDia);
            
            startWorkout(exerciciosParaIniciar, diaDeTreinoAtivo._id);
        }
    }, [diaDeTreinoAtivo, isWorkoutActive, startWorkout]);
    
    const handleConfirmStartWorkout = () => {
        if (!diaParaIniciar || !rotinaIdUrl) {
            return;
        }
        
        const exerciciosParaIniciar = diaParaIniciar.exerciciosDoDia
            .map((ex): ExercicioRenderizavel | null => (ex.exercicioId && typeof ex.exercicioId === 'object') ? { ...ex, _id: ex._id, exercicioDetalhes: ex.exercicioId } : null)
            .filter((ex): ex is ExercicioRenderizavel => ex !== null)
            .sort((a, b) => a.ordemNoDia - b.ordemNoDia);
        
        startWorkout(exerciciosParaIniciar, diaParaIniciar._id);
        
        navigateWouter(`/aluno/ficha/${rotinaIdUrl}?diaId=${diaParaIniciar._id}`);
        setDiaParaIniciar(null);
    };

    const atualizarCargasFichaMutation = useMutation<any, Error, { cargas: Record<string, string> }>({
        mutationFn: ({ cargas }) => apiRequest('PATCH', `/api/aluno/meus-treinos/${rotinaIdUrl}/cargas`, { diaDeTreinoId: diaIdUrl, cargas }, 'aluno'),
        onSuccess: () => { queryClientHook.invalidateQueries({ queryKey: ['alunoRotinaDetalhe', rotinaIdUrl] }); },
        onError: (error) => { console.error("Erro ao atualizar cargas na ficha:", error.message); }
    });

    const finalizarDiaDeTreinoMutation = useMutation<ConcluirSessaoResponse, Error, { payload: ConcluirSessaoPayload }, { previousRotinas: RotinaDeTreinoAluno[] | undefined }>({
        onMutate: async () => {
            await queryClientHook.cancelQueries({ queryKey: ['minhasRotinasAluno', aluno?.id] });
            const previousRotinas = queryClientHook.getQueryData<RotinaDeTreinoAluno[]>(['minhasRotinasAluno', aluno?.id]);
            if (previousRotinas) {
                const novasRotinas = previousRotinas.map(rotina => {
                    if (rotina._id === rotinaIdUrl) {
                        const diasAtuais = rotina.diasDeTreino;
                        if (!diasAtuais || diasAtuais.length === 0) return rotina;
                        const maxOrdem = Math.max(...diasAtuais.map(d => d.ordemNaRotina));
                        const diasDeTreinoAtualizados = diasAtuais.map(dia => {
                            if (dia._id === diaIdUrl) { return { ...dia, ordemNaRotina: maxOrdem + 1 }; }
                            return dia;
                        });
                        const sessoesConcluidasAtualizado = (rotina.sessoesRotinaConcluidas || 0) + 1;
                        return { ...rotina, sessoesRotinaConcluidas: sessoesConcluidasAtualizado, diasDeTreino: diasDeTreinoAtualizados };
                    }
                    return rotina;
                });
                queryClientHook.setQueryData(['minhasRotinasAluno', aluno?.id], novasRotinas);
            }
            return { previousRotinas };
        },
        onError: (err, _newTodo, context) => {
            if (context?.previousRotinas) { queryClientHook.setQueryData(['minhasRotinasAluno', aluno?.id], context.previousRotinas); }
            toast({ title: "Erro ao Salvar Treino", description: err.message, variant: "destructive" });
        },
        onSettled: () => { },
        mutationFn: (vars) => apiRequest('POST', `/api/sessions/aluno/concluir-dia`, vars.payload, 'aluno'),
        onSuccess: (_data, variables) => {
            toast({ title: "Treino Salvo!", description: "Redirecionando para o painel..." });
            atualizarCargasFichaMutation.mutate({ cargas: variables.payload.cargas });
            queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
            queryClientHook.invalidateQueries({ queryKey: ['statsProgressoAluno', aluno?.id] });
            setPendingWorkoutData(null); 
            resetWorkout();
            setTimeout(() => navigateWouter('/aluno/dashboard'), 1000);
        },
    });
    
    const handleFinishWorkout = (payload: { duracao: number; cargas: Record<string, string>; dataInicio: Date }) => {
        if (!rotinaIdUrl || !diaIdUrl) return;
        setPendingWorkoutData(payload); 
    };

    const handleEnviarFeedback = (feedback: { pse: OpcaoPSEFrontend | null, comentario: string | null }) => {
        if (!pendingWorkoutData || !rotinaIdUrl || !diaIdUrl) return;

        const finalPayload: ConcluirSessaoPayload = {
            rotinaId: rotinaIdUrl,
            diaDeTreinoId: diaIdUrl,
            dataInicio: pendingWorkoutData.dataInicio.toISOString(),
            duracaoSegundos: pendingWorkoutData.duracao,
            cargas: pendingWorkoutData.cargas,
            pseAluno: feedback.pse,
            comentarioAluno: feedback.comentario,
        };

        finalizarDiaDeTreinoMutation.mutate({ payload: finalPayload });
    };

    if (isLoadingAluno || isLoadingRotina) {
        return <div className="min-h-screen w-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-white" /></div>;
    }
    if (errorRotina) {
        return <div>Erro: {errorRotina.message}</div>;
    }
    if (!rotinaDetalhes) {
        return <div>Rotina não encontrada.</div>;
    }

    const renderContent = () => {
        if (diaIdUrl && isWorkoutActive && diaDeTreinoAtivo) {
            return <WorkoutExecutionView diaAtivo={diaDeTreinoAtivo} rotinaId={rotinaIdUrl!} onFinishWorkout={handleFinishWorkout} />;
        }
        return <SummaryView rotina={rotinaDetalhes} onSelectDiaParaIniciar={setDiaParaIniciar} onSelectDiaParaVer={setDiaParaVer} />; 
    };

    const workoutSummaryForModal = pendingWorkoutData ? {
        stats: {
            inicio: pendingWorkoutData.dataInicio,
            fim: new Date(),
            tempoTotal: pendingWorkoutData.duracao,
        }
    } : null;

    const handleCloseFeedbackModal = () => {
        setPendingWorkoutData(null);
        stopWorkout();
    };

    return (
        <div className="h-full">
            {renderContent()}

            {diaParaIniciar && (
                <PreWorkoutDialog isOpen={!!diaParaIniciar} onClose={() => setDiaParaIniciar(null)} onConfirm={handleConfirmStartWorkout} diaDeTreino={diaParaIniciar} />
            )}

            {diaParaVer && (
                <DiaDetalhesModal isOpen={!!diaParaVer} onClose={() => setDiaParaVer(null)} diaDeTreino={diaParaVer} />
            )}

            {workoutSummaryForModal && (
                <FeedbackModal 
                    isOpen={!!workoutSummaryForModal} 
                    onClose={handleCloseFeedbackModal} 
                    onSubmit={handleEnviarFeedback} 
                    isSubmitting={finalizarDiaDeTreinoMutation.isPending} 
                    stats={workoutSummaryForModal.stats} 
                />
            )}
        </div>
    );
};

export default AlunoFichaDetalhePageWrapper;