// client/src/components/layout/WorkoutMiniPlayer.tsx
import React from 'react';
import { Link } from 'wouter';
import { Timer, Dumbbell, ArrowRight } from 'lucide-react';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { cn } from '@/lib/utils';

const WorkoutMiniPlayer: React.FC = () => {
  const { isWorkoutActive, elapsedTime, currentWorkoutId, currentDayId } = useWorkoutPlayer();

  // Don't render if workout is not active or missing required IDs
  if (!isWorkoutActive || !currentWorkoutId || !currentDayId) {
    return null;
  }

  // Format elapsed time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const workoutUrl = `/aluno/ficha/${currentWorkoutId}?diaId=${currentDayId}`;

  return (
    <Link
      href={workoutUrl}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-gradient-to-r from-indigo-600 to-purple-600",
        "text-white shadow-lg border-t border-indigo-500/20",
        "transition-all duration-300 hover:from-indigo-700 hover:to-purple-700",
        "md:left-64 lg:left-72" // Account for sidebar on desktop
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              Treino em andamento
            </p>
            <div className="flex items-center space-x-2 text-white/80">
              <Timer className="w-3 h-3" />
              <span className="text-xs font-mono">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          <ArrowRight className="w-5 h-5 text-white/80" />
        </div>
      </div>
    </Link>
  );
};

export default WorkoutMiniPlayer;