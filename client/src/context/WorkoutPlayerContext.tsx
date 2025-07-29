// client/src/context/WorkoutPlayerContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';

// --- Tipos de Dados ---
interface WorkoutExercise {
  _id: string; 
  exercicioDetalhes: { nome: string; } | null;
  descanso?: string;
}

interface WorkoutSession {
  startTime: number;
  exercises: WorkoutExercise[];
  completedExercises: string[];
  exerciseLoads: Record<string, string>;
  diaDeTreinoId?: string;
  rotinaId?: string;
}

interface WorkoutPlayerContextType {
  isWorkoutActive: boolean;
  startWorkout: (exercises: WorkoutExercise[], diaDeTreinoId: string, rotinaId: string) => void;
  stopWorkout: () => void;
  resetWorkout: () => void;
  completeExercise: (exerciseId: string) => void;
  uncompleteExercise: (exerciseId: string) => void;
  completeMultipleExercises: (exerciseIds: string[]) => void;
  uncompleteMultipleExercises: (exerciseIds: string[]) => void;
  activeExerciseId: string | null;
  completedExercises: Set<string>;
  elapsedTime: number;
  updateExerciseLoad: (exerciseId: string, load: string) => void;
  getExerciseLoad: (exerciseId: string) => string;
  restTimeRemaining: number | null;
  isResting: boolean;
  workoutStartTime: Date | null;
  currentWorkoutSession: WorkoutSession | null;
}

const WorkoutPlayerContext = createContext<WorkoutPlayerContextType | undefined>(undefined);

const WORKOUT_SESSION_KEY = 'dyfit-active-workout-session';

