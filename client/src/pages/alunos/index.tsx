import React, { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  Mail,
  Users,
  UserCheck,
  UserX,
  Filter,
  FilterX,
  Loader2,
  TrendingUp,
  BarChart3,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import StudentCard from "@/components/ui/student-card";
import StudentDetailsModal from "@/components/dialogs/StudentDetailsModal";
import GerarConviteAlunoModal from "@/components/dialogs/GerarConviteAlunoModal";
import { useStudentsEnhanced } from "@/hooks/use-students-enhanced";
import { cn } from "@/lib/utils";

// Statistics Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  change,
  changeType = "neutral"
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color?: "blue" | "green" | "red" | "purple";
  change?: string;
  changeType?: "up" | "down" | "neutral";
}) => {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    green: "from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
    red: "from-red-500/10 to-red-600/10 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
  };

  const changeColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400", 
    neutral: "text-gray-500 dark:text-gray-400",
  };

  return (
    <Card className={cn(
      "bg-gradient-to-br border transition-all duration-200 hover:shadow-lg hover:scale-105",
      colorClasses[color]
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {value.toLocaleString()}
        </div>
        {change && (
          <div className={cn("flex items-center text-xs", changeColors[changeType])}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Filter Badge Component
const FilterBadge = ({ 
  label, 
  value, 
  onRemove 
}: { 
  label: string; 
  value: string; 
  onRemove: () => void; 
}) => (
  <Badge 
    variant="secondary" 
    className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
    onClick={onRemove}
  >
    <span className="text-xs font-medium">{label}: {value}</span>
    <FilterX className="h-3 w-3" />
  </Badge>
);

export default function GerenciarAlunosPage() {
  const { toast } = useToast();
  const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmAction } = useConfirmDialog();
  
  // Enhanced hook
  const {
    students,
    studentsStats,
    availableGoals,
    isLoading,
    isError,
    error,
    isFetching,
    filters,
    updateSearch,
    updateStatusFilter,
    updateGoalFilter,
    clearFilters,
    deleteStudent,
    updateStatus,
    isDeleting,
    isUpdatingStatus,
    refreshStudents,
  } = useStudentsEnhanced();

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");

  const handleDeleteClick = (aluno: Aluno) => {
    openConfirmDialog({
      titulo: "Remover Aluno",
      mensagem: `Tem certeza que deseja remover o aluno ${aluno.nome}?`,
      onConfirm: () => deleteStudent(aluno._id),
    });
  };

  const handleViewClick = (student: Aluno) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleStatusToggle = (student: Aluno) => {
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    updateStatus({ id: student._id, status: newStatus });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.goal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Gerenciar Alunos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gerencie seus alunos, acompanhe o progresso e organize rotinas de treino
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshStudents}
                disabled={isFetching}
                className="bg-white dark:bg-gray-800"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" className="bg-white dark:bg-gray-800">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Total de Alunos"
              value={studentsStats.total}
              icon={Users}
              color="blue"
              change="+2 este mês"
              changeType="up"
            />
            <StatsCard
              title="Alunos Ativos"
              value={studentsStats.active}
              icon={UserCheck}
              color="green"
              change="+5 esta semana"
              changeType="up"
            />
            <StatsCard
              title="Alunos Inativos"
              value={studentsStats.inactive}
              icon={UserX}
              color="red"
              change="-1 esta semana"
              changeType="down"
            />
            <StatsCard
              title="Taxa de Atividade"
              value={studentsStats.total > 0 ? Math.round((studentsStats.active / studentsStats.total) * 100) : 0}
              icon={BarChart3}
              color="purple"
              change="Estável"
              changeType="neutral"
            />
          </div>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6 shadow-sm bg-white dark:bg-gray-900">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Buscar por nome ou email..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => updateSearch(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filters.status} onValueChange={updateStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.goal} onValueChange={updateGoalFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os Objetivos</SelectItem>
                    {availableGoals.map((goal) => (
                      <SelectItem key={goal} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-md bg-gray-50 dark:bg-gray-800">
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="rounded-r-none"
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "compact" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("compact")}
                    className="rounded-l-none"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => setIsInviteModalOpen(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Convidar
                </Button>
                <Link href="/alunos/novo">
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Aluno
                  </Button>
                </Link>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Filtros ativos:</span>
                {filters.search && (
                  <FilterBadge
                    label="Busca"
                    value={filters.search}
                    onRemove={() => updateSearch("")}
                  />
                )}
                {filters.status !== 'all' && (
                  <FilterBadge
                    label="Status"
                    value={filters.status === 'active' ? 'Ativo' : 'Inativo'}
                    onRemove={() => updateStatusFilter('all')}
                  />
                )}
                {filters.goal && (
                  <FilterBadge
                    label="Objetivo"
                    value={filters.goal}
                    onRemove={() => updateGoalFilter("")}
                  />
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <FilterX className="h-4 w-4 mr-1" />
                  Limpar tudo
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Carregando alunos...</span>
                  </div>
                ) : (
                  <span>
                    Mostrando {students.length} de {studentsStats.total} aluno(s)
                    {hasActiveFilters && " (filtrado)"}
                  </span>
                )}
              </div>
              {isFetching && !isLoading && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Atualizando...</span>
                </div>
              )}
            </div>

            {/* Students Grid/List */}
            {isLoading ? (
              <div className={cn(
                "grid gap-4",
                viewMode === "cards" 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
              )}>
                {[...Array(8)].map((_, i) => (
                  <Card key={`skeleton-${i}`} className="bg-white dark:bg-gray-800">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-full mb-4" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              <ErrorMessage 
                title="Erro ao Carregar Alunos" 
                message={error.message} 
              />
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {hasActiveFilters ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {hasActiveFilters 
                    ? "Tente ajustar os filtros para encontrar os alunos que você está procurando."
                    : "Comece adicionando seu primeiro aluno para começar a gerenciar treinos e acompanhar o progresso."
                  }
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    <FilterX className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Link href="/alunos/novo">
                      <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Primeiro Aluno
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={() => setIsInviteModalOpen(true)}>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Convite
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className={cn(
                "grid gap-4",
                viewMode === "cards" 
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              )}>
                {students.map((student) => (
                  <StudentCard
                    key={student._id}
                    student={student}
                    onView={handleViewClick}
                    onDelete={handleDeleteClick}
                    onStatusToggle={handleStatusToggle}
                    showProgress={viewMode === "cards"}
                    showDetails={viewMode === "cards"}
                    className={viewMode === "compact" ? "hover:shadow-md" : ""}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <StudentDetailsModal 
        aluno={selectedStudent} 
        open={isViewModalOpen} 
        onOpenChange={setIsViewModalOpen} 
      />
      
      <GerarConviteAlunoModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />

      <ModalConfirmacao
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmAction}
        titulo={confirmOptions.titulo}
        mensagem={confirmOptions.mensagem}
        isLoadingConfirm={isDeleting || isUpdatingStatus}
      />
    </div>
  );
}