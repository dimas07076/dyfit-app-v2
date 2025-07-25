// client/src/components/dialogs/SelectModeloRotinaModal.tsx
import React, { useContext } from 'react'; // Importar useContext
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/apiClient';
import { UserContext } from '@/context/UserContext'; // Importar UserContext
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes'; // Assumindo que este tipo inclui `tipo`

// Define uma interface local para garantir que id e role sejam reconhecidos.
// Idealmente, esta interface deveria ser definida no UserContext.tsx
interface UserWithIdAndRole {
  id: string; // CORREÇÃO: Usar 'id' em vez de '_id'
  role: string;
  // Adicione outras propriedades do tipo User real se forem usadas neste componente
  // Ex: name: string; email: string;
}

interface SelectModeloRotinaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (modelId: string, modelTitle: string) => void;
}

const SelectModeloRotinaModal: React.FC<SelectModeloRotinaModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  // Faz um type assertion para UserWithIdAndRole para satisfazer o TypeScript
  const { user } = useContext(UserContext) as { user: UserWithIdAndRole | null };

  console.log("[SelectModeloRotinaModal] Modal está aberto:", isOpen); // Log
  console.log("[SelectModeloRotinaModal] Usuário do Contexto:", user); // Log do objeto user

  // Adicionar um log para a condição 'enabled'
  // CORREÇÃO: Usar user?.id em vez de user?._id
  const isQueryEnabled = isOpen && !!user?.id;
  console.log("[SelectModeloRotinaModal] Consulta habilitada (isQueryEnabled):", isQueryEnabled, " (isOpen:", isOpen, " user?.id:", user?.id, ")");

  const { data: modelRotinas = [], isLoading, isError, error } = useQuery<RotinaListagemItem[], Error>({
    // CORREÇÃO: Usar user?.id na queryKey
    queryKey: ['modelRotinas', user?.id], // Adicionar user.id à queryKey para cachear por usuário
    queryFn: async () => { // Adicionar async aqui
      let url = '/api/treinos?tipo=modelo';
      // Se o usuário for um personal, adicionar o trainerId à consulta
      // CORREÇÃO: Usar user.id
      if (user && user.role === 'personal' && user.id) { 
        url += `&trainerId=${user.id}`; 
      }
      console.log("[SelectModeloRotinaModal] Chamando API com URL:", url); // Log da URL
      try {
        const response = await fetchWithAuth(url);
        console.log("[SelectModeloRotinaModal] Resposta da API (Sucesso):", response); // Log da resposta de sucesso
        return response;
      } catch (apiError) {
        console.error("[SelectModeloRotinaModal] Erro na chamada da API:", apiError); // Log do erro da API
        throw apiError; // Re-lançar o erro para que o useQuery possa tratá-lo
      }
    },
    enabled: isQueryEnabled, // Usar a variável de controle da condição
    staleTime: 1000 * 60 * 5, // Manter dados em cache por 5 minutos
  });

  const handleSelectModel = (modelId: string, modelTitle: string) => {
    onSelect(modelId, modelTitle);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(openStatus) => !openStatus && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Selecionar Modelo de Rotina
          </DialogTitle>
          <DialogDescription>
            Escolha um modelo de rotina para associar ao aluno.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando modelos de rotina...</span>
            </div>
          ) : isError ? (
            <div className="text-center text-red-500 text-sm">
              Erro ao carregar modelos: {error?.message || "Erro desconhecido."}
            </div>
          ) : modelRotinas.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm">Nenhum modelo de rotina disponível.</p>
          ) : (
            modelRotinas.map((rotina) => (
              <div
                key={rotina._id}
                className="flex items-center justify-between p-3 rounded-md border bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => handleSelectModel(rotina._id, rotina.titulo)}
              >
                <div>
                  <p className="font-semibold text-sm">{rotina.titulo}</p>
                  {rotina.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{rotina.descricao}</p>}
                </div>
                <Button variant="ghost" size="sm">Selecionar</Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectModeloRotinaModal;
