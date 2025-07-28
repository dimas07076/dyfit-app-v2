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
  startWorkout: (exercises: WorkoutExercise[], workoutId?: string, dayId?: string) => void;
  stopWorkout: () => void;
  resetWorkout: () => void;
  resumeWorkout: () => void; // <-- 1. MUDANÇA: Expõe a nova função de resumir
  completeExercise: (exerciseId: string) => void;
  uncompleteExercise: (exerciseId: string) => void;
  activeExerciseId: string | null;
  completedExercises: Set<string>;
  elapsedTime: number;
  updateExerciseLoad: (exerciseId: string, load: string) => void;
  getExerciseLoad: (exerciseId: string) => string;
  restTimeRemaining: number | null;
  isResting: boolean;
  workoutStartTime: Date | null;
  currentWorkoutId: string | null;
  currentDayId: string | null;
}

const WorkoutPlayerContext = createContext<WorkoutPlayerContextType | undefined>(undefined);

export const WorkoutPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [exerciseLoads, setExerciseLoads] = useState<Record<string, string>>({});
  
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null);
  const [isResting, setIsResting] = useState<boolean>(false);

  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [currentDayId, setCurrentDayId] = useState<string | null>(null);

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
    }
    // A limpeza do elapsedTime foi movida para o reset para não zerar ao pausar
    return clearTimers;
  }, [isWorkoutActive]);

  const findNextActiveExercise = useCallback((currentList: WorkoutExercise[], completedSet: Set<string>) => {
    return currentList.find(e => !completedSet.has(e._id))?._id || null;
  }, []);

  const startRestTimer = (duration: number) => {
    clearTimers(); 
    setIsResting(true);
    setRestTimeRemaining(duration);
    restTimerRef.current = setInterval(() => {
      setRestTimeRemaining(prev => {
        if (prev !== null && prev > 1) { return prev - 1; }
        clearInterval(restTimerRef.current!);
        setIsResting(false);
        if (isWorkoutActive) { mainTimerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000); }
        return null;
      });
    }, 1000);
  };

  const startWorkout = useCallback((initialExercises: WorkoutExercise[], workoutId?: string, dayId?: string) => {
    resetWorkout(); // Garante que qualquer estado anterior seja limpo antes de começar
    setExercises(initialExercises);
    setIsWorkoutActive(true);
    setWorkoutStartTime(new Date()); 
    setCompletedExercises(new Set());
    setExerciseLoads({});
    setActiveExerciseId(findNextActiveExercise(initialExercises, new Set()));
    setCurrentWorkoutId(workoutId || null);
    setCurrentDayId(dayId || null);
  }, [findNextActiveExercise]);

  const stopWorkout = useCallback(() => {
    setIsWorkoutActive(false); // Apenas pausa o timer
  }, []);
  
  // <-- 2. MUDANÇA: Nova função para resumir o treino -->
  const resumeWorkout = useCallback(() => {
    // Apenas reativa o timer se houver um treino em andamento
    if (exercises.length > 0) {
        setIsWorkoutActive(true);
    }
  }, [exercises]);

  const resetWorkout = useCallback(() => {
    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setExercises([]);
    setCompletedExercises(new Set());
    setExerciseLoads({});
    setActiveExerciseId(null);
    setElapsedTime(0);
    setIsResting(false);
    setRestTimeRemaining(null);
    setCurrentWorkoutId(null);
    setCurrentDayId(null);
    clearTimers();
  }, []);
  
  const completeExercise = useCallback((exerciseId: string) => {
    setCompletedExercises(prevCompleted => {
      const newCompleted = new Set(prevCompleted);
      newCompleted.add(exerciseId);
      const nextActiveId = findNextActiveExercise(exercises, newCompleted);
      setActiveExerciseId(nextActiveId);
      const currentExercise = exercises.find(e => e._id === exerciseId);
      const restSeconds = currentExercise?.descanso ? parseInt(currentExercise.descanso, 10) : 0;
      if (restSeconds > 0 && nextActiveId) { startRestTimer(restSeconds); }
      return newCompleted;
    });
  }, [exercises, findNextActiveExercise]);

  const uncompleteExercise = useCallback((exerciseId: string) => {
    setCompletedExercises(prevCompleted => {
        const newCompleted = new Set(prevCompleted);
        newCompleted.delete(exerciseId);
        const nextActiveId = findNextActiveExercise(exercises, newCompleted);
        setActiveExerciseId(nextActiveId);
        return newCompleted;
    });
  }, [exercises, findNextActiveExercise]);

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
    resetWorkout,
    resumeWorkout, // <-- 3. MUDANÇA: Adiciona a função ao valor do contexto
    completeExercise,
    uncompleteExercise,
    activeExerciseId,
    completedExercises,
    elapsedTime,
    updateExerciseLoad,
    getExerciseLoad,
    restTimeRemaining,
    isResting,
    workoutStartTime,
    currentWorkoutId,
    currentDayId,
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