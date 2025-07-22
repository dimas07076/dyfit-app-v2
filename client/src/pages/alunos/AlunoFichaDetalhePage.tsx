// Caminho: ./client/src/pages/alunos/AlunoFichaDetalhePage.tsx
import React, { useState, useMemo } from 'react';
import { useParams, Link as WouterLink, useLocation, useSearch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAluno } from '@/context/AlunoContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ListChecks, Dumbbell, Star, Calendar, PlayCircle, XCircle, Timer, Zap, MessageSquare, Award } from 'lucide-react';
import VideoPlayerModal from '@/components/dialogs/VideoPlayerModal';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addSeconds } from 'date-fns';
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
interface ConcluirSessaoPayload { rotinaId: string; diaDeTreinoId: string; pseAluno?: OpcaoPSEFrontend | null; comentarioAluno?: string | null; duracaoSegundos: number; cargas: Record<string, string>; }
interface ConcluirSessaoResponse { _id: string; }
// --- Fim das Interfaces ---


// ============================================================================
// COMPONENTE DO MODAL DE FEEDBACK
// ============================================================================
interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback: { pse: OpcaoPSEFrontend | null, comentario: string | null }) => void;
    isSubmitting: boolean;
    stats: { inicio: Date; fim: Date; tempoTotal: number; };
}
const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting, stats }) => {
    const [pse, setPse] = useState<OpcaoPSEFrontend | ''>('');
    const [comentario, setComentario] = useState('');

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}m ${s}s`;
    };

    const handleSubmit = () => {
        onSubmit({ pse: pse || null, comentario: comentario.trim() || null });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader className="text-center items-center">
                    <div className="bg-green-100 rounded-full p-3 w-fit mb-4">
                        <Award className="w-8 h-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">Parabéns!</DialogTitle>
                    <DialogDescription>Você concluiu seu treino!</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4 text-center border-y my-4">
                    <div>
                        <p className="text-sm text-gray-500">Início</p>
                        <p className="font-semibold">{format(stats.inicio, 'HH:mm')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Fim</p>
                        <p className="font-semibold">{format(stats.fim, 'HH:mm')}</p>
                    </div>
                    <div className="col-span-2">
                         <p className="text-sm text-gray-500">Tempo de Treino</p>
                         <p className="font-semibold">{formatTime(stats.tempoTotal)}</p>
                    </div>
                </div>
                <div className="grid gap-4">
                    <Label htmlFor="pse">O que você achou dessa atividade?</Label>
                    <Select value={pse} onValueChange={(v) => setPse(v as OpcaoPSEFrontend)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{OPCOES_PSE_FRONTEND.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                    </Select>
                    <Label htmlFor="comentario">Se quiser, deixe seu comentário aqui:</Label>
                    <Textarea id="comentario" placeholder="..." value={comentario} onChange={(e) => setComentario(e.target.value)} />
                </div>
                <DialogFooter className="mt-4">
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                        Concluir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// ============================================================================
// COMPONENTE PRINCIPAL (Wrapper)
// ============================================================================
const AlunoFichaDetalhePageWrapper: React.FC = () => ( <WorkoutPlayerProvider> <AlunoFichaDetalhePage /> </WorkoutPlayerProvider> );


// ============================================================================
// VIEW DE EXECUÇÃO
// ============================================================================
const WorkoutExecutionView: React.FC<{ diaAtivo: DiaDeTreinoPopulado; onFinishWorkout: (payload: { duracao: number; cargas: Record<string, string>; dataInicio: Date }) => void; isFinishing: boolean; }> = ({ diaAtivo, onFinishWorkout, isFinishing }) => {
    const { startWorkout, stopWorkout, isWorkoutActive, elapsedTime, activeExerciseId, completedExercises, getExerciseLoad } = useWorkoutPlayer();
    const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
    const [dataInicio, setDataInicio] = useState<Date | null>(null);

    const exerciciosParaRenderizar = useMemo(() => diaAtivo.exerciciosDoDia.map((ex): ExercicioRenderizavel | null => (ex.exercicioId && typeof ex.exercicioId === 'object') ? { ...ex, _id: ex._id, exercicioDetalhes: ex.exercicioId } : null).filter((ex): ex is ExercicioRenderizavel => ex !== null).sort((a, b) => a.ordemNoDia - b.ordemNoDia), [diaAtivo.exerciciosDoDia]);
    
    const handleStartWorkout = () => {
        setDataInicio(new Date());
        startWorkout(exerciciosParaRenderizar.map(e => ({ _id: e._id, exercicioDetalhes: e.exercicioDetalhes, descanso: e.descanso })));
    };

    const handleStopAndFinish = () => {
        const cargas = exerciciosParaRenderizar.reduce((acc, ex) => { acc[ex._id] = getExerciseLoad(ex._id); return acc; }, {} as Record<string, string>);
        onFinishWorkout({ duracao: elapsedTime, cargas, dataInicio: dataInicio! });
        stopWorkout();
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return h !== '00' ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    const abrirVideo = (url?: string) => { if (!url) return; setVideoModalUrl(url.includes("watch?v=") ? url.replace("watch?v=", "embed/") : url); };

    if (!isWorkoutActive) { return <div className="text-center p-4 flex flex-col items-center justify-center h-full"> <h2 className="text-xl font-bold text-gray-800">Pronto para começar?</h2> <p className="text-gray-600 mb-6">Dia: {diaAtivo.identificadorDia}</p> <Button size="lg" className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg" onClick={handleStartWorkout}><PlayCircle className="mr-2" /> Iniciar Treino</Button> </div>; }

    return (
        <div>
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-10 p-4 rounded-b-xl border-b mb-4"><div className="flex justify-between items-center"><h3 className="font-bold text-lg">{diaAtivo.identificadorDia}</h3><div className="flex items-center gap-2 font-mono text-lg bg-gray-800 text-white px-3 py-1 rounded-lg"><Timer size={20} /><span>{formatTime(elapsedTime)}</span></div></div><p className="text-sm text-gray-600 mt-1">Exercícios Concluídos: {completedExercises.size} / {exerciciosParaRenderizar.length}</p></div>
            <div className="space-y-3 px-4 pb-4">{exerciciosParaRenderizar.map(ex => <WorkoutExerciseCard key={ex._id} exercise={ex} isActive={ex._id === activeExerciseId} isCompleted={completedExercises.has(ex._id)} onOpenVideo={() => abrirVideo(ex.exercicioDetalhes?.urlVideo)} />)}</div>
            <div className="p-4 mt-4 border-t sticky bottom-0 bg-white"><Button onClick={handleStopAndFinish} disabled={isFinishing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" size="lg"> {isFinishing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />} Finalizar e Salvar Treino </Button></div>
            <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} />
        </div>
    );
}

// ============================================================================
// VIEW DE SUMÁRIO
// ============================================================================
const SummaryView: React.FC<{ rotina: RotinaDeTreinoAluno }> = ({ rotina }) => {
    const [, navigateWouter] = useLocation();
    const proximoDiaSugerido = useMemo(() => rotina.diasDeTreino?.sort((a,b) => a.ordemNaRotina - b.ordemNaRotina)[0] || null, [rotina.diasDeTreino]);

    return (
        <div>
            <div className="mb-6"><WouterLink href="/aluno/meus-treinos"><Button variant="outline" size="sm" className="bg-white/20 hover:bg-white/30 border-white/50 text-white rounded-lg"><ArrowLeft className="w-4 h-4 mr-2" />Voltar para Fichas</Button></WouterLink></div>
            <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader><CardTitle className="text-2xl sm:text-3xl font-bold text-indigo-700 flex items-center gap-3"><ListChecks className="w-8 h-8" />{rotina.titulo}</CardTitle>{rotina.descricao && <CardDescription className="pt-1">{rotina.descricao}</CardDescription>}{rotina.dataValidade && (<p className="text-sm text-muted-foreground pt-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Válida até: {format(parseISO(rotina.dataValidade), 'dd/MM/yyyy')}</p>)}</CardHeader>
                <CardContent>
                    {proximoDiaSugerido && (<Card className="mb-6 bg-indigo-50 border-indigo-200"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-indigo-700"><Star className="w-5 h-5" /> Treino Sugerido</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold text-gray-800">{proximoDiaSugerido.identificadorDia}{proximoDiaSugerido.nomeSubFicha && ` - ${proximoDiaSugerido.nomeSubFicha}`}</p><p className="text-sm text-gray-600">{proximoDiaSugerido.exerciciosDoDia.length} exercícios neste dia.</p></CardContent><CardFooter><Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" onClick={() => navigateWouter(`/aluno/ficha/${rotina._id}?diaId=${proximoDiaSugerido._id}`)}><PlayCircle className="w-5 h-5 mr-2" /> Visualizar Treino</Button></CardFooter></Card>)}
                    <h3 className="text-xl font-semibold mb-4 mt-2 flex items-center text-gray-800"><Dumbbell className="w-5 h-5 mr-2" /> Outros Dias da Rotina </h3>
                    <div className="space-y-3">{rotina.diasDeTreino.filter(dia => dia._id !== proximoDiaSugerido?._id).map(dia => (<button key={dia._id} onClick={() => navigateWouter(`/aluno/ficha/${rotina._id}?diaId=${dia._id}`)} className="group w-full text-left p-4 border border-slate-200 rounded-xl flex justify-between items-center bg-white hover:bg-slate-50 hover:border-indigo-400 transition-all duration-200 shadow-sm"><div><p className="font-semibold text-gray-800">{dia.identificadorDia}{dia.nomeSubFicha && ` - ${dia.nomeSubFicha}`}</p><p className="text-xs text-gray-500">{dia.exerciciosDoDia.length} exercícios</p></div><PlayCircle className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" /></button>))}</div>
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
    const { aluno } = useAluno();
    const { toast } = useToast();
    const queryClientHook = useQueryClient();

    const [workoutSummary, setWorkoutSummary] = useState<{ sessaoId: string; stats: { inicio: Date; fim: Date; tempoTotal: number; } } | null>(null);

    const { data: rotinaDetalhes, isLoading: isLoadingRotina, error: errorRotina } = useQuery<RotinaDeTreinoAluno, Error>({ queryKey: ['alunoRotinaDetalhe', rotinaIdUrl], queryFn: () => apiRequest('GET', `/api/aluno/meus-treinos/${rotinaIdUrl}`), enabled: !!rotinaIdUrl && !!aluno, });
    const diaDeTreinoAtivo = useMemo(() => { if (!rotinaDetalhes || !diaIdUrl) return null; return rotinaDetalhes.diasDeTreino.find(d => d._id === diaIdUrl) || null; }, [rotinaDetalhes, diaIdUrl]);

    const atualizarCargasFichaMutation = useMutation<any, Error, { cargas: Record<string, string> }>({
        mutationFn: ({ cargas }) => apiRequest('PATCH', `/api/aluno/meus-treinos/${rotinaIdUrl}/cargas`, {
            diaDeTreinoId: diaIdUrl,
            cargas,
        }),
        onSuccess: () => {
            console.log("Cargas na ficha atualizadas com sucesso!");
            queryClientHook.invalidateQueries({ queryKey: ['alunoRotinaDetalhe', rotinaIdUrl] });
        },
        onError: (error) => {
            console.error("Erro ao atualizar cargas na ficha:", error.message);
        }
    });

    const finalizarDiaDeTreinoMutation = useMutation<ConcluirSessaoResponse, Error, { payload: ConcluirSessaoPayload, dataInicio: Date }, { previousRotinas: RotinaDeTreinoAluno[] | undefined }>({
        onMutate: async () => {
            console.log("Iniciando mutação otimista...");
            await queryClientHook.cancelQueries({ queryKey: ['minhasRotinasAluno', aluno?.id] });

            const previousRotinas = queryClientHook.getQueryData<RotinaDeTreinoAluno[]>(['minhasRotinasAluno', aluno?.id]);

            if (previousRotinas) {
                const novasRotinas = previousRotinas.map(rotina => {
                    if (rotina._id === rotinaIdUrl) {
                        const sessoesConcluidasAtualizado = (rotina.sessoesRotinaConcluidas || 0) + 1;
                        
                        const diaConcluidoIndex = rotina.diasDeTreino.findIndex(dia => dia._id === diaIdUrl);
                        if (diaConcluidoIndex > -1) {
                            const diaConcluido = rotina.diasDeTreino.splice(diaConcluidoIndex, 1)[0];
                            rotina.diasDeTreino.push(diaConcluido);
                        }

                        console.log(`Atualização otimista: Rotina ${rotina.titulo} agora tem ${sessoesConcluidasAtualizado} sessões concluídas.`);
                        return { ...rotina, sessoesRotinaConcluidas: sessoesConcluidasAtualizado };
                    }
                    return rotina;
                });
                queryClientHook.setQueryData(['minhasRotinasAluno', aluno?.id], novasRotinas);
            }
            return { previousRotinas };
        },
        // <<< INÍCIO DA CORREÇÃO >>>
        // Corrigimos a assinatura da função para corresponder ao uso real,
        // usando underscores para indicar parâmetros não utilizados.
        onError: (err, _newTodo, context) => {
            console.error("Mutação otimista falhou. Revertendo cache.");
            if (context?.previousRotinas) {
                queryClientHook.setQueryData(['minhasRotinasAluno', aluno?.id], context.previousRotinas);
            }
            toast({ title: "Erro ao Finalizar Treino", description: err.message, variant: "destructive" });
        },
        // <<< FIM DA CORREÇÃO >>>
        onSettled: () => {
            queryClientHook.invalidateQueries({ queryKey: ['minhasRotinasAluno', aluno?.id] });
        },
        mutationFn: (vars) => apiRequest('POST', `/api/sessions/aluno/concluir-dia`, vars.payload),
        onSuccess: (data, variables) => {
            console.log("Mutação no backend bem-sucedida.");
            toast({ title: "Dia de Treino Salvo!", description: "Ótimo trabalho! Agora, conte-nos como foi." });

            const dataFim = addSeconds(variables.dataInicio, variables.payload.duracaoSegundos);
            setWorkoutSummary({ sessaoId: data._id, stats: { inicio: variables.dataInicio, fim: dataFim, tempoTotal: variables.payload.duracaoSegundos } });
            
            atualizarCargasFichaMutation.mutate({ cargas: variables.payload.cargas });
            queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
        },
    });

    const atualizarFeedbackSessaoMutation = useMutation<{ _id: string }, Error, { sessaoId: string; pseAluno: OpcaoPSEFrontend | null; comentarioAluno: string | null; }>({
        mutationFn: (payload) => apiRequest('PATCH', `/api/sessions/${payload.sessaoId}/feedback`, payload),
        onSuccess: () => {
            toast({ title: "Feedback Enviado!", description: "Obrigado! Redirecionando..." });
            setWorkoutSummary(null);
            setTimeout(() => { navigateWouter('/aluno/dashboard'); }, 1000);
        },
        onError: (error) => toast({ title: "Erro ao Enviar Feedback", description: error.message, variant: "destructive" }),
    });

    const handleFinishWorkout = (payload: { duracao: number; cargas: Record<string, string>; dataInicio: Date }) => {
        if (!rotinaIdUrl || !diaIdUrl) return;
        finalizarDiaDeTreinoMutation.mutate({ payload: { rotinaId: rotinaIdUrl, diaDeTreinoId: diaIdUrl, duracaoSegundos: payload.duracao, cargas: payload.cargas, }, dataInicio: payload.dataInicio });
    };

    const handleEnviarFeedback = (feedback: { pse: OpcaoPSEFrontend | null, comentario: string | null }) => {
        if (!workoutSummary) return;
        atualizarFeedbackSessaoMutation.mutate({ sessaoId: workoutSummary.sessaoId, pseAluno: feedback.pse, comentarioAluno: feedback.comentario });
    };

    if (isLoadingRotina) return <div className="min-h-screen w-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-white" /></div>;
    if (errorRotina) return <div>Erro: {errorRotina.message}</div>;
    if (!rotinaDetalhes) return <div>Rotina não encontrada.</div>;

    return (
        <div className="h-full">
            {diaIdUrl && diaDeTreinoAtivo ? (
                <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0 h-full flex flex-col">
                    <CardHeader className="flex-shrink-0"><WouterLink href={`/aluno/ficha/${rotinaIdUrl}`}><Button variant="outline" size="sm" className="mb-2"><XCircle className="w-4 h-4 mr-2" /> Cancelar Treino</Button></WouterLink></CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-0"><WorkoutExecutionView diaAtivo={diaDeTreinoAtivo} onFinishWorkout={handleFinishWorkout} isFinishing={finalizarDiaDeTreinoMutation.isPending} /></CardContent>
                </Card>
            ) : (
                <SummaryView rotina={rotinaDetalhes} />
            )}
            {workoutSummary && ( <FeedbackModal isOpen={!!workoutSummary} onClose={() => setWorkoutSummary(null)} onSubmit={handleEnviarFeedback} isSubmitting={atualizarFeedbackSessaoMutation.isPending} stats={workoutSummary.stats} /> )}
        </div>
    );
};

export default AlunoFichaDetalhePageWrapper;