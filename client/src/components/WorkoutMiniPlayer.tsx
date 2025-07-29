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

  // Position in upper right corner by default
  const [position, setPosition] = useState<Position>(() => {
    // Start in upper right corner with some margin
    const initialX = typeof window !== 'undefined' ? window.innerWidth - 220 : 20;
    return { x: Math.max(20, initialX), y: 20 };
  });
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
    
    // Constrain to viewport with updated mini-player dimensions
    const miniPlayerWidth = window.innerWidth < 768 ? 200 : 240; // Responsive width
    const miniPlayerHeight = 100; // Approximate height
    const maxX = window.innerWidth - miniPlayerWidth;
    const maxY = window.innerHeight - miniPlayerHeight;
    
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

  // Update position when window resizes to keep it in bounds
  useEffect(() => {
    const handleResize = () => {
      const miniPlayerWidth = window.innerWidth < 768 ? 200 : 240;
      const miniPlayerHeight = 100;
      const maxX = window.innerWidth - miniPlayerWidth;
      const maxY = window.innerHeight - miniPlayerHeight;
      
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, maxX)),
        y: Math.max(0, Math.min(prev.y, maxY))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        "fixed z-40 transition-all duration-200", // Reduced z-index from 50 to 40
        isDragging ? "cursor-grabbing shadow-2xl scale-105" : "cursor-grab shadow-lg hover:shadow-xl"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className="bg-white/95 backdrop-blur-sm border-indigo-200 w-48 md:w-60 max-w-60"> {/* Responsive width: 192px mobile, 240px desktop */}
        <CardContent className="p-3"> {/* Reduced padding from p-4 to p-3 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0"> {/* Reduced space-x-3 to space-x-2 */}
              <div className="bg-indigo-100 rounded-full p-1.5"> {/* Reduced padding from p-2 to p-1.5 */}
                <Timer className="w-3 h-3 text-indigo-600" /> {/* Reduced icon size from w-4 h-4 to w-3 h-3 */}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate"> {/* Reduced from text-sm to text-xs */}
                  Treino em Andamento
                </p>
                <div className="flex items-center space-x-1.5"> {/* Reduced space-x-2 to space-x-1.5 */}
                  <span className="text-base md:text-lg font-mono font-bold text-indigo-600"> {/* Responsive text size */}
                    {formatTime(elapsedTime)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {completedCount}/{totalExercises}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-0.5 ml-1.5"> {/* Reduced space-x-1 to space-x-0.5 and ml-2 to ml-1.5 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-indigo-600 hover:bg-indigo-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinueWorkout();
                }}
              >
                <Play className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseWorkout();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-2"> {/* Reduced from mt-3 to mt-2 */}
            <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden"> {/* Reduced height from h-2 to h-1.5 */}
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