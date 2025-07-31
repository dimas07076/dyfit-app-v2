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
        return "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/25";
      case "workouts":
        return "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/25";
      case "sessions":
        return "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-purple-500/25";
      case "completion":
        return "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/25";
      case "activity":
        return "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-orange-500/25";
      default:
        return "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/25";
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
    <Card className="group relative p-6 border-0 shadow-lg hover:shadow-2xl 
                   bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm 
                   transition-all duration-500 ease-out
                   hover:scale-105 hover:-translate-y-2
                   rounded-xl overflow-hidden">
      
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 
                     dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10
                     opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex justify-between items-start">
        <div className="flex-1 space-y-3">
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-medium leading-relaxed">
            {title}
          </p>
          {isLoading ? (
            <div className="h-8 md:h-10 w-16 md:w-20 bg-gradient-to-r from-gray-200 to-gray-300 
                           dark:from-slate-600 dark:to-slate-700 animate-pulse rounded-lg"></div>
          ) : (
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 
                         dark:from-gray-100 dark:to-gray-200 bg-clip-text text-transparent
                         group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-600
                         dark:group-hover:from-blue-400 dark:group-hover:via-indigo-400 dark:group-hover:to-purple-400
                         transition-all duration-500">
              {value}
            </h3>
          )}
          {change && (
            <p className={`text-sm font-medium flex items-center gap-1 ${getTrendColor()} 
                          opacity-80 group-hover:opacity-100 transition-opacity duration-300`}>
              {getTrendIcon()}
              {change.value}
            </p>
          )}
        </div>
        
        <div className={`relative h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center 
                        shadow-lg group-hover:shadow-xl transition-all duration-500
                        group-hover:scale-110 group-hover:rotate-3
                        ${getIconBgColor()}`}>
          
          {/* Icon glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent 
                         opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative transform transition-transform duration-500 group-hover:scale-110">
            {getIcon()}
          </div>
        </div>
      </div>
    </Card>
  );
}