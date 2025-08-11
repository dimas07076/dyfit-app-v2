// client/src/hooks/useTokenInfo.ts
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/apiClient';

// Definindo a interface para os dados do token que esperamos da API
export interface ITokenInfo {
  _id: string;
  id: string; // ID amigável (TOK-xxxx)
  tipo: 'plano' | 'avulso';
  dataExpiracao: string;
  dateAssigned?: string;
  motivoAdicao?: string;
  planoId?: any; // Pode ser populado com detalhes do plano no futuro
}

export const useTokenInfo = (studentId: string | null) => {
  const { 
    data: tokenInfo, 
    isLoading, 
    isError, 
    error 
  } = useQuery<ITokenInfo>({
    queryKey: ['tokenInfo', studentId],
    queryFn: () => {
        console.log(`[useTokenInfo] Buscando informações do token para o aluno: ${studentId}`);
        return fetchWithAuth(`/api/tokens/student/${studentId}`);
    },
    enabled: !!studentId, // A busca só será executada se studentId não for nulo
    retry: 2, // Tenta buscar 3 vezes no total em caso de erro
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    gcTime: 1000 * 60 * 10,  // 10 minutos de garbage collection
  });

  return { tokenInfo, isLoading, isError, error };
};