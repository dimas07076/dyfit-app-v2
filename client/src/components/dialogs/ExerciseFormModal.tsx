// client/src/components/dialogs/ExerciseFormModal.tsx
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFormPersistence } from "@/hooks/useFormPersistence";

interface Props {
  onCreated: () => void;
  creationType: 'app' | 'personal';
  triggerButtonText?: string;
}

interface ExercicioPayload {
  nome: string;
  descricao?: string;
  grupoMuscular?: string;
  tipo?: string;
  categoria?: string;
  urlVideo?: string;
  isCustom?: boolean;
}

interface ExercicioCriadoResponse {
  _id: string;
}

export default function ExerciseFormModal({ onCreated, creationType, triggerButtonText = "Criar Exercício" }: Props) {
  // =================== LOG DE DIAGNÓSTICO ===================
  console.log(`%c[ExerciseFormModal] Renderizou com creationType: ${creationType}`, 'color: green;');
  // ==========================================================

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Form persistence hook
  const exerciseForm = useFormPersistence({
    formKey: 'exercise_form',
    initialValues: {
      nome: "",
      descricao: "",
      grupoMuscular: "",
      tipo: "",
      categoria: "",
      urlVideo: ""
    },
    enabled: open
  });

  // Enhanced close handler with proper cleanup
  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      exerciseForm.resetForm(); // Clear form when modal is closed
    }
    setOpen(isOpen);
  };

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

  const createExerciseMutation = useMutation<ExercicioCriadoResponse, Error, ExercicioPayload>({
    mutationFn: (newExerciseData) => apiRequest<ExercicioCriadoResponse>("POST", "/api/exercicios", newExerciseData),
    onSuccess: () => {
      handleClose(false); // Use centralized close handler
      onCreated();
      toast({ title: "Exercício criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['exercicios'] });
    },
    onError: (error) => {
       toast({
            title: "Erro ao criar exercício",
            description: error.message || "Não foi possível salvar o exercício.",
            variant: "destructive"
       });
    },
  });

  const handleSubmit = () => {
    if (!exerciseForm.values.nome.trim()) {
       toast({ title: "Erro de Validação", description: "O nome do exercício é obrigatório.", variant: "destructive" });
       return;
    }

    const finalVideoUrl = formatVideoUrl(exerciseForm.values.urlVideo);
    
    const payload: ExercicioPayload = {
      nome: exerciseForm.values.nome.trim(),
      isCustom: creationType === 'personal',
      ...(exerciseForm.values.descricao.trim() && { descricao: exerciseForm.values.descricao.trim() }),
      ...(exerciseForm.values.grupoMuscular && { grupoMuscular: exerciseForm.values.grupoMuscular }),
      ...(exerciseForm.values.tipo && { tipo: exerciseForm.values.tipo }),
      ...(exerciseForm.values.categoria && { categoria: exerciseForm.values.categoria }),
      ...(finalVideoUrl && { urlVideo: finalVideoUrl }),
    };

    // =================== LOG DE DIAGNÓSTICO ===================
    console.log('%c[ExerciseFormModal] Enviando payload para API:', 'color: orange; font-weight: bold;', payload);
    // ==========================================================
    createExerciseMutation.mutate(payload);
  };

  const isLoading = createExerciseMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {triggerButtonText}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para adicionar um novo exercício.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div>
            <Label>Nome*</Label>
            <Input 
              placeholder="Nome do exercício" 
              value={exerciseForm.values.nome} 
              onChange={(e) => exerciseForm.updateField('nome', e.target.value)} 
              disabled={isLoading} 
            />
          </div>
          <div>
            <Label>Grupo Muscular</Label>
            <Select 
              onValueChange={(value) => exerciseForm.updateField('grupoMuscular', value)} 
              value={exerciseForm.values.grupoMuscular} 
              disabled={isLoading}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o grupo muscular" /></SelectTrigger>
              <SelectContent>
                {["Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"].sort().map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select 
              onValueChange={(value) => exerciseForm.updateField('categoria', value)} 
              value={exerciseForm.values.categoria} 
              disabled={isLoading}
            >
              <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
              <SelectContent>
                {["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea 
              placeholder="Descrição detalhada do exercício" 
              value={exerciseForm.values.descricao} 
              onChange={(e) => exerciseForm.updateField('descricao', e.target.value)} 
              disabled={isLoading}
            />
          </div>
          <div>
            <Label>URL do Vídeo (opcional)</Label>
            <Input 
              placeholder="https://youtube.com/..." 
              value={exerciseForm.values.urlVideo} 
              onChange={(e) => exerciseForm.updateField('urlVideo', e.target.value)} 
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
           <Button 
             variant="outline" 
             onClick={() => handleClose(false)} 
             disabled={isLoading}
           >
             Cancelar
           </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !exerciseForm.values.nome.trim()}>
            {isLoading ? "Salvando..." : "Salvar Exercício"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}