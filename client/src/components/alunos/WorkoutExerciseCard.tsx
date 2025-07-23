// client/src/components/alunos/WorkoutExerciseCard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, PlayCircle, Clock, Weight, ChevronDown, RotateCw } from 'lucide-react';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Importa componentes de Dialog

interface ExercicioRenderizavel {
  _id: string;
  exercicioDetalhes: {
    nome: string;
    urlVideo?: string;
  } | null;
  descanso?: string;
  series?: string;
  repeticoes?: string;
  carga?: string;
}

interface WorkoutExerciseCardProps {
  exercise: ExercicioRenderizavel;
  isActive: boolean;
  isCompleted: boolean;
  onOpenVideo: (url: string) => void;
}

export const WorkoutExerciseCard: React.FC<WorkoutExerciseCardProps> = ({
  exercise,
  isActive,
  isCompleted,
  onOpenVideo,
}) => {
  const { completeExercise, uncompleteExercise, updateExerciseLoad, getExerciseLoad } = useWorkoutPlayer();
  
  const [load, setLoad] = useState(() => getExerciseLoad(exercise._id) || exercise.carga || '');
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Novo estado para controlar o modal de edição
  const [currentLoadInput, setCurrentLoadInput] = useState(load); // Estado para o input dentro do modal

  useEffect(() => {
    setIsExpanded(isActive);
  }, [isActive]);
  
  // A lógica de handleLoadChange será movida para o modal, mas a função de atualização do contexto permanece
  const handleUpdateLoad = (newLoadValue: string) => {
    setLoad(newLoadValue);
    updateExerciseLoad(exercise._id, newLoadValue);
  };
  
  const handleCompleteClick = () => {
    completeExercise(exercise._id);
  };

  const handleUncompleteClick = () => {
    uncompleteExercise(exercise._id);
  }

  const exerciseName = exercise.exercicioDetalhes?.nome || 'Exercício Removido';

  // Função para abrir o modal de edição
  const openEditModal = () => {
    setCurrentLoadInput(load); // Define o valor atual do input do modal para o valor salvo
    setIsEditModalOpen(true);
  };

  // Função para fechar o modal de edição
  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  // Função para salvar a carga do modal
  const handleSaveLoad = () => {
    handleUpdateLoad(currentLoadInput); // Atualiza a carga no estado e no contexto
    closeEditModal(); // Fecha o modal
  };
  
  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden shadow-md border",
        isCompleted ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white',
        isActive ? 'border-indigo-500 shadow-indigo-200 shadow-lg' : 'border-slate-200'
      )}
    >
      <CardHeader 
        className="flex flex-row items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isCompleted) {
                handleUncompleteClick();
              }
            }}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors", 
              isCompleted ? "bg-green-500 text-white hover:bg-green-600" : "border-2 border-gray-400"
            )}
            aria-label={isCompleted ? "Desfazer exercício" : "Exercício não concluído"}
          >
            {isCompleted ? <RotateCw size={16} /> : null}
          </button>
          <p className="font-semibold text-gray-800 whitespace-normal" title={exerciseName}>
            {exerciseName}
          </p>
        </div>
        <div className="flex items-center gap-2">
            {exercise.exercicioDetalhes?.urlVideo && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); onOpenVideo(exercise.exercicioDetalhes!.urlVideo!); }}>
                  <PlayCircle size={20} />
              </Button>
            )}
           <ChevronDown className={cn("transition-transform", isExpanded && "rotate-180")} />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 pt-0">
          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-around text-center">
              <div><p className="text-sm text-gray-500">Séries</p><p className="font-bold text-lg">{exercise.series || '-'}</p></div>
              <div><p className="text-sm text-gray-500">Repetições</p><p className="font-bold text-lg">{exercise.repeticoes || '-'}</p></div>
              <div>
                <p className="text-sm text-gray-500">Descanso</p>
                <div className='flex items-center justify-center gap-1'>
                  <Clock size={16} className="text-gray-500" />
                  <p className="font-bold text-lg">{exercise.descanso && exercise.descanso.trim() !== '' ? exercise.descanso : '-'}</p>
                </div>
              </div>
            </div>
            {/* Seção de Carga - Modificada para incluir o botão "Editar" e o modal */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Weight size={16} /> Carga Utilizada (kg)</label>
                    {/* Exibe a carga atual e o botão de edição */}
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-lg text-gray-800">{load || '-'}</p>
                        {!isCompleted && ( // O botão editar só aparece se o exercício não estiver concluído
                            <Button 
                                variant="link" 
                                className="text-blue-600 hover:text-blue-800 p-0 h-auto underline" 
                                onClick={openEditModal}
                            >
                                Editar
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {!isCompleted && (
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCompleteClick}>
                <Check className="mr-2" size={18} /> Concluir Exercício
              </Button>
            )}
          </div>
        </CardContent>
      )}

      {/* Modal de Edição de Carga */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atualizar Carga Utilizada</DialogTitle>
            <DialogDescription>
              Insira a carga utilizada para este exercício.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="currentLoad" className="text-right">
                Carga (kg)
              </label>
              <Input
                id="currentLoad"
                type="number"
                placeholder="Ex: 20"
                value={currentLoadInput}
                onChange={(e) => setCurrentLoadInput(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>Cancelar</Button>
            <Button onClick={handleSaveLoad}>Atualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
