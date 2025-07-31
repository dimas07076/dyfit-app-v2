// client/src/components/ui/dashboard/stats-card.tsx

import { Card } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CheckCircle,
  Dumbbell,
  UsersRound,
  Activity, // <<< ADIÇÃO: Importa o novo ícone 'Activity'
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  // <<< ALTERAÇÃO: Adiciona 'activity' à lista de ícones permitidos >>>
  icon: "students" | "workouts" | "sessions" | "completion" | "activity";
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  isLoading = false,
}: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "students":
        return <UsersRound className="w-6 h-6" />;
      case "workouts":
        return <Dumbbell className="w-6 h-6" />;
      case "sessions":
        return <CalendarCheck className="w-6 h-6" />;
      case "completion":
        return <CheckCircle className="w-6 h-6" />;
      // <<< ADIÇÃO: Novo caso para o ícone 'activity' >>>
      case "activity":
        return <Activity className="w-6 h-6" />;
      default:
        return <UsersRound className="w-6 h-6" />;
    }
  };

  const getIconBgColor = () => {
    switch (icon) {
      case "students":
        return "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-blue-500/30";
      case "workouts":
        return "bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white shadow-indigo-500/30";
      case "sessions":
        return "bg-gradient-to-br from-purple-500 via-pink-500 to-pink-600 text-white shadow-purple-500/30";
      case "completion":
        return "bg-gradient-to-br from-emerald-500 via-green-500 to-green-600 text-white shadow-emerald-500/30";
      case "activity":
        return "bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white shadow-orange-500/30";
      default:
        return "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-blue-500/30";
    }
  };

  const getTrendColor = () => {
    if (!change) return "";
    if (change.trend === "up") return "text-success";
    if (change.trend === "down") return "text-error";
    return "text-gray-500";
  };

  const getTrendIcon = () => {
    if (!change) return null;
    if (change.trend === "up") return <ArrowUp className="w-3 h-3 mr-1" />;
    if (change.trend === "down") return <ArrowDown className="w-3 h-3 mr-1" />;
    return null;
  };

  return (
    <Card className="group relative p-4 sm:p-5 lg:p-6 border-0 shadow-lg hover:shadow-2xl 
                   bg-white/95 dark:bg-slate-800/95 backdrop-blur-md 
                   transition-all duration-500 ease-out
                   hover:scale-[1.02] sm:hover:scale-105 hover:-translate-y-1 sm:hover:-translate-y-2
                   rounded-xl overflow-hidden
                   ring-1 ring-gray-200/50 dark:ring-slate-700/50 
                   hover:ring-blue-300/50 dark:hover:ring-blue-600/50">
      
      {/* Enhanced gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 
                     dark:from-blue-900/15 dark:via-indigo-900/10 dark:to-purple-900/15
                     opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex justify-between items-start">
        <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base font-medium leading-relaxed
                       group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
            {title}
          </p>
          {isLoading ? (
            <div className="h-6 sm:h-8 lg:h-10 w-12 sm:w-16 lg:w-20 bg-gradient-to-r from-gray-200 to-gray-300 
                           dark:from-slate-600 dark:to-slate-700 animate-pulse rounded-lg"></div>
          ) : (
            <h3 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 
                         dark:from-gray-100 dark:to-gray-200 bg-clip-text text-transparent
                         group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-600
                         dark:group-hover:from-blue-400 dark:group-hover:via-indigo-400 dark:group-hover:to-purple-400
                         transition-all duration-500 leading-tight">
              {value}
            </h3>
          )}
          {change && (
            <p className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${getTrendColor()} 
                          opacity-80 group-hover:opacity-100 transition-opacity duration-300`}>
              {getTrendIcon()}
              {change.value}
            </p>
          )}
        </div>
        
        <div className={`relative h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16 
                        rounded-xl sm:rounded-2xl flex items-center justify-center 
                        shadow-lg group-hover:shadow-2xl transition-all duration-500
                        group-hover:scale-110 group-hover:rotate-2
                        ${getIconBgColor()}`}>
          
          {/* Enhanced icon glow effect */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/30 to-transparent 
                         opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative transform transition-transform duration-500 group-hover:scale-110">
            {getIcon()}
          </div>
        </div>
      </div>
    </Card>
  );
}