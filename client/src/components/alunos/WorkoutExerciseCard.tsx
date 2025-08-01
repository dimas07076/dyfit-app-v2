// client/src/components/alunos/WorkoutExerciseCard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, PlayCircle, Clock, Weight, ChevronDown, RotateCcw, Info, Link } from 'lucide-react';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Interface final com o campo 'observacoes' (plural)
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
  observacoes?: string; // NOME CORRETO DO CAMPO
  grupoCombinado?: string; // ID do grupo para exercícios combinados
}

interface WorkoutExerciseCardProps {
  exercise: ExercicioRenderizavel;
  isActive: boolean;
  isCompleted: boolean;
  onOpenVideo: (url: string) => void;
  isInGroup?: boolean; // Indica se o exercício faz parte de um grupo
  groupInfo?: {
    totalInGroup: number;
    positionInGroup: number;
    groupId: string;
  };
}

export const WorkoutExerciseCard: React.FC<WorkoutExerciseCardProps> = ({
  exercise,
  isActive,
  isCompleted,
  onOpenVideo,
  isInGroup = false,
  groupInfo,
}) => {
  const { completeExercise, uncompleteExercise, updateExerciseLoad, getExerciseLoad } = useWorkoutPlayer();
  
  const [load, setLoad] = useState(() => getExerciseLoad(exercise._id) || exercise.carga || '');
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentLoadInput, setCurrentLoadInput] = useState(load);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);

  useEffect(() => {
    setIsExpanded(isActive);
  }, [isActive]);
  
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

  const openEditModal = () => {
    setCurrentLoadInput(load);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveLoad = () => {
    handleUpdateLoad(currentLoadInput);
    closeEditModal();
  };
  
  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden shadow-md border",
        isCompleted ? 'bg-green-50 border-green-300 shadow-green-100' : 'bg-white border-slate-200',
        isActive ? 'border-indigo-500 shadow-indigo-200 shadow-lg' : '',
        isInGroup ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
      )}
    >
      {/* Group indicator banner */}
      {isInGroup && groupInfo && (
        <div className="bg-blue-100 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Link size={16} />
            <span className="font-medium">
              Exercício Conjugado ({groupInfo.positionInGroup}/{groupInfo.totalInGroup})
            </span>
            <span className="text-xs bg-blue-200 px-2 py-1 rounded-full">
              Executar em sequência
            </span>
          </div>
        </div>
      )}
      
      <CardHeader 
        className="flex flex-row items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
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

            {/* SEÇÃO DE OBSERVAÇÕES - VERSÃO FINAL */}
            {exercise.observacoes && (
              <div className="space-y-2 pt-4 border-t mt-4">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Info size={16} /> Observações do Personal</label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border">{exercise.observacoes}</p>
              </div>
            )}
            
            <div className="space-y-2 pt-4 border-t mt-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Weight size={16} /> Carga Utilizada (kg)</label>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-lg text-gray-800">{load || '-'}</p>
                        {!isCompleted && (
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
            
            {/* Action Button - Always visible, changes based on completion status */}
            <div className="mt-4">
              {!isCompleted ? (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCompleteClick}>
                  <Check className="mr-2" size={18} /> Concluir Exercício
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full border-green-600 text-green-700 hover:bg-green-50" 
                  onClick={() => setIsReopenConfirmOpen(true)}
                >
                  <RotateCcw className="mr-2" size={18} /> Reabrir Exercício
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}

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

      {/* Reopen Confirmation Dialog */}
      <Dialog open={isReopenConfirmOpen} onOpenChange={setIsReopenConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reabrir Exercício</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reabrir este exercício? Isso irá marcá-lo como não concluído.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReopenConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                handleUncompleteClick();
                setIsReopenConfirmOpen(false);
              }}
            >
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};