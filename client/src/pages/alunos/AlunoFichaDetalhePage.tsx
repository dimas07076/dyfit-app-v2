// Caminho: ./client/src/pages/alunos/AlunoFichaDetalhePage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link as WouterLink, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAluno } from '@/context/AlunoContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, ListChecks, Dumbbell, CheckSquare, Square, AlertTriangle, PlayCircle, VideoOff, RefreshCw, Zap, MessageSquare, Smile } from 'lucide-react';
import VideoPlayerModal from '@/components/dialogs/VideoPlayerModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils'; // Importa o utilitário 'cn' para mesclar classes

// --- Interfaces ---
interface ExercicioDetalhePopulado { _id: string; nome: string; grupoMuscular?: string; urlVideo?: string; descricao?: string; categoria?: string; tipo?: string; }
interface ExercicioEmDiaDeTreinoPopulado { _id: string; exercicioId: ExercicioDetalhePopulado | string | null; series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordemNoDia: number; concluido?: boolean; }
interface DiaDeTreinoPopulado { _id: string; identificadorDia: string; nomeSubFicha?: string; ordemNaRotina: number; exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[]; }
interface RotinaDeTreinoAluno { _id: string; titulo: string; descricao?: string; criadorId?: { _id: string; nome?: string; } | string | null; tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre'; diasDeTreino: DiaDeTreinoPopulado[]; criadoEm: string; atualizadoEm?: string; dataValidade?: string | null; totalSessoesRotinaPlanejadas?: number | null; sessoesRotinaConcluidas: number; }
type ExercicioRenderizavel = Omit<ExercicioEmDiaDeTreinoPopulado, 'exercicioId' | '_id'> & { _id: string; exercicioDetalhes: ExercicioDetalhePopulado | null; concluido: boolean; };
const OPCOES_PSE_FRONTEND = [ 'Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'] as const;
type OpcaoPSEFrontend = typeof OPCOES_PSE_FRONTEND[number];
interface ConcluirSessaoPayload { rotinaId: string; diaDeTreinoId: string; pseAluno?: OpcaoPSEFrontend | null; comentarioAluno?: string | null; sessaoId?: string; }
interface ConcluirSessaoResponse { _id: string; status: string; concluidaEm: string; pseAluno?: OpcaoPSEFrontend | null; comentarioAluno?: string | null; message?: string; }


const AlunoFichaDetalhePage: React.FC = () => {
  const params = useParams<{ fichaId?: string }>(); 
  const rotinaIdUrl = params.fichaId;
  const [, navigateWouter] = useLocation();
  const [diaIdUrl] = useState<string | null>(() => new URLSearchParams(window.location.search).get('diaId'));
  const { aluno } = useAluno();
  const { toast } = useToast();
  const queryClientHook = useQueryClient();

  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [exerciciosDoDiaParaRenderizar, setExerciciosDoDiaParaRenderizar] = useState<ExercicioRenderizavel[]>([]);
  const [diaDeTreinoAtivo, setDiaDeTreinoAtivo] = useState<DiaDeTreinoPopulado | null>(null);
  const [mostrarModalFeedback, setMostrarModalFeedback] = useState(false);
  const [novaSessaoConcluidaId, setNovaSessaoConcluidaId] = useState<string | null>(null);
  const [pseSelecionado, setPseSelecionado] = useState<OpcaoPSEFrontend | ''>('');
  const [comentarioAlunoModal, setComentarioAlunoModal] = useState('');

  const {
    data: rotinaDetalhes, 
    isLoading: isLoadingRotina,
    error: errorRotina,
    refetch: refetchRotina,
  } = useQuery<RotinaDeTreinoAluno, Error>({ 
    queryKey: ['alunoRotinaDetalhe', rotinaIdUrl],
    queryFn: () => apiRequest('GET', `/api/aluno/meus-treinos/${rotinaIdUrl}`),
    enabled: !!rotinaIdUrl && !!diaIdUrl && !!aluno,
  });
  
  useEffect(() => {
    if (rotinaDetalhes && diaIdUrl) {
      const diaAtivo = rotinaDetalhes.diasDeTreino.find(d => d._id === diaIdUrl);
      setDiaDeTreinoAtivo(diaAtivo || null);
      if (diaAtivo) {
        const exerciciosFormatados = diaAtivo.exerciciosDoDia
          .map((ex): ExercicioRenderizavel => ({
                _id: ex._id, 
                exercicioDetalhes: (ex.exercicioId && typeof ex.exercicioId === 'object') ? ex.exercicioId : null,
                series: ex.series, repeticoes: ex.repeticoes, carga: ex.carga,
                descanso: ex.descanso, observacoes: ex.observacoes, ordemNoDia: ex.ordemNoDia,
                concluido: false, 
          }))
          .sort((a, b) => a.ordemNoDia - b.ordemNoDia);
        setExerciciosDoDiaParaRenderizar(exerciciosFormatados);
      } else {
        setExerciciosDoDiaParaRenderizar([]);
      }
    }
  }, [rotinaDetalhes, diaIdUrl]);

  const finalizarDiaDeTreinoMutation = useMutation<ConcluirSessaoResponse, Error, ConcluirSessaoPayload>({
    mutationFn: (payload) => apiRequest('POST', `/api/sessions/aluno/concluir-dia`, payload),
    onSuccess: (data) => {
        toast({ title: "Dia de Treino Concluído!", description: "Ótimo trabalho! Agora, conte-nos como foi." });
        setNovaSessaoConcluidaId(data._id);
        setPseSelecionado(data.pseAluno || '');
        setComentarioAlunoModal(data.comentarioAluno || '');
        setMostrarModalFeedback(true);
    },
    onError: (error) => toast({ title: "Erro ao Finalizar Treino", description: error.message, variant: "destructive" }),
  });

  const atualizarFeedbackSessaoMutation = useMutation<ConcluirSessaoResponse, Error, ConcluirSessaoPayload & { sessaoId: string }>({
    mutationFn: (payload) => apiRequest('PATCH', `/api/sessions/${payload.sessaoId}/feedback`, payload),
    onSuccess: () => {
        toast({ title: "Feedback Enviado!", description: "Obrigado pelo seu feedback!" });
        setMostrarModalFeedback(false);
        queryClientHook.invalidateQueries({ queryKey: ['frequenciaSemanalAluno', aluno?.id] });
        queryClientHook.invalidateQueries({ queryKey: ['minhasRotinasAluno', aluno?.id] }); 
        setTimeout(() => { navigateWouter('/aluno/dashboard'); }, 1500);
    },
    onError: (error) => toast({ title: "Erro ao Enviar Feedback", description: error.message, variant: "destructive"}),
  });

  const handleToggleExercicioConcluido = (id: string) => setExerciciosDoDiaParaRenderizar(p => p.map(ex => ex._id === id ? { ...ex, concluido: !ex.concluido } : ex));
  const totalExercicios = exerciciosDoDiaParaRenderizar.length;
  const exerciciosConcluidosCount = exerciciosDoDiaParaRenderizar.filter(ex => ex.concluido).length;
  const handleFinalizarTreinoDia = () => { if (!rotinaIdUrl || !diaIdUrl) return toast({ title: "Erro", description: "Informações da rotina ou dia de treino ausentes."}); if (totalExercicios > 0 && exerciciosConcluidosCount < totalExercicios) { if (!window.confirm(`Você ainda não marcou todos os exercícios. Deseja finalizar mesmo assim?`)) return; } finalizarDiaDeTreinoMutation.mutate({ rotinaId: rotinaIdUrl, diaDeTreinoId: diaIdUrl }); };
  const handleEnviarFeedback = () => { if (!novaSessaoConcluidaId) return toast({ title: "Erro", description: "Sessão não identificada."}); atualizarFeedbackSessaoMutation.mutate({ sessaoId: novaSessaoConcluidaId, rotinaId: rotinaIdUrl!, diaDeTreinoId: diaIdUrl!, pseAluno: pseSelecionado || null, comentarioAluno: comentarioAlunoModal.trim() || null }); };
  const abrirVideo = (url?: string) => { if (!url) return toast({ title: "Vídeo não disponível" }); let videoUrlParaModal = url; if (url.includes("youtube.com/watch?v=")) videoUrlParaModal = url.replace("watch?v=", "embed/"); else if (url.includes("youtu.be/")) { const id = url.split("youtu.be/")[1]?.split("?")[0]; if(id) videoUrlParaModal = `https://www.youtube.com/embed/${id}`; } else if (url.includes("drive.google.com/file/d/")) { const id = url.split("/d/")[1]?.split("/")[0]; if(id) videoUrlParaModal = `https://drive.google.com/file/d/${id}/preview`; } setVideoModalUrl(videoUrlParaModal); };
  
  if (isLoadingRotina) return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4"> <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p>A carregar detalhes da rotina...</p> </div> );
  if (errorRotina) return ( <div className="container p-4 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar </Button> </WouterLink> <Card className="max-w-2xl mx-auto border-red-200 bg-red-50"> <CardHeader> <CardTitle className="text-xl text-red-700 flex items-center justify-center"> <AlertTriangle className="w-6 h-6 mr-2"/> Erro ao Carregar Rotina </CardTitle> </CardHeader> <CardContent> <p>{errorRotina.message}</p> <Button onClick={() => refetchRotina()} className="mt-4"> <RefreshCw className="w-4 h-4 mr-2"/> Tentar Novamente </Button> </CardContent> </Card> </div> );
  if (!rotinaDetalhes || !diaDeTreinoAtivo) return ( <div className="container p-4 text-center"> <WouterLink href="/aluno/dashboard"> <Button variant="outline" className="mb-6"> <ArrowLeft className="w-4 h-4 mr-2" /> Voltar </Button> </WouterLink> <p className="text-lg py-10">Rotina ou dia de treino não encontrado.</p> </div> );

  const progressoPercentual = totalExercicios > 0 ? Math.round((exerciciosConcluidosCount / totalExercicios) * 100) : 0;

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4">
      <div className="mb-6"><WouterLink href="/aluno/dashboard"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></WouterLink></div>
      <Card className="shadow-xl border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3"><ListChecks className="w-8 h-8" />{rotinaDetalhes.titulo}</CardTitle>
          <CardDescription className="pt-1 text-lg">Dia: <strong>{diaDeTreinoAtivo.identificadorDia}</strong>{diaDeTreinoAtivo.nomeSubFicha && ` - ${diaDeTreinoAtivo.nomeSubFicha}`}</CardDescription>
          {rotinaDetalhes.descricao && (<p className="pt-1 text-sm text-muted-foreground">{rotinaDetalhes.descricao}</p>)}
          {totalExercicios > 0 && (<div className="mt-4"><Label className="text-sm font-medium">Progresso do Dia: {progressoPercentual}% ({exerciciosConcluidosCount}/{totalExercicios})</Label><div className="w-full bg-gray-200 rounded-full h-2.5 mt-1"><div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${progressoPercentual}%` }}></div></div></div>)}
        </CardHeader>
        <CardContent className="pt-2">
          <h3 className="text-xl font-semibold mb-4 mt-2 flex items-center"><Dumbbell className="w-5 h-5 mr-2" /> Exercícios do Dia </h3>
          {exerciciosDoDiaParaRenderizar.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-3">
              {exerciciosDoDiaParaRenderizar.map((ex) => (
                <AccordionItem key={ex._id} value={ex._id} className={cn('border rounded-lg shadow-sm overflow-hidden', ex.concluido ? 'opacity-80 border-green-500 bg-green-50' : 'bg-white')}>
                  {/* <<< CORREÇÃO JSX: O <AccordionTrigger> agora não tem mais botões aninhados >>> */}
                  <AccordionTrigger className={cn('px-4 py-3 hover:no-underline text-sm w-full', ex.concluido ? 'hover:bg-green-100/70' : 'hover:bg-slate-50')}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center flex-1 min-w-0">
                        <div role="button" aria-label={ex.concluido ? "Desmarcar como feito" : "Marcar como feito"} tabIndex={0}
                             className={cn('h-8 w-8 mr-3 shrink-0 flex items-center justify-center rounded-md hover:bg-slate-200 transition-colors', ex.concluido ? 'text-green-700' : 'text-gray-400')}
                             onClick={(e) => { e.stopPropagation(); handleToggleExercicioConcluido(ex._id);}}>
                          {ex.concluido ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 truncate">
                          <span className={cn('font-medium', ex.concluido && 'line-through text-gray-600')}>
                            {ex.exercicioDetalhes?.nome || <span className="text-red-500 italic">[Exercício Removido]</span>}
                          </span>
                          {(ex.series || ex.repeticoes) && (<span className={cn('ml-2 text-xs text-blue-600', ex.concluido && 'text-gray-500')}>({ex.series || '?'}{'x'}{ex.repeticoes || '?'})</span>)}
                        </div>
                      </div>
                      {ex.exercicioDetalhes?.urlVideo ? (
                        <div role="button" aria-label="Ver vídeo" tabIndex={0}
                             className="h-8 w-8 text-red-500 mx-2 shrink-0 flex items-center justify-center rounded-md hover:bg-slate-200 transition-colors"
                             onClick={(e) => { e.stopPropagation(); abrirVideo(ex.exercicioDetalhes?.urlVideo); }}>
                          <PlayCircle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 text-gray-400 mx-2 shrink-0 flex items-center justify-center" title="Vídeo não disponível">
                          <VideoOff className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-0 pb-4">
                    <div className="pt-3 border-t space-y-1.5 text-xs text-muted-foreground">
                      {ex.exercicioDetalhes?.grupoMuscular && <p><strong>Grupo Muscular:</strong> {ex.exercicioDetalhes.grupoMuscular}</p>}
                      {ex.series && <p><strong>Séries:</strong> {ex.series}</p>} {ex.repeticoes && <p><strong>Repetições:</strong> {ex.repeticoes}</p>}
                      {ex.carga && <p><strong>Carga:</strong> {ex.carga}</p>} {ex.descanso && <p><strong>Descanso:</strong> {ex.descanso}</p>}
                      {ex.observacoes && <p className="mt-1 pt-1 border-t"><strong>Obs.:</strong> {ex.observacoes}</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : ( <p className="text-sm text-center py-6">{isLoadingRotina ? "A carregar..." : "Nenhum exercício encontrado."}</p> )}
        </CardContent>
        <CardFooter className="pt-6 border-t flex justify-center"> <Button onClick={handleFinalizarTreinoDia} disabled={finalizarDiaDeTreinoMutation.isPending || atualizarFeedbackSessaoMutation.isPending} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" size="lg"> {(finalizarDiaDeTreinoMutation.isPending) ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />} Finalizar Treino do Dia </Button> </CardFooter> </Card> <VideoPlayerModal videoUrl={videoModalUrl} onClose={() => setVideoModalUrl(null)} /> <Dialog open={mostrarModalFeedback} onOpenChange={setMostrarModalFeedback}> <DialogContent className="sm:max-w-[480px]"> <DialogHeader><DialogTitle className="flex items-center"><Smile className="w-6 h-6 mr-2 text-primary" /> Feedback do Treino</DialogTitle><DialogDescription>Parabéns por concluir! Como você se sentiu?</DialogDescription></DialogHeader> <div className="grid gap-4 py-4"> <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="pse" className="text-right">PSE</Label><Select value={pseSelecionado} onValueChange={(v) => setPseSelecionado(v as OpcaoPSEFrontend)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Como se sentiu?" /></SelectTrigger><SelectContent>{OPCOES_PSE_FRONTEND.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent></Select></div> <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="comentario" className="text-right self-start pt-2">Comentários</Label><Textarea id="comentario" placeholder="Deixe suas observações..." className="col-span-3" value={comentarioAlunoModal} onChange={(e) => setComentarioAlunoModal(e.target.value)} /></div> </div> <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={atualizarFeedbackSessaoMutation.isPending}>Pular</Button></DialogClose><Button type="button" onClick={handleEnviarFeedback} disabled={atualizarFeedbackSessaoMutation.isPending}>{atualizarFeedbackSessaoMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}Enviar Feedback</Button></DialogFooter> </DialogContent> </Dialog> </div> );
};

export default AlunoFichaDetalhePage;