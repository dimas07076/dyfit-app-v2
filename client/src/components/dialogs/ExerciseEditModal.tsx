// client/src/components/dialogs/ExerciseEditModal.tsx
import { useEffect, useState } from "react"; // 'React' foi removido daqui
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFormPersistence } from '@/hooks/useFormPersistence';

// Interfaces
interface ExercicioData {
  _id: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  grupoMuscular?: string;
  tipo?: string;
  urlVideo?: string;
}
interface Props {
  exercicio: ExercicioData;
  onUpdated: () => void;
  gruposMusculares: string[];
  categoriasExercicio: string[];
}
type UpdateExercicioPayload = Omit<ExercicioData, '_id'>;

const NONE_FILTER_VALUE = "none";

export default function ExerciseEditModal({ exercicio, onUpdated, gruposMusculares, categoriasExercicio }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Form persistence for exercise editing - use unique key per exercise
  const formPersistence = useFormPersistence({
    formKey: `editarExercicio_${exercicio._id}`,
    initialValues: {
      nome: exercicio.nome,
      descricao: exercicio.descricao || "",
      categoria: exercicio.categoria || NONE_FILTER_VALUE,
      grupoMuscular: exercicio.grupoMuscular || NONE_FILTER_VALUE,
      urlVideo: exercicio.urlVideo || ""
    },
    enabled: open
  });

  // Get current form values
  const nome = formPersistence.values.nome;
  const descricao = formPersistence.values.descricao;
  const categoria = formPersistence.values.categoria;
  const grupoMuscular = formPersistence.values.grupoMuscular;
  const urlVideo = formPersistence.values.urlVideo;

  useEffect(() => {
      if (exercicio && open) {
          // Reset form with current exercise data when modal opens
          formPersistence.updateFields({
            nome: exercicio.nome,
            descricao: exercicio.descricao || "",
            categoria: exercicio.categoria || NONE_FILTER_VALUE,
            grupoMuscular: exercicio.grupoMuscular || NONE_FILTER_VALUE,
            urlVideo: exercicio.urlVideo || ""
          });
      }
  }, [exercicio, open]);

  const formatVideoUrl = (url: string): string | undefined => {
    if (!url) return undefined;
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1].split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const updateMutation = useMutation<ExercicioData, Error, UpdateExercicioPayload>({
    mutationFn: (payload) => apiRequest("PUT", `/api/exercicios/${exercicio._id}`, payload),
    onSuccess: (data) => {
      toast({ title: "Sucesso!", description: `Exercício "${data.nome}" atualizado.` });
      
      // Clear form persistence on successful save
      formPersistence.clearPersistence();
      
      onUpdated();
      queryClient.invalidateQueries({ queryKey: ['exercicios'] });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao Atualizar",
        description: error.message || "Não foi possível salvar as alterações.",
      });
    },
  });

  const handleSubmit = () => {
     if (!nome.trim()) {
       toast({ title: "Erro de Validação", description: "O nome é obrigatório.", variant: "destructive" });
       return;
     }
    const finalVideoUrl = formatVideoUrl(urlVideo);
    const payload: UpdateExercicioPayload = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria === NONE_FILTER_VALUE ? undefined : categoria,
      grupoMuscular: grupoMuscular === NONE_FILTER_VALUE ? undefined : grupoMuscular,
      tipo: undefined, // Mantido para compatibilidade
      urlVideo: finalVideoUrl || undefined,
    };
    updateMutation.mutate(payload);
  };

  // Enhanced close handler that clears form persistence when cancelled
  const handleClose = () => {
    formPersistence.clearPersistence();
    setOpen(false);
  };

  const isLoading = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(openState) => { if (!openState) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" title="Editar Exercício">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Editar Exercício</DialogTitle>
          <DialogDescription>Atualize os dados do exercício abaixo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
             <div><Label htmlFor={`edit-nome-${exercicio._id}`}>Nome*</Label><Input id={`edit-nome-${exercicio._id}`} value={nome} onChange={(e) => formPersistence.updateField('nome', e.target.value)} disabled={isLoading} required /></div>
             
             <div><Label htmlFor={`edit-grupo-${exercicio._id}`}>Grupo Muscular</Label>
                <Select value={grupoMuscular} onValueChange={(value) => formPersistence.updateField('grupoMuscular', value)} disabled={isLoading}>
                    <SelectTrigger id={`edit-grupo-${exercicio._id}`}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE_FILTER_VALUE}>Nenhum</SelectItem>
                        {gruposMusculares.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             <div><Label htmlFor={`edit-categoria-${exercicio._id}`}>Categoria</Label>
                <Select value={categoria} onValueChange={(value) => formPersistence.updateField('categoria', value)} disabled={isLoading}>
                    <SelectTrigger id={`edit-categoria-${exercicio._id}`}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE_FILTER_VALUE}>Nenhuma</SelectItem>
                        {categoriasExercicio.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
             </div>
             
             <div><Label htmlFor={`edit-descricao-${exercicio._id}`}>Descrição</Label><Textarea id={`edit-descricao-${exercicio._id}`} value={descricao} onChange={(e) => formPersistence.updateField('descricao', e.target.value)} disabled={isLoading} /></div>
             <div><Label htmlFor={`edit-urlVideo-${exercicio._id}`}>URL do Vídeo</Label><Input id={`edit-urlVideo-${exercicio._id}`} value={urlVideo} onChange={(e) => formPersistence.updateField('urlVideo', e.target.value)} disabled={isLoading} /></div>
        </div>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !nome.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}