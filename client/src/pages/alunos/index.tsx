import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Mail,
  Users,
  UserCheck,
  UserX,
  Eye,
  Pencil,
  MoreVertical,
  Loader2,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import AlunoViewModal from "@/components/dialogs/AlunoViewModal";
import GerarConviteAlunoModal from "@/components/dialogs/GerarConviteAlunoModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// Modern Student Card Component
const ModernStudentCard = ({ student, onView, onDelete }: { student: Aluno, onView: (s: Aluno) => void, onDelete: (s: Aluno) => void }) => {
  const getInitials = (nome: string) => {
    const partes = nome.split(' ').filter(Boolean);
    if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'from-green-500/20 to-green-600/20 border-green-200 dark:border-green-800' 
      : 'from-red-500/20 to-red-600/20 border-red-200 dark:border-red-800';
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10",
      "bg-gradient-to-r hover:scale-[1.02] hover:-translate-y-1",
      getStatusColor(student.status)
    )}>
      {/* Status indicator bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-all duration-300",
        student.status === 'active' 
          ? "bg-gradient-to-r from-green-500 to-green-600" 
          : "bg-gradient-to-r from-red-500 to-red-600"
      )} />

      <CardContent className="p-6">
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

          <div className="flex items-center space-x-2">
            <Badge variant={student.status === "active" ? "success" : "destructive"}>
              {student.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onView(student)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/alunos/editar/${student._id}`} className="flex items-center w-full">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(student)}>
                  <UserX className="mr-2 h-4 w-4" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <Button variant="outline" size="sm" onClick={() => onView(student)} className="hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950">
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          <Button variant="outline" size="sm" asChild className="hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950">
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

// Statistics Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue"
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color?: "blue" | "green" | "red" | "purple";
}) => {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    green: "from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
    red: "from-red-500/10 to-red-600/10 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
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
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default function GerenciarAlunosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmAction } = useConfirmDialog();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Fetch students
  const { 
    data: students = [], 
    isLoading, 
    isError, 
    error,
    isFetching
  } = useQuery<Aluno[], Error>({
    queryKey: ['/api/aluno/gerenciar'],
    queryFn: () => fetchWithAuth<Aluno[]>("/api/aluno/gerenciar"),
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: (alunoId: string) => {
      return fetchWithAuth(`/api/aluno/gerenciar/${alunoId}`, { method: 'DELETE' });
    },
    onSuccess: (_, alunoId) => {
      const removedStudent = students.find(s => s._id === alunoId);
      toast({ 
        title: "Aluno Removido", 
        description: `${removedStudent?.nome || 'O aluno'} foi removido com sucesso.` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
    },
    onError: (error: Error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro ao Remover", 
        description: error.message || "Não foi possível remover o aluno." 
      });
    }
  });

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch = !searchTerm || 
      (student.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const studentsStats = {
    total: students.length,
    active: students.filter(s => s.status === 'active').length,
    inactive: students.filter(s => s.status !== 'active').length,
  };

  const handleDeleteClick = (aluno: Aluno) => {
    openConfirmDialog({
      titulo: "Remover Aluno",
      mensagem: `Tem certeza que deseja remover o aluno ${aluno.nome}?`,
      onConfirm: () => deleteStudentMutation.mutate(aluno._id),
    });
  };

  const handleViewClick = (student: Aluno) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const refreshStudents = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
  };

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
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Total de Alunos"
              value={studentsStats.total}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title="Alunos Ativos"
              value={studentsStats.active}
              icon={UserCheck}
              color="green"
            />
            <StatsCard
              title="Alunos Inativos"
              value={studentsStats.inactive}
              icon={UserX}
              color="red"
            />
            <StatsCard
              title="Taxa de Atividade"
              value={studentsStats.total > 0 ? Math.round((studentsStats.active / studentsStats.total) * 100) : 0}
              icon={BarChart3}
              color="purple"
            />
          </div>
        </div>

        {/* Search and Controls */}
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                    Mostrando {filteredStudents.length} de {studentsStats.total} aluno(s)
                    {searchTerm && " (filtrado)"}
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

            {/* Students Grid */}
            {isLoading ? (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                message={error?.message || "Erro desconhecido"} 
              />
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? "Tente ajustar a busca para encontrar os alunos que você está procurando."
                    : "Comece adicionando seu primeiro aluno para começar a gerenciar treinos e acompanhar o progresso."
                  }
                </p>
                {searchTerm ? (
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    <Search className="h-4 w-4 mr-2" />
                    Limpar Busca
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
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredStudents.map((student) => (
                  <ModernStudentCard
                    key={student._id}
                    student={student}
                    onView={handleViewClick}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AlunoViewModal 
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
        isLoadingConfirm={deleteStudentMutation.isPending}
      />
    </div>
  );
}