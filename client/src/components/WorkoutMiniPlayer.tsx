// client/src/components/WorkoutMiniPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useWorkoutPlayer } from '@/context/WorkoutPlayerContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Position {
  x: number;
  y: number;
}

const WorkoutMiniPlayer: React.FC = () => {
  const [location, navigate] = useLocation();
  const { 
    isWorkoutActive, 
    currentWorkoutSession, 
    elapsedTime, 
    completedExercises,
    resetWorkout 
  } = useWorkoutPlayer();

  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const miniPlayerRef = useRef<HTMLDivElement>(null);

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

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!miniPlayerRef.current) return;
    
    const rect = miniPlayerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - 300; // Approximate width of mini-player
    const maxY = window.innerHeight - 100; // Approximate height of mini-player
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Handle click to continue workout
  const handleContinueWorkout = () => {
    if (!currentWorkoutSession?.rotinaId || !currentWorkoutSession?.diaDeTreinoId) {
      console.error('Missing routing data for workout session');
      return;
    }

    // Navigate to correct route: /aluno/ficha/{rotinaId}?dia={diaDeTreinoId}
    navigate(`/aluno/ficha/${currentWorkoutSession.rotinaId}?diaId=${currentWorkoutSession.diaDeTreinoId}`);
  };

  const handleCloseWorkout = () => {
    resetWorkout();
  };

  if (shouldHide) {
    return null;
  }

  // Calculate progress
  const totalExercises = currentWorkoutSession?.exercises.length || 0;
  const completedCount = completedExercises.size;
  const progressPercentage = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  return (
    <div
      ref={miniPlayerRef}
      className={cn(
        "fixed z-50 transition-all duration-200",
        isDragging ? "cursor-grabbing shadow-2xl scale-105" : "cursor-grab shadow-lg hover:shadow-xl"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className="bg-white/95 backdrop-blur-sm border-indigo-200 w-80 max-w-80">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="bg-indigo-100 rounded-full p-2">
                <Timer className="w-4 h-4 text-indigo-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Treino em Andamento
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-mono font-bold text-indigo-600">
                    {formatTime(elapsedTime)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {completedCount}/{totalExercises}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinueWorkout();
                }}
              >
                <Play className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseWorkout();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutMiniPlayer;