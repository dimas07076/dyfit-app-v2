// client/src/components/WorkoutMiniPlayerHeader.tsx
import React from 'react';
import { useLocation } from 'wouter';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkoutMiniPlayerHeaderProps {
  isScrolled: boolean;
  isAluno: boolean;
}

const WorkoutMiniPlayerHeader: React.FC<WorkoutMiniPlayerHeaderProps> = ({ 
  isScrolled, 
  isAluno 
}) => {
  const [location, navigate] = useLocation();
  const { 
    isWorkoutActive, 
    currentWorkoutSession, 
    elapsedTime, 
    completedExercises
  } = useWorkoutPlayer();

  // Only show for aluno users
  if (!isAluno) {
    return null;
  }

  // Hide mini-player if not active or if on workout execution page
  const shouldHide = !isWorkoutActive || 
    !currentWorkoutSession || 
    (currentWorkoutSession.rotinaId && 
     currentWorkoutSession.diaDeTreinoId && 
     location.includes(`/aluno/ficha/${currentWorkoutSession.rotinaId}`) &&
     location.includes(`diaId=${currentWorkoutSession.diaDeTreinoId}`));

  // Only show when header is scrolled (visible)
  if (shouldHide || !isScrolled) {
    return null;
  }

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

  // Calculate progress
  const totalExercises = currentWorkoutSession?.exercises.length || 0;
  const completedCount = completedExercises.size;
  const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return (
    <button
      className={cn(
        "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm transition-all duration-200 hover:scale-105",
        "bg-indigo-500/20 backdrop-blur-sm border border-white/30 text-white hover:bg-indigo-500/30"
      )}
      onClick={handleContinueWorkout}
      title="Continuar Treino"
    >
      <div className="flex items-center space-x-1">
        <Timer className="w-4 h-4" />
        <span className="font-mono font-bold text-sm">
          {formatTime(elapsedTime)}
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <div className="bg-white/30 rounded-full h-1 w-8 overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-xs font-medium opacity-90">
          {completedCount}/{totalExercises}
        </span>
      </div>
    </button>
  );
};

export default WorkoutMiniPlayerHeader;