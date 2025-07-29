import React from 'react';

interface PageLoaderProps {
  message?: string;
  submessage?: string;
}

export function PageLoader({ 
  message = "Carregando...", 
  submessage = "Organizando seus dados..." 
}: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground animate-fade-in">
      {/* Dual Ring Spinner with DyFit Colors */}
      <div className="relative mb-6">
        {/* Primary ring */}
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        {/* Secondary ring with offset */}
        <div 
          className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-secondary/50 rounded-full animate-spin" 
          style={{ 
            animationDelay: '0.3s', 
            animationDuration: '1.5s',
            animationDirection: 'reverse' 
          }} 
        />
        {/* Accent ring with different timing */}
        <div 
          className="absolute inset-2 w-12 h-12 border-3 border-transparent border-t-accent/40 rounded-full animate-spin" 
          style={{ 
            animationDelay: '0.6s', 
            animationDuration: '2s' 
          }} 
        />
      </div>

      {/* Main message with gradient */}
      <div className="text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-pulse mb-2">
        {message}
      </div>

      {/* Submessage with staggered animation */}
      <div 
        className="text-sm opacity-70 animate-pulse text-center max-w-xs" 
        style={{ animationDelay: '0.5s' }}
      >
        {submessage}
      </div>

      {/* Decorative dots */}
      <div className="flex space-x-1 mt-4">
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '0s' }}
        />
        <div 
          className="w-2 h-2 bg-secondary rounded-full animate-bounce" 
          style={{ animationDelay: '0.2s' }}
        />
        <div 
          className="w-2 h-2 bg-accent rounded-full animate-bounce" 
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  );
}

export default PageLoader;