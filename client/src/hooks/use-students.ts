import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useStudents(trainerId: number) {
  // Get all students for a trainer
  const getStudents = () => {
    return useQuery<any[]>({
      queryKey: ["/api/alunos/gerenciar", { trainerId }],
      queryFn: async () => {
        return apiRequest("GET", "/api/alunos/gerenciar");
      }
    });
  };

  // Get a single student by ID
  const getStudent = (id: string) => {
    return useQuery<any>({
      queryKey: [`/api/alunos/gerenciar/${id}`],
      queryFn: async () => {
        return apiRequest("GET", `/api/alunos/gerenciar/${id}`);
      }
    });
  };

  // Add a new student
  const addStudent = () => {
    return useMutation({
      mutationFn: async (student: any) => {
        return apiRequest("POST", "/api/alunos/gerenciar", student);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alunos/gerenciar"] });
      }
    });
  };

  // Update a student
  const updateStudent = () => {
    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: Partial<any> }) => {
        return apiRequest("PUT", `/api/alunos/gerenciar/${id}`, data);
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["/api/alunos/gerenciar"] });
        queryClient.invalidateQueries({ queryKey: [`/api/alunos/gerenciar/${variables.id}`] });
      }
    });
  };

  // Delete a student
  const deleteStudent = () => {
    return useMutation({
      mutationFn: async (id: string) => {
        await apiRequest("DELETE", `/api/alunos/gerenciar/${id}`, undefined);
        return id;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alunos/gerenciar"] });
      }
    });
  };

  return {
    getStudents,
    getStudent,
    addStudent,
    updateStudent,
    deleteStudent
  };
}