export const WorkoutPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState<number | null>(null);
  const [isResting, setIsResting] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('[WorkoutPlayerContext] CONTEXT_INIT: Contexto está sendo montado.');
    try {
      const savedSessionRaw = localStorage.getItem(WORKOUT_SESSION_KEY);
      if (savedSessionRaw) {
        console.log('[WorkoutPlayerContext] CONTEXT_INIT: Sessão encontrada no localStorage:', savedSessionRaw);
        const savedSession: WorkoutSession = JSON.parse(savedSessionRaw);
        setSession(savedSession);
        setIsWorkoutActive(true);
        // Recalcular elapsedTime na hidratação para refletir o tempo real
        const now = Date.now();
        const start = savedSession.startTime;
        setElapsedTime(Math.floor((now - start) / 1000));
        console.log('[WorkoutPlayerContext] CONTEXT_INIT: Estado do contexto HIDRATADO com sucesso. Tempo decorrido inicial:', Math.floor((now - start) / 1000), 'segundos.');
      } else {
        console.log('[WorkoutPlayerContext] CONTEXT_INIT: Nenhuma sessão ativa encontrada no localStorage.');
      }
    } catch (error) {
      console.error("[WorkoutPlayerContext] CONTEXT_INIT: Erro ao carregar sessão do localStorage:", error);
      localStorage.removeItem(WORKOUT_SESSION_KEY);
    }

    return () => {
      console.log('[WorkoutPlayerContext] CONTEXT_CLEANUP: Limpando timer ao desmontar o contexto.');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    console.log(`[WorkoutPlayerContext] TIMER_EFFECT: isWorkoutActive mudou para ${isWorkoutActive}, session mudou para ${session ? 'Existente' : 'Nulo'}, isResting mudou para ${isResting}.`);
    if (timerRef.current) {
      console.log('[WorkoutPlayerContext] TIMER_EFFECT: Limpando timer existente.');
      clearInterval(timerRef.current);
    }

    if (isWorkoutActive && session) {
      console.log(`[WorkoutPlayerContext] TIMER_EFFECT: Timer ativado. Início da sessão: ${new Date(session.startTime).toLocaleTimeString()}`);
      timerRef.current = setInterval(() => {
        if (isResting) {
          setRestTimeRemaining(prev => {
            if (prev !== null && prev > 1) {
              console.log(`[WorkoutPlayerContext] TIMER_TICK: Descanso restante: ${prev - 1}s`);
              return prev - 1;
            } else {
              console.log('[WorkoutPlayerContext] TIMER_TICK: Descanso terminou. Retornando ao treino.');
              setIsResting(false);
              return null;
            }
          });
        } else {
          const now = Date.now();
          const start = session.startTime;
          const newElapsedTime = Math.floor((now - start) / 1000);
          console.log(`[WorkoutPlayerContext] TIMER_TICK: Tempo decorrido: ${newElapsedTime}s`);
          setElapsedTime(newElapsedTime);
        }
      }, 1000);
    } else {
        console.log(`[WorkoutPlayerContext] TIMER_EFFECT: Timer parado. isWorkoutActive: ${isWorkoutActive}, session: ${session ? 'Existe' : 'Nulo'}`);
    }
    return () => { 
      console.log('[WorkoutPlayerContext] TIMER_EFFECT_CLEANUP: Limpando timer ao sair do efeito.');
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [isWorkoutActive, session, isResting]);

  const findNextActiveExercise = useCallback((currentList: WorkoutExercise[], completedSet: Set<string>) => {
    const next = currentList.find(e => !completedSet.has(e._id))?._id || null;
    console.log('[WorkoutPlayerContext] findNextActiveExercise: Próximo exercício ativo:', next);
    return next;
  }, []);
  
  const updateSession = (newSessionData: Partial<WorkoutSession> | null) => {
    if (newSessionData === null) {
      console.log('[WorkoutPlayerContext] UPDATE_SESSION: Removendo sessão do estado e localStorage.');
      setSession(null);
      localStorage.removeItem(WORKOUT_SESSION_KEY);
      return;
    }
    setSession(prevSession => {
      const updated = { ...prevSession, ...newSessionData } as WorkoutSession;
      console.log('[WorkoutPlayerContext] UPDATE_SESSION: Atualizando sessão no localStorage:', updated);
      localStorage.setItem(WORKOUT_SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const startWorkout = useCallback((initialExercises: WorkoutExercise[], diaDeTreinoId: string, rotinaId: string) => {
    console.log(`[WorkoutPlayerContext] START_WORKOUT: Função chamada para o diaDeTreinoId: ${diaDeTreinoId}, rotinaId: ${rotinaId}`);
    
    const createNewWorkoutSession = () => {
      console.log('[WorkoutPlayerContext] START_WORKOUT: Executando createNewWorkoutSession...');
      const startTime = Date.now();
      const newSession: WorkoutSession = {
        startTime,
        exercises: initialExercises,
        completedExercises: [],
        exerciseLoads: {},
        diaDeTreinoId,
        rotinaId,
      };
      setSession(newSession);
      setIsWorkoutActive(true);
      setElapsedTime(0); // Resetar tempo ao iniciar nova sessão
      localStorage.setItem(WORKOUT_SESSION_KEY, JSON.stringify(newSession));
      console.log('[WorkoutPlayerContext] START_WORKOUT: Nova sessão criada e salva no localStorage:', newSession);
    };

    const savedSessionRaw = localStorage.getItem(WORKOUT_SESSION_KEY);

    if (savedSessionRaw) {
      console.log('[WorkoutPlayerContext] START_WORKOUT: Verificando sessão existente no localStorage...');
      try {
        const savedSession: WorkoutSession = JSON.parse(savedSessionRaw);
        if (savedSession.diaDeTreinoId !== diaDeTreinoId) {
          console.warn(`[WorkoutPlayerContext] START_WORKOUT: Sessão ativa para um treino diferente encontrada (${savedSession.diaDeTreinoId}). Resetando e iniciando a nova (${diaDeTreinoId}).`);
          createNewWorkoutSession();
        } else {
          console.log('[WorkoutPlayerContext] START_WORKOUT: Treino já está ativo para este dia. Hidratando sessão existente.');
          setSession(savedSession); // Garantir que o estado da sessão seja o salvo
          setIsWorkoutActive(true);
          // Recalcular elapsedTime para a sessão existente
          const now = Date.now();
          const start = savedSession.startTime;
          setElapsedTime(Math.floor((now - start) / 1000));
          console.log('[WorkoutPlayerContext] START_WORKOUT: Sessão existente reativada. Tempo decorrido:', Math.floor((now - start) / 1000), 'segundos.');
        }
      } catch (e) {
        console.error('[WorkoutPlayerContext] START_WORKOUT: Erro ao parsear sessão existente do localStorage, criando uma nova.', e);
        localStorage.removeItem(WORKOUT_SESSION_KEY); // Limpar dados corrompidos
        createNewWorkoutSession();
      }
    } else {
      console.log('[WorkoutPlayerContext] START_WORKOUT: Nenhuma sessão salva encontrada, criando uma nova.');
      createNewWorkoutSession();
    }
  }, []); // Removido isWorkoutActive das dependências para evitar loop e garantir que a lógica de start seja sempre a mesma

  const stopWorkout = useCallback(() => {
    console.log('[WorkoutPlayerContext] STOP_WORKOUT: Pausando o treino (isWorkoutActive = false).');
    setIsWorkoutActive(false);
  }, []);
  
  const resetWorkout = useCallback(() => {
    console.log('[WorkoutPlayerContext] RESET_WORKOUT: Resetando completamente o estado do treino e limpando localStorage.');
    setIsWorkoutActive(false);
    setSession(null);
    setElapsedTime(0);
    setIsResting(false);
    setRestTimeRemaining(null);
    localStorage.removeItem(WORKOUT_SESSION_KEY);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  const completeExercise = useCallback((exerciseId: string) => {
    console.log(`[WorkoutPlayerContext] COMPLETE_EXERCISE: Exercício ${exerciseId} marcado como concluído.`);
    if (!session) {
      console.warn('[WorkoutPlayerContext] COMPLETE_EXERCISE: Nenhuma sessão ativa para completar exercício.');
      return;
    }
    
    const newCompletedArray = [...session.completedExercises, exerciseId];
    const newCompletedSet = new Set(newCompletedArray);

    updateSession({ completedExercises: newCompletedArray });

    const currentExercise = session.exercises.find(e => e._id === exerciseId);
    const restSeconds = currentExercise?.descanso ? parseInt(currentExercise.descanso, 10) : 0;
    console.log(`[WorkoutPlayerContext] COMPLETE_EXERCISE: Descanso para o exercício ${exerciseId}: ${restSeconds}s`);
    
    const nextActiveId = findNextActiveExercise(session.exercises, newCompletedSet);
    if (!nextActiveId || restSeconds <= 0) {
      console.log('[WorkoutPlayerContext] COMPLETE_EXERCISE: Sem próximo exercício ou sem descanso. Não iniciando descanso.');
      setIsResting(false);
    } else {
      console.log('[WorkoutPlayerContext] COMPLETE_EXERCISE: Iniciando descanso.');
      setIsResting(true);
      setRestTimeRemaining(restSeconds);
    }
  }, [session, findNextActiveExercise, updateSession]);

  const uncompleteExercise = useCallback((exerciseId: string) => {
    console.log(`[WorkoutPlayerContext] UNCOMPLETE_EXERCISE: Exercício ${exerciseId} marcado como não concluído.`);
    if (!session) {
      console.warn('[WorkoutPlayerContext] UNCOMPLETE_EXERCISE: Nenhuma sessão ativa para desmarcar exercício.');
      return;
    }
    const newCompletedArray = session.completedExercises.filter(id => id !== exerciseId);
    updateSession({ completedExercises: newCompletedArray });
  }, [session, updateSession]);

  const completeMultipleExercises = useCallback((exerciseIds: string[]) => {
    console.log(`[WorkoutPlayerContext] COMPLETE_MULTIPLE_EXERCISES: Marcando ${exerciseIds.length} exercícios como concluídos:`, exerciseIds);
    if (!session) {
      console.warn('[WorkoutPlayerContext] COMPLETE_MULTIPLE_EXERCISES: Nenhuma sessão ativa para completar exercícios.');
      return;
    }

    // Create a new array with all existing completed exercises plus the new ones (avoiding duplicates)
    const existingCompleted = new Set(session.completedExercises);
    exerciseIds.forEach(id => existingCompleted.add(id));
    const newCompletedArray = Array.from(existingCompleted);
    const newCompletedSet = new Set(newCompletedArray);

    updateSession({ completedExercises: newCompletedArray });

    // Handle rest time for the first exercise in the group (if applicable)
    const firstExercise = session.exercises.find(e => exerciseIds.includes(e._id));
    const restSeconds = firstExercise?.descanso ? parseInt(firstExercise.descanso, 10) : 0;
    console.log(`[WorkoutPlayerContext] COMPLETE_MULTIPLE_EXERCISES: Descanso para o grupo: ${restSeconds}s`);
    
    const nextActiveId = findNextActiveExercise(session.exercises, newCompletedSet);
    if (!nextActiveId || restSeconds <= 0) {
      console.log('[WorkoutPlayerContext] COMPLETE_MULTIPLE_EXERCISES: Sem próximo exercício ou sem descanso. Não iniciando descanso.');
      setIsResting(false);
    } else {
      console.log('[WorkoutPlayerContext] COMPLETE_MULTIPLE_EXERCISES: Iniciando descanso.');
      setIsResting(true);
      setRestTimeRemaining(restSeconds);
    }
  }, [session, findNextActiveExercise, updateSession]);

  const uncompleteMultipleExercises = useCallback((exerciseIds: string[]) => {
    console.log(`[WorkoutPlayerContext] UNCOMPLETE_MULTIPLE_EXERCISES: Desmarcando ${exerciseIds.length} exercícios:`, exerciseIds);
    if (!session) {
      console.warn('[WorkoutPlayerContext] UNCOMPLETE_MULTIPLE_EXERCISES: Nenhuma sessão ativa para desmarcar exercícios.');
      return;
    }
    
    // Remove all the specified exercise IDs from completed exercises
    const newCompletedArray = session.completedExercises.filter(id => !exerciseIds.includes(id));
    updateSession({ completedExercises: newCompletedArray });
  }, [session, updateSession]);

  const updateExerciseLoad = (exerciseId: string, load: string) => {
    console.log(`[WorkoutPlayerContext] UPDATE_EXERCISE_LOAD: Atualizando carga para ${exerciseId} para ${load}.`);
    if (!session) {
      console.warn('[WorkoutPlayerContext] UPDATE_EXERCISE_LOAD: Nenhuma sessão ativa para atualizar carga.');
      return;
    }
    const newLoads = { ...session.exerciseLoads, [exerciseId]: load };
    updateSession({ exerciseLoads: newLoads });
  };

  const getExerciseLoad = (exerciseId: string) => {
    const load = session?.exerciseLoads[exerciseId] || '';
    console.log(`[WorkoutPlayerContext] GET_EXERCISE_LOAD: Obtendo carga para ${exerciseId}: ${load}.`);
    return load;
  };
  
  const value = {
    isWorkoutActive,
    startWorkout,
    stopWorkout,
    resetWorkout,
    completeExercise,
    uncompleteExercise,
    completeMultipleExercises,
    uncompleteMultipleExercises,
    activeExerciseId: session ? findNextActiveExercise(session.exercises, new Set(session.completedExercises)) : null,
    completedExercises: new Set(session?.completedExercises || []),
    elapsedTime,
    updateExerciseLoad,
    getExerciseLoad,
    restTimeRemaining,
    isResting,
    workoutStartTime: session ? new Date(session.startTime) : null,
    currentWorkoutSession: session,
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
