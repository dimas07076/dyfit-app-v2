import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import { PersonalTrainerWithStatus } from '../../../shared/types/planos';

export const usePersonalTrainers = () => {
  const [error, setError] = useState<string | null>(null);

  // Main query for fetching personal trainers
  const {
    data: personalsData,
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery<PersonalTrainerWithStatus[]>({
    queryKey: ['/api/admin/personal-trainers'],
    queryFn: async () => {
      try {
        setError(null);
        const response = await fetchWithAuth<PersonalTrainerWithStatus[]>(
          '/api/admin/personal-trainers',
          { method: 'GET' },
          'personalAdmin'
        );
        
        // Deep immutability: Create new object references for each personal trainer
        // This ensures React detects changes and re-renders properly
        const immutablePersonals = response.map(p => ({ ...p }));
        
        return immutablePersonals;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar personal trainers';
        setError(errorMessage);
        throw err;
      }
    },
    staleTime: 1000 * 30, // 30 seconds - consistent with existing patterns
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Memoized function to fetch/refresh personal trainers data
  const fetchPersonals = useCallback(async () => {
    try {
      setError(null);
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar personal trainers';
      setError(errorMessage);
      throw err;
    }
  }, [refetch]);

  // Alias for refresh functionality
  const refreshPersonals = fetchPersonals;

  // Function to update a specific personal trainer in the cached data
  const updatePersonal = useCallback((updated: PersonalTrainerWithStatus) => {
    queryClient.setQueryData<PersonalTrainerWithStatus[]>(
      ['/api/admin/personal-trainers'],
      (oldData) => {
        if (!oldData) return oldData;
        
        // Deep immutability: Create new array with new object references
        return oldData.map(p => {
          if (p._id === updated._id) {
            // Create a new object reference for the updated personal
            return { ...updated };
          }
          // Create new object references for unchanged personals too
          // This ensures complete immutability as requested
          return { ...p };
        });
      }
    );
  }, []);

  // Ensure personals is always an array with deep immutability
  const personals = personalsData ? personalsData.map(p => ({ ...p })) : [];

  // Combine query error with local error state
  const combinedError = error || (queryError instanceof Error ? queryError.message : null);

  return {
    personals,
    loading,
    error: combinedError,
    fetchPersonals,
    refreshPersonals,
    updatePersonal
  };
};