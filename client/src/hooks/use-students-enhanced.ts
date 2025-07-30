import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Aluno } from "@/types/aluno";

interface StudentsFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  goal: string;
}

interface StudentsStats {
  total: number;
  active: number;
  inactive: number;
}

export function useStudentsEnhanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filters state
  const [filters, setFilters] = useState<StudentsFilters>({
    search: "",
    status: "all",
    goal: ""
  });

  // Fetch students with enhanced caching
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Delete student with optimistic updates
  const deleteStudentMutation = useMutation<any, Error, string>({
    mutationFn: (alunoId: string) => {
      return fetchWithAuth(`/api/aluno/gerenciar/${alunoId}`, { method: 'DELETE' });
    },
    onMutate: async (alunoId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/aluno/gerenciar'] });

      // Snapshot the previous value
      const previousStudents = queryClient.getQueryData<Aluno[]>(['/api/aluno/gerenciar']);

      // Optimistically remove the student
      if (previousStudents) {
        queryClient.setQueryData<Aluno[]>(['/api/aluno/gerenciar'], 
          previousStudents.filter(student => student._id !== alunoId)
        );
      }

      return { previousStudents };
    },
    onError: (error, alunoId, context) => {
      // Rollback on error
      if (context?.previousStudents) {
        queryClient.setQueryData(['/api/aluno/gerenciar'], context.previousStudents);
      }
      toast({ 
        variant: "destructive", 
        title: "Erro ao Remover", 
        description: error.message || "Não foi possível remover o aluno." 
      });
    },
    onSuccess: (_, alunoId) => {
      // Find student name for success message
      const removedStudent = students.find(s => s._id === alunoId);
      toast({ 
        title: "Aluno Removido", 
        description: `${removedStudent?.nome || 'O aluno'} foi removido com sucesso.` 
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
    }
  });

  // Update student status optimistically
  const updateStatusMutation = useMutation<any, Error, { id: string; status: 'active' | 'inactive' }>({
    mutationFn: ({ id, status }) => {
      return fetchWithAuth(`/api/aluno/gerenciar/${id}`, { 
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/aluno/gerenciar'] });
      
      const previousStudents = queryClient.getQueryData<Aluno[]>(['/api/aluno/gerenciar']);
      
      if (previousStudents) {
        queryClient.setQueryData<Aluno[]>(['/api/aluno/gerenciar'], 
          previousStudents.map(student => 
            student._id === id ? { ...student, status } : student
          )
        );
      }
      
      return { previousStudents };
    },
    onError: (error, variables, context) => {
      if (context?.previousStudents) {
        queryClient.setQueryData(['/api/aluno/gerenciar'], context.previousStudents);
      }
      toast({ 
        variant: "destructive", 
        title: "Erro ao Atualizar Status", 
        description: error.message || "Não foi possível atualizar o status do aluno." 
      });
    },
    onSuccess: (_, { status }) => {
      toast({ 
        title: "Status Atualizado", 
        description: `Aluno ${status === 'active' ? 'ativado' : 'desativado'} com sucesso.` 
      });
    }
  });

  // Computed values with memoization
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch = !filters.search || 
        (student.nome || "").toLowerCase().includes(filters.search.toLowerCase()) ||
        (student.email || "").toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'all' || student.status === filters.status;
      
      const matchesGoal = !filters.goal || 
        (student.goal || "").toLowerCase().includes(filters.goal.toLowerCase());

      return matchesSearch && matchesStatus && matchesGoal;
    });
  }, [students, filters]);

  const studentsStats = useMemo((): StudentsStats => {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const inactive = total - active;
    
    return { total, active, inactive };
  }, [students]);

  // Get unique goals for filter options
  const availableGoals = useMemo(() => {
    const goals = students
      .map(s => s.goal)
      .filter((goal, index, array) => goal && array.indexOf(goal) === index)
      .sort();
    return goals;
  }, [students]);

  // Filter update functions
  const updateSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const updateStatusFilter = (status: 'all' | 'active' | 'inactive') => {
    setFilters(prev => ({ ...prev, status }));
  };

  const updateGoalFilter = (goal: string) => {
    setFilters(prev => ({ ...prev, goal }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      goal: ""
    });
  };

  // Bulk operations
  const bulkUpdateStatus = useMutation<any, Error, { ids: string[]; status: 'active' | 'inactive' }>({
    mutationFn: ({ ids, status }) => {
      return Promise.all(
        ids.map(id => fetchWithAuth(`/api/aluno/gerenciar/${id}`, { 
          method: 'PATCH',
          body: JSON.stringify({ status })
        }))
      );
    },
    onSuccess: (_, { ids, status }) => {
      toast({ 
        title: "Atualização em Lote", 
        description: `${ids.length} aluno(s) ${status === 'active' ? 'ativado(s)' : 'desativado(s)'} com sucesso.` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro na Atualização em Lote", 
        description: error.message || "Não foi possível atualizar os alunos selecionados." 
      });
    }
  });

  return {
    // Data
    students: filteredStudents,
    allStudents: students,
    studentsStats,
    availableGoals,
    
    // Loading states
    isLoading,
    isError,
    error,
    isFetching,
    
    // Filters
    filters,
    updateSearch,
    updateStatusFilter,
    updateGoalFilter,
    clearFilters,
    
    // Mutations
    deleteStudent: deleteStudentMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    bulkUpdateStatus: bulkUpdateStatus.mutate,
    
    // Mutation states
    isDeleting: deleteStudentMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isBulkUpdating: bulkUpdateStatus.isPending,
    
    // Utility functions
    refreshStudents: () => queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] }),
    prefetchStudent: (id: string) => {
      queryClient.prefetchQuery({
        queryKey: [`/api/aluno/${id}`],
        queryFn: () => fetchWithAuth(`/api/aluno/${id}`),
        staleTime: 1000 * 60 * 5
      });
    }
  };
}