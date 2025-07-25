// client/src/components/expiration/RoutineStatusIndicator.tsx
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateExpirationStatus, getStatusColor, getStatusText, getStatusIcon } from "@/hooks/useRoutineExpiration";
import { cn } from "@/lib/utils";

interface RoutineStatusIndicatorProps {
  routine: any;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showDays?: boolean;
  className?: string;
}

export function RoutineStatusIndicator({ 
  routine, 
  size = 'md', 
  showText = true, 
  showDays = true, 
  className 
}: RoutineStatusIndicatorProps) {
  const expirationStatus = calculateExpirationStatus(routine);
  
  if (!expirationStatus.expirationDate) {
    return null;
  }

  const color = getStatusColor(expirationStatus.status);
  const text = getStatusText(expirationStatus.status);
  const icon = getStatusIcon(expirationStatus.status);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const badgeVariant = color === 'green' ? 'default' :
                      color === 'yellow' ? 'secondary' :
                      color === 'orange' ? 'destructive' :
                      'outline';

  const tooltipContent = (
    <div className="text-center">
      <div className="font-semibold">
        {text} {icon}
      </div>
      <div className="text-sm">
        Expira em: {expirationStatus.expirationDate}
      </div>
      {expirationStatus.daysUntilExpiration !== Infinity && (
        <div className="text-xs mt-1">
          {expirationStatus.daysUntilExpiration >= 0 
            ? `${expirationStatus.daysUntilExpiration} dias restantes`
            : `Expirou há ${Math.abs(expirationStatus.daysUntilExpiration)} dias`
          }
        </div>
      )}
    </div>
  );

  const badgeContent = (
    <div className="flex items-center gap-1">
      <span>{icon}</span>
      {showText && <span>{text}</span>}
      {showDays && expirationStatus.daysUntilExpiration !== Infinity && (
        <span className="ml-1">
          ({expirationStatus.daysUntilExpiration >= 0 
            ? `${expirationStatus.daysUntilExpiration}d`
            : `+${Math.abs(expirationStatus.daysUntilExpiration)}d`
          })
        </span>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={badgeVariant}
            className={cn(
              sizeClasses[size],
              color === 'green' && 'bg-green-100 text-green-800 border-green-200',
              color === 'yellow' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
              color === 'orange' && 'bg-orange-100 text-orange-800 border-orange-200',
              color === 'red' && 'bg-red-100 text-red-800 border-red-200',
              className
            )}
          >
            {badgeContent}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for table cells
export function CompactStatusIndicator({ routine, className }: { routine: any; className?: string }) {
  return (
    <RoutineStatusIndicator 
      routine={routine}
      size="sm"
      showText={false}
      showDays={true}
      className={className}
    />
  );
}

// Full version with text for cards
export function FullStatusIndicator({ routine, className }: { routine: any; className?: string }) {
  return (
    <RoutineStatusIndicator 
      routine={routine}
      size="md"
      showText={true}
      showDays={true}
      className={className}
    />
  );
}