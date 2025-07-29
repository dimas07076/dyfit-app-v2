// client/src/components/alunos/CombinedExerciseCard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, PlayCircle, Clock, Weight, ChevronDown, RotateCcw, Info, Link } from 'lucide-react';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Interface for exercises compatible with the existing type
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
  observacoes?: string;
  grupoCombinado?: string;
}

interface CombinedExerciseCardProps {
  exercises: ExercicioRenderizavel[];
  isActive: boolean;
  allCompleted: boolean;
  onOpenVideo: (url: string) => void;
  groupId: string;
}

export const CombinedExerciseCard: React.FC<CombinedExerciseCardProps> = ({
  exercises,
  isActive,
  allCompleted,
  onOpenVideo,
  groupId,
}) => {
  const { completeExercise, uncompleteExercise, updateExerciseLoad, getExerciseLoad, completedExercises } = useWorkoutPlayer();
  
  const [loads, setLoads] = useState<Record<string, string>>(() => {
    const initialLoads: Record<string, string> = {};
    exercises.forEach(ex => {
      initialLoads[ex._id] = getExerciseLoad(ex._id) || ex.carga || '';
    });
    return initialLoads;
  });
  
  const [isExpanded, setIsExpanded] = useState(isActive);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [currentLoadInput, setCurrentLoadInput] = useState('');
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);

  useEffect(() => {
    setIsExpanded(isActive);
  }, [isActive]);
  
  const handleUpdateLoad = (exerciseId: string, newLoadValue: string) => {
    setLoads(prev => ({ ...prev, [exerciseId]: newLoadValue }));
    updateExerciseLoad(exerciseId, newLoadValue);
  };
  
  const handleCompleteAllExercises = () => {
    exercises.forEach(exercise => {
      completeExercise(exercise._id);
    });
  };

  const handleUncompleteAllExercises = () => {
    exercises.forEach(exercise => {
      uncompleteExercise(exercise._id);
    });
  };

  const openEditModal = (exerciseId: string) => {
    setCurrentLoadInput(loads[exerciseId] || '');
    setEditingExerciseId(exerciseId);
  };

  const closeEditModal = () => {
    setEditingExerciseId(null);
  };

  const handleSaveLoad = () => {
    if (editingExerciseId) {
      handleUpdateLoad(editingExerciseId, currentLoadInput);
      closeEditModal();
    }
  };

  const editingExercise = editingExerciseId ? exercises.find(ex => ex._id === editingExerciseId) : null;
  
  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-in-out overflow-hidden shadow-md border",
        allCompleted ? 'bg-green-50 border-green-300 shadow-green-100' : 'bg-white border-slate-200',
        isActive ? 'border-indigo-500 shadow-indigo-200 shadow-lg' : '',
        'border-l-4 border-l-blue-500 bg-blue-50/30'
      )}
    >
      {/* Combined exercise header banner */}
      <div className="bg-blue-100 border-b border-blue-200 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Link size={16} />
          <span className="font-medium">
            Exercícios Conjugados ({exercises.length} exercícios)
          </span>
          <span className="text-xs bg-blue-200 px-2 py-1 rounded-full">
            Executar em sequência
          </span>
        </div>
      </div>
      
      <CardHeader 
        className="flex flex-row items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <p className="font-semibold text-gray-800">
            Grupo de Exercícios - {groupId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChevronDown className={cn("transition-transform", isExpanded && "rotate-180")} />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 pt-0">
          <div className="border-t pt-4 space-y-6">
            {/* Render each exercise in the group */}
            {exercises.map((exercise, index) => {
              const exerciseName = exercise.exercicioDetalhes?.nome || 'Exercício Removido';
              const isCompleted = completedExercises.has(exercise._id);
              
              return (
                <div key={exercise._id} className={cn(
                  "p-4 rounded-lg border",
                  isCompleted ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200",
                  index < exercises.length - 1 && "mb-4"
                )}>
                  {/* Exercise header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {index + 1}
                      </span>
                      <p className="font-semibold text-gray-800" title={exerciseName}>
                        {exerciseName}
                      </p>
                    </div>
                    {exercise.exercicioDetalhes?.urlVideo && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:bg-red-100" 
                        onClick={() => onOpenVideo(exercise.exercicioDetalhes!.urlVideo!)}
                      >
                        <PlayCircle size={20} />
                      </Button>
                    )}
                  </div>

                  {/* Exercise details */}
                  <div className="flex justify-around text-center mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Séries</p>
                      <p className="font-bold text-lg">{exercise.series || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Repetições</p>
                      <p className="font-bold text-lg">{exercise.repeticoes || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Descanso</p>
                      <div className='flex items-center justify-center gap-1'>
                        <Clock size={16} className="text-gray-500" />
                        <p className="font-bold text-lg">{exercise.descanso && exercise.descanso.trim() !== '' ? exercise.descanso : '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Exercise observations */}
                  {exercise.observacoes && (
                    <div className="space-y-2 pt-4 border-t mt-4">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Info size={16} /> Observações do Personal
                      </label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md border">
                        {exercise.observacoes}
                      </p>
                    </div>
                  )}
                  
                  {/* Exercise load */}
                  <div className="space-y-2 pt-4 border-t mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Weight size={16} /> Carga Utilizada (kg)
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg text-gray-800">{loads[exercise._id] || '-'}</p>
                        {!allCompleted && (
                          <Button 
                            variant="link" 
                            className="text-blue-600 hover:text-blue-800 p-0 h-auto underline" 
                            onClick={() => openEditModal(exercise._id)}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Combined action button */}
            <div className="mt-6 pt-4 border-t">
              {!allCompleted ? (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={handleCompleteAllExercises}
                >
                  <Check className="mr-2" size={18} /> Concluir Exercícios
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full border-green-600 text-green-700 hover:bg-green-50" 
                  onClick={() => setIsReopenConfirmOpen(true)}
                >
                  <RotateCcw className="mr-2" size={18} /> Reabrir Exercícios
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}

      {/* Load edit modal */}
      <Dialog open={!!editingExerciseId} onOpenChange={() => setEditingExerciseId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atualizar Carga Utilizada</DialogTitle>
            <DialogDescription>
              Insira a carga utilizada para: {editingExercise?.exercicioDetalhes?.nome}
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

      {/* Reopen confirmation dialog */}
      <Dialog open={isReopenConfirmOpen} onOpenChange={setIsReopenConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reabrir Exercícios</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reabrir todos os exercícios deste grupo? Isso irá marcá-los como não concluídos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReopenConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                handleUncompleteAllExercises();
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