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
  const { isWorkoutActive, elapsedTime, currentFichaId, isResting } = useWorkoutPlayer();
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

  // Determine button style based on state
  const getButtonStyle = () => {
    if (isResting) {
      return "bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-500/30";
    }
    return "bg-green-600 text-white hover:bg-green-700 border-green-500/30";
  };

  // Get appropriate icon and title based on state
  const getIconAndTitle = () => {
    if (isResting) {
      return {
        title: "Descansando - Clique para voltar ao treino",
        icon: Timer
      };
    }
    return {
      title: "Treino ativo - Clique para voltar ao treino",
      icon: Timer
    };
  };

  const { title, icon: IconComponent } = getIconAndTitle();

  return (
    <Button
      onClick={handleTimerClick}
      variant="secondary"
      size="sm"
      className={cn(
        "fixed bottom-20 right-4 z-50 h-12 px-4 shadow-lg",
        getButtonStyle(),
        "backdrop-blur-sm",
        "transition-all duration-200 ease-in-out",
        "animate-in fade-in-0 slide-in-from-bottom-4",
        "rounded-full shadow-xl",
        "hover:scale-105 active:scale-95",
        className
      )}
      title={title}
    >
      <IconComponent className="w-4 h-4 mr-2" />
      <span className="font-mono text-sm font-bold">
        {formatTime(elapsedTime)}
      </span>
    </Button>
  );
};

export default MinimizedWorkoutTimer;