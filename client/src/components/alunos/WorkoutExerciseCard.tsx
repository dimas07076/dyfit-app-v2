// client/src/components/alunos/WorkoutExerciseCard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, PlayCircle, Clock, Weight, ChevronDown, RotateCw } from 'lucide-react';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { cn } from '@/lib/utils';

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

// <<< INÍCIO DA CORREÇÃO >>>
// A definição do componente foi corrigida para desestruturar as props corretamente.
export const WorkoutExerciseCard: React.FC<WorkoutExerciseCardProps> = ({
  exercise,
  isActive,
  isCompleted,
  onOpenVideo,
}) => {
// <<< FIM DA CORREÇÃO >>>
  const { completeExercise, uncompleteExercise, updateExerciseLoad, getExerciseLoad } = useWorkoutPlayer();
  
  const [load, setLoad] = useState(() => getExerciseLoad(exercise._id) || exercise.carga || '');
  
  const [isExpanded, setIsExpanded] = useState(isActive);

  useEffect(() => {
    setIsExpanded(isActive);
  }, [isActive]);
  
  const handleLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLoad = e.target.value;
    setLoad(newLoad);
    updateExerciseLoad(exercise._id, newLoad);
  };
  
  const handleCompleteClick = () => {
    completeExercise(exercise._id);
  };

  const handleUncompleteClick = () => {
    uncompleteExercise(exercise._id);
  }

  const exerciseName = exercise.exercicioDetalhes?.nome || 'Exercício Removido';
  
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
          <p className="font-semibold text-gray-800 truncate" title={exerciseName}>
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
                  <p className="font-bold text-lg">{exercise.descanso || '0s'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor={`load-${exercise._id}`} className="text-sm font-medium text-gray-700 flex items-center gap-2"><Weight size={16} /> Carga Utilizada (kg)</label>
              <Input id={`load-${exercise._id}`} type="number" placeholder="Ex: 20" value={load} onChange={handleLoadChange} className="bg-white" disabled={isCompleted} />
            </div>
            {!isCompleted && (
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleCompleteClick}>
                <Check className="mr-2" size={18} /> Concluir Exercício
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};