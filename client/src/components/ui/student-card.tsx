import React from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Pencil,
  UserX,
  MoreVertical,
  Mail,
  Phone,
  Target,
  Calendar,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Aluno } from "@/types/aluno";
import { cn } from "@/lib/utils";

interface StudentCardProps {
  student: Aluno;
  onView: (student: Aluno) => void;
  onDelete: (student: Aluno) => void;
  onStatusToggle?: (student: Aluno) => void;
  className?: string;
  showProgress?: boolean;
  showDetails?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onView,
  onDelete,
  onStatusToggle,
  className,
  showProgress = true,
  showDetails = true,
}) => {
  const getInitials = (nome: string) => {
    const parts = nome.split(' ').filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0] ? parts[0].substring(0, 2).toUpperCase() : '?';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'from-green-500/20 to-green-600/20 border-green-200 dark:border-green-800' 
      : 'from-red-500/20 to-red-600/20 border-red-200 dark:border-red-800';
  };

  const getProgressValue = () => {
    // Mock progress calculation - in real app this would come from actual data
    const baseProgress = student.status === 'active' ? 65 : 25;
    const randomVariation = (student._id.length % 30) + 10;
    return Math.min(baseProgress + randomVariation, 100);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const handleStatusToggle = () => {
    if (onStatusToggle) {
      onStatusToggle(student);
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
        "bg-gradient-to-r",
        getStatusColor(student.status),
        "hover:scale-[1.02] hover:-translate-y-1",
        className
      )}
    >
      {/* Status indicator bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-all duration-300",
        student.status === 'active' 
          ? "bg-gradient-to-r from-green-500 to-green-600" 
          : "bg-gradient-to-r from-red-500 to-red-600"
      )} />

      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-white/50 shadow-md">
                <AvatarFallback className={cn(
                  "text-lg font-semibold",
                  student.status === 'active' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                )}>
                  {getInitials(student.nome)}
                </AvatarFallback>
              </Avatar>
              {/* Activity indicator */}
              <div className={cn(
                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900",
                student.status === 'active' ? "bg-green-500" : "bg-red-500"
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {student.nome}
              </h3>
              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="w-3 h-3" />
                <span className="truncate">{student.email}</span>
              </div>
            </div>
          </div>

          {/* Status Badge and Actions */}
          <div className="flex items-center space-x-2">
            <Badge 
              variant={student.status === "active" ? "success" : "destructive"}
              className="cursor-pointer transition-all duration-200 hover:scale-105"
              onClick={handleStatusToggle}
            >
              {student.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onView(student)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link 
                    href={`/alunos/editar/${student._id}`}
                    className="flex items-center w-full"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(student)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress Section */}
        {showProgress && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Progresso Geral</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {getProgressValue()}%
              </span>
            </div>
            <Progress 
              value={getProgressValue()} 
              className="h-2"
            />
          </div>
        )}

        {/* Details Section */}
        {showDetails && (
          <div className="space-y-3">
            {/* Goal */}
            {student.goal && (
              <div className="flex items-center space-x-2 text-sm">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600 dark:text-gray-400">Objetivo:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {student.goal}
                </span>
              </div>
            )}

            {/* Phone */}
            {student.phone && (
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">Telefone:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {student.phone}
                </span>
              </div>
            )}

            {/* Start Date */}
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600 dark:text-gray-400">Início:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(student.startDate)}
              </span>
            </div>

            {/* Physical Info */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-600 dark:text-gray-400">Peso:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {student.weight}kg
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <span className="text-gray-600 dark:text-gray-400">Altura:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {student.height}cm
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions (visible on hover) */}
        <div className="flex justify-end space-x-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(student)}
            className="hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950"
          >
            <Link href={`/alunos/editar/${student._id}`}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;