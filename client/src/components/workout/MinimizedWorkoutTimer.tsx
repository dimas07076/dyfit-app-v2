import React from 'react';
import { Timer } from 'lucide-react';
import { useLocation } from 'wouter';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MinimizedWorkoutTimerProps {
  className?: string;
}

/**
 * Minimized Workout Timer Component
 * 
 * Displays a floating timer button when a workout is active.
 * Only visible for students (aluno) and hidden on the workout execution page itself.
 * 
 * Features:
 * - Shows elapsed workout time in MM:SS format
 * - Different colors for active (green) vs resting (yellow) states
 * - Clicking navigates back to the active workout page
 * - Auto-hides when workout is not active or on workout page
 */
export const MinimizedWorkoutTimer: React.FC<MinimizedWorkoutTimerProps> = ({ className }) => {
  const { isWorkoutActive, elapsedTime, currentFichaId, isResting } = useWorkoutPlayer();
  const [location, navigate] = useLocation();

  // Don't show timer on the workout execution page itself to avoid duplication
  const isOnWorkoutPage = location.includes('/aluno/ficha/');

  // Don't show if workout is not active or if on workout page
  if (!isWorkoutActive || isOnWorkoutPage) {
    return null;
  }

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Navigate to workout page when clicked
  const handleTimerClick = () => {
    if (currentFichaId) {
      // Navigate to the specific workout page if we have the fichaId
      navigate(`/aluno/ficha/${currentFichaId}`);
    } else {
      // Fallback to dashboard if no fichaId is available
      navigate('/aluno/dashboard');
    }
  };

  // Determine button style based on workout state
  const getButtonStyle = () => {
    if (isResting) {
      return "bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-500/30";
    }
    return "bg-green-600 text-white hover:bg-green-700 border-green-500/30";
  };

  // Get appropriate title based on state
  const getTitle = () => {
    if (isResting) {
      return "Descansando - Clique para voltar ao treino";
    }
    return "Treino ativo - Clique para voltar ao treino";
  };

  return (
    <Button
      onClick={handleTimerClick}
      variant="secondary"
      size="sm"
      className={cn(
        // Fixed positioning - bottom right, above mobile nav
        "fixed bottom-20 right-4 z-50 h-12 px-4 shadow-lg",
        // Dynamic styling based on workout state
        getButtonStyle(),
        // Visual enhancements
        "backdrop-blur-sm",
        "transition-all duration-200 ease-in-out",
        "animate-in fade-in-0 slide-in-from-bottom-4",
        "rounded-full shadow-xl",
        "hover:scale-105 active:scale-95",
        className
      )}
      title={getTitle()}
    >
      <Timer className="w-4 h-4 mr-2" />
      <span className="font-mono text-sm font-bold">
        {formatTime(elapsedTime)}
      </span>
    </Button>
  );
};

export default MinimizedWorkoutTimer;