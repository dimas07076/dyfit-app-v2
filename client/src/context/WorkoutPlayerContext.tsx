// client/src/context/WorkoutPlayerContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';

// Tipos de dados que o contexto irá gerenciar
interface WorkoutExercise {
  _id: string; 
  exercicioDetalhes: { nome: string; } | null;
  descanso?: string;
}

interface WorkoutPlayerContextType {
  isWorkoutActive: boolean;
  startWorkout: (exercises: WorkoutExercise[]) => void;
  stopWorkout: () => void;
  completeExercise: (exerciseId: string) => void;
  // <<< INÍCIO DA ALTERAÇÃO >>>
  uncompleteExercise: (exerciseId: string) => void;
  // <<< FIM DA ALTERAÇÃO >>>
  activeExerciseId: string | null;
  completedExercises: Set<string>;
  elapsedTime: number;
  updateExerciseLoad: (exerciseId: string, load: string) => void;
  getExerciseLoad: (exerciseId: string) => string;
  // <<< INÍCIO DA ALTERAÇÃO >>>
  restTimeRemaining: number | null;
  isResting: boolean;
  // <<< FIM DA ALTERAÇÃO >>>
}

const WorkoutPlayerContext = createContext<WorkoutPlayerContextType | undefined>(undefined);

export const WorkoutPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseLoads, setExerciseLoads] = useState<Record<string, string>>({});
  
  // <<< INÍCIO DA ALTERAÇÃO: Estados para o timer de descanso >>>
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null);
  const [isResting, setIsResting] = useState<boolean>(false);
  // <<< FIM DA ALTERAÇÃO >>>

  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
  };
  
  useEffect(() => {
    if (isWorkoutActive) {
      mainTimerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      clearTimers();
      setElapsedTime(0);
    }
    return clearTimers;
  }, [isWorkoutActive]);

  const findNextActiveExercise = useCallback((currentList: WorkoutExercise[], completedSet: Set<string>) => {
    return currentList.find(e => !completedSet.has(e._id))?._id || null;
  }, []);

  const startRestTimer = (duration: number) => {
    clearTimers(); // Para o timer principal durante o descanso
    setIsResting(true);
    setRestTimeRemaining(duration);
    restTimerRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev !== null && prev > 1) {
          return prev - 1;
        }
        // Quando o descanso termina
        clearInterval(restTimerRef.current!);
        setIsResting(false);
        // Reinicia o timer principal
        if (isWorkoutActive) {
            mainTimerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        }
        return null;
      });
    }, 1000);
  };

  const startWorkout = useCallback((initialExercises: WorkoutExercise[]) => {
    setExercises(initialExercises);
    setIsWorkoutActive(true);
    setCompletedExercises(new Set());
    setExerciseLoads({});
    setActiveExerciseId(findNextActiveExercise(initialExercises, new Set()));
  }, [findNextActiveExercise]);

  const stopWorkout = useCallback(() => {
    setIsWorkoutActive(false);
  }, []);
  
  const completeExercise = useCallback((exerciseId: string) => {
    setCompletedExercises(prevCompleted => {
      const newCompleted = new Set(prevCompleted);
      newCompleted.add(exerciseId);
      const nextActiveId = findNextActiveExercise(exercises, newCompleted);
      setActiveExerciseId(nextActiveId);
      
      const currentExercise = exercises.find(e => e._id === exerciseId);
      const restSeconds = currentExercise?.descanso ? parseInt(currentExercise.descanso, 10) : 0;
      
      if (restSeconds > 0 && nextActiveId) {
        startRestTimer(restSeconds);
      }
      
      return newCompleted;
    });
  }, [exercises, findNextActiveExercise]);

  // <<< INÍCIO DA ALTERAÇÃO: Nova função para desfazer >>>
  const uncompleteExercise = useCallback((exerciseId: string) => {
    setCompletedExercises(prevCompleted => {
        const newCompleted = new Set(prevCompleted);
        newCompleted.delete(exerciseId);
        const nextActiveId = findNextActiveExercise(exercises, newCompleted);
        setActiveExerciseId(nextActiveId);
        return newCompleted;
    });
  }, [exercises, findNextActiveExercise]);
  // <<< FIM DA ALTERAÇÃO >>>

  const updateExerciseLoad = (exerciseId: string, load: string) => {
    setExerciseLoads(prev => ({ ...prev, [exerciseId]: load }));
  };

  const getExerciseLoad = (exerciseId: string) => {
    return exerciseLoads[exerciseId] || '';
  };

  const value = {
    isWorkoutActive,
    startWorkout,
    stopWorkout,
    completeExercise,
    uncompleteExercise,
    activeExerciseId,
    completedExercises,
    elapsedTime,
    updateExerciseLoad,
    getExerciseLoad,
    restTimeRemaining,
    isResting,
  };

  return (
    <WorkoutPlayerContext.Provider value={value}>
      {children}
    </WorkoutPlayerContext.Provider>
  );
};

export const useWorkoutPlayer = (): WorkoutPlayerContextType => {
  const context = useContext(WorkoutPlayerContext);
  if (context === undefined) {
    throw new Error('useWorkoutPlayer deve ser usado dentro de um WorkoutPlayerProvider');
  }
  return context;
};