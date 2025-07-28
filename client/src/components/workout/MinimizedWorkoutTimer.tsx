import React from 'react';
import { Timer } from 'lucide-react';
import { useLocation } from 'wouter';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MinimizedWorkoutTimerProps {
  className?: string;
}

export const MinimizedWorkoutTimer: React.FC<MinimizedWorkoutTimerProps> = ({ className }) => {
  const { isWorkoutActive, elapsedTime, currentFichaId } = useWorkoutPlayer();
  const [location, navigate] = useLocation();

  // Don't show timer on the workout execution page itself
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

  return (
    <Button
      onClick={handleTimerClick}
      variant="secondary"
      size="sm"
      className={cn(
        "fixed bottom-20 right-4 z-50 h-12 px-4 shadow-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "border border-border/20 backdrop-blur-sm",
        "transition-all duration-200 ease-in-out",
        "animate-in fade-in-0 slide-in-from-bottom-4",
        className
      )}
    >
      <Timer className="w-4 h-4 mr-2" />
      <span className="font-mono text-sm font-medium">
        {formatTime(elapsedTime)}
      </span>
    </Button>
  );
};

export default MinimizedWorkoutTimer;