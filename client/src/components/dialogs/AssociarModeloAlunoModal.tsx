// client/src/components/dialogs/AssociarModeloAlunoModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from 'lucide-react';
import { Aluno } from '@/types/aluno';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient as useTanstackQueryClient } from '@tanstack/react-query';

interface AssociarModeloAlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichaModeloId: string | null;
  fichaModeloTitulo: string | null;
}

interface AssociacaoResponse {
    _id: string;
    titulo: string;
    tipo: 'individual';
    alunoId: { _id: string; nome: string; };
}

const AssociarModeloAlunoModal: React.FC<AssociarModeloAlunoModalProps> = ({
  isOpen,
  onClose,
  fichaModeloId,
  fichaModeloTitulo,
}) => {
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useTanstackQueryClient();

  // <<< CORREÇÃO DE ROTA E QUERY KEY >>>
  const { data: alunos = [], isLoading: isLoadingAlunos } = useQuery<Aluno[], Error>({
    queryKey: ["/api/aluno/gerenciar"], // Usar a query key consistente
    queryFn: async () => {
      console.log("[AssociarModeloAlunoModal] Buscando alunos para o modal...");
      // Usar a rota correta para o personal listar seus alunos
      const data = await apiRequest<Aluno[]>("GET", "/api/aluno/gerenciar");
      console.log(`[AssociarModeloAlunoModal] ${data.length} alunos recebidos.`);
      return Array.isArray(data) ? data : [];
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedAlunoId(undefined);
    }
  }, [isOpen, fichaModeloId]);

  const handleSubmit = async () => {
    if (!fichaModeloId || !selectedAlunoId) {
      toast({
        variant: "destructive",
        title: "Seleção Incompleta",
        description: "Por favor, selecione um aluno.",
      });
      return;
    }

    setIsSubmitting(true);
    const payload = {
        fichaModeloId,
        alunoId: selectedAlunoId
    };
    const apiPath = "/api/treinos/associar-modelo";

    try {
      const novaFichaIndividual = await apiRequest<AssociacaoResponse>("POST", apiPath, payload);
      
      toast({
        title: "Sucesso!",
        description: `Ficha "${novaFichaIndividual.titulo}" criada para ${novaFichaIndividual.alunoId.nome}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
      queryClient.invalidateQueries({ queryKey: ["alunoRotinas", selectedAlunoId] }); // Invalida a busca de rotinas do aluno específico

      onClose();

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Associar",
        description: error.message || "Não foi possível criar a ficha individual a partir do modelo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !fichaModeloId || !fichaModeloTitulo) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(openStatus) => !openStatus && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" />
            Associar Modelo: {fichaModeloTitulo}
          </DialogTitle>
          <DialogDescription>
            Selecione um aluno para criar uma ficha individual baseada neste modelo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <label htmlFor="aluno-select-associar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Selecionar Aluno*
            </label>
            {isLoadingAlunos ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando alunos...</span>
              </div>
            ) : alunos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado para selecionar.</p>
            ) : (
              <Select
                value={selectedAlunoId}
                onValueChange={setSelectedAlunoId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="aluno-select-associar" className="w-full">
                  <SelectValue placeholder="Escolha um aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {alunos.map((aluno) => (
                    <SelectItem key={aluno._id} value={aluno._id}>
                      {aluno.nome} ({aluno.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingAlunos || !selectedAlunoId || alunos.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Associar e Criar Ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssociarModeloAlunoModal;