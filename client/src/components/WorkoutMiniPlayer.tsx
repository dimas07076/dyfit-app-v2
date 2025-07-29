// client/src/components/WorkoutMiniPlayer.tsx
import React from 'react';
import { useLocation } from 'wouter';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { Timer } from 'lucide-react';

const WorkoutMiniPlayer: React.FC = () => {
  const [location, navigate] = useLocation();
  const { 
    isWorkoutActive, 
    currentWorkoutSession, 
    elapsedTime, 
    completedExercises
  } = useWorkoutPlayer();

  // Hide mini-player if not active or if on workout execution page
  const shouldHide = !isWorkoutActive || 
    !currentWorkoutSession || 
    (currentWorkoutSession.rotinaId && 
     currentWorkoutSession.diaDeTreinoId && 
     location.includes(`/aluno/ficha/${currentWorkoutSession.rotinaId}`) &&
     location.includes(`diaId=${currentWorkoutSession.diaDeTreinoId}`));

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle click to continue workout
  const handleContinueWorkout = () => {
    if (!currentWorkoutSession?.rotinaId || !currentWorkoutSession?.diaDeTreinoId) {
      console.error('Missing routing data for workout session');
      return;
    }

    // Navigate to correct route: /aluno/ficha/{rotinaId}?dia={diaDeTreinoId}
    navigate(`/aluno/ficha/${currentWorkoutSession.rotinaId}?diaId=${currentWorkoutSession.diaDeTreinoId}`);
  };

  if (shouldHide) {
    return null;
  }

  // Calculate progress
  const totalExercises = currentWorkoutSession?.exercises.length || 0;
  const completedCount = completedExercises.size;
  const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return (
    <button
      className="flex flex-col items-center justify-center flex-1 py-1 px-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors border-l border-r border-gray-200"
      onClick={handleContinueWorkout}
    >
      <div className="flex items-center space-x-0.5">
        <Timer className="w-2.5 h-2.5" />
        <span className="font-mono font-bold text-[10px] leading-none">
          {formatTime(elapsedTime)}
        </span>
      </div>
      <div className="flex items-center space-x-0.5 mt-0.5">
        <div className="bg-indigo-200 rounded-full h-0.5 w-6 overflow-hidden">
          <div 
            className="bg-indigo-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-[9px] font-medium">
          {completedCount}/{totalExercises}
        </span>
      </div>
    </button>
  );
};

export default WorkoutMiniPlayer;