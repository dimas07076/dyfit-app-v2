// client/src/components/dialogs/SessaoDetalheModal.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Star, MessageSquareText, Dumbbell, Calendar, VideoOff, PlayCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VideoPlayerModal from '@/components/dialogs/VideoPlayerModal';
import { useToast } from '@/hooks/use-toast';

// --- Interfaces (sem alterações) ---
interface ExercicioDetalhePopulado { _id: string; nome: string; grupoMuscular?: string; urlVideo?: string; }
interface ExercicioEmDiaDeTreinoPopulado { _id: string; exercicioId: ExercicioDetalhePopulado | string | null; series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordemNoDia: number; }
interface DiaDeTreinoPopulado { _id: string; exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[]; }
interface RotinaCompletaPopulado { _id: string; diasDeTreino: DiaDeTreinoPopulado[]; }
interface SessaoHistorico {
  rotinaId?: { _id: string; titulo: string; } | null;
  diaDeTreinoId?: string | null;
  diaDeTreinoIdentificador?: string | null;
  nomeSubFichaDia?: string | null;
  concluidaEm: string;
  pseAluno?: string | null;
  comentarioAluno?: string | null;
}
interface SessaoDetalheModalProps {
  sessao: SessaoHistorico | null;
  onClose: () => void;
}

const getPseBadgeVariant = (pse: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (!pse) return "secondary";
    switch (pse) {
        case 'Muito Leve': case 'Leve': return "default";
        case 'Moderado': return "secondary";
        case 'Intenso': case 'Muito Intenso': return "outline";
        case 'Máximo Esforço': return "destructive";
        default: return "secondary";
    }
};

export default function SessaoDetalheModal({ sessao, onClose }: SessaoDetalheModalProps) {
  const isModalOpen = !!sessao;
  const { toast } = useToast();
  const [videoUrlParaExibir, setVideoUrlParaExibir] = useState<string | null>(null);

  const { data: detalhesRotina, isLoading, error, isSuccess } = useQuery<RotinaCompletaPopulado, Error>({
    queryKey: ['detalhesRotinaHistorico', sessao?.rotinaId?._id],
    queryFn: () => apiRequest('GET', `/api/aluno/meus-treinos/${sessao!.rotinaId!._id}`),
    enabled: isModalOpen && !!sessao?.rotinaId?._id,
  });

  const exerciciosDoDia = detalhesRotina?.diasDeTreino
    .find(dia => dia._id === sessao?.diaDeTreinoId)
    ?.exerciciosDoDia.sort((a, b) => a.ordemNoDia - b.ordemNoDia) || [];

  const dataConclusaoFormatada = sessao ? format(parseISO(sessao.concluidaEm), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR }) : '';

  const abrirVideo = (url?: string) => {
    if (!url) {
        toast({ title: "Vídeo não disponível" });
        return;
    }
    let videoUrlParaModal = url;
    if (url.includes("youtube.com/watch?v=")) {
        videoUrlParaModal = url.replace("watch?v=", "embed/");
    } else if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        if(id) videoUrlParaModal = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes("drive.google.com/file/d/")) {
        const id = url.split("/d/")[1]?.split("/")[0];
        if(id) videoUrlParaModal = `https://drive.google.com/file/d/${id}/preview`;
    }
    setVideoUrlParaExibir(videoUrlParaModal);
  };

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary">{sessao?.rotinaId?.titulo || 'Detalhes do Treino'}</DialogTitle>
            <DialogDescription>
              {sessao?.diaDeTreinoIdentificador}{sessao?.nomeSubFichaDia && ` - ${sessao.nomeSubFichaDia}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground"/> <span className="text-sm font-medium">{dataConclusaoFormatada}</span></div>
                  {sessao?.pseAluno && (
                      <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold text-sm">Seu PSE:</span>
                          <Badge variant={getPseBadgeVariant(sessao.pseAluno)}>{sessao.pseAluno}</Badge>
                      </div>
                  )}
                  {sessao?.comentarioAluno && (
                      <div className="flex items-start gap-2">
                          <MessageSquareText className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                          <div className="text-sm">
                              <span className="font-semibold">Seu comentário:</span>
                              <blockquote className="mt-1 text-xs italic text-muted-foreground border-l-2 pl-3">{sessao.comentarioAluno}</blockquote>
                          </div>
                      </div>
                  )}
              </div>

              <div>
                  <h3 className="text-md font-semibold mb-3 flex items-center"><Dumbbell className="w-5 h-5 mr-2" /> Exercícios Realizados</h3>
                  {isLoading && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
                  {error && <p className="text-sm text-red-500">Não foi possível carregar os exercícios.</p>}
                  {isSuccess && (
                      <div className="space-y-2">
                          {exerciciosDoDia.length > 0 ? exerciciosDoDia.map(ex => {
                              const detalhesEx = ex.exercicioId && typeof ex.exercicioId === 'object' ? ex.exercicioId : null;
                              return (
                                  <div key={ex._id} className="text-sm p-3 border rounded-md flex justify-between items-center">
                                      <div>
                                          <p className="font-medium">{detalhesEx?.nome || 'Exercício não encontrado'}</p>
                                          <p className="text-xs text-muted-foreground">
                                              {ex.series && `${ex.series}x`}
                                              {ex.repeticoes}
                                              {ex.carga && ` - ${ex.carga}`}
                                          </p>
                                      </div>
                                      {detalhesEx?.urlVideo ? (
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirVideo(detalhesEx.urlVideo)}>
                                              <PlayCircle className="w-5 h-5 text-red-500"/>
                                          </Button>
                                      ) : (
                                        // <<< CORREÇÃO: Ícone envolvido por um span com a propriedade 'title' >>>
                                        <span title="Vídeo não disponível">
                                          <VideoOff className="w-5 h-5 text-muted-foreground" />
                                        </span>
                                      )}
                                  </div>
                              );
                          }) : <p className="text-xs text-center text-muted-foreground py-2">Nenhum exercício detalhado encontrado para este dia.</p>}
                      </div>
                  )}
              </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <VideoPlayerModal
        videoUrl={videoUrlParaExibir}
        onClose={() => setVideoUrlParaExibir(null)}
      />
    </>
  );
}