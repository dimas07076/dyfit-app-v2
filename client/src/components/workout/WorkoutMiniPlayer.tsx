// client/src/components/workout/WorkoutMiniPlayer.tsx
import React from 'react';
import { useLocation } from 'wouter';
import { Clock, PlayCircle } from 'lucide-react';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const WorkoutMiniPlayer: React.FC = () => {
  const { isWorkoutActive, elapsedTime } = useWorkoutPlayer();
  const [, navigate] = useLocation();

  // Don't render if no workout is active
  if (!isWorkoutActive) {
    return null;
  }

  // Format elapsed time to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle click to navigate to workout execution page
  const handleClick = () => {
    // Get the active workout session from localStorage to find the fichaId
    try {
      const savedSession = localStorage.getItem('dyfit-active-workout-session');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.diaDeTreinoId) {
          navigate(`/aluno/ficha/${session.diaDeTreinoId}`);
        }
      }
    } catch (error) {
      console.error('Error retrieving workout session for navigation:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleClick}
        className={cn(
          "group relative overflow-hidden",
          "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700",
          "text-white border-0 shadow-lg hover:shadow-xl",
          "px-4 py-3 h-auto min-w-[120px]",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "backdrop-blur-sm bg-opacity-90"
        )}
      >
        {/* Background pulse animation */}
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
        
        {/* Content */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="relative">
            <Clock className="w-4 h-4" />
            {/* Pulse indicator */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium opacity-90">Treino ativo</span>
            <span className="text-sm font-bold leading-none">{formatTime(elapsedTime)}</span>
          </div>
          <PlayCircle className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 blur-lg opacity-50 -z-10 scale-110" />
      </Button>
    </div>
  );
};