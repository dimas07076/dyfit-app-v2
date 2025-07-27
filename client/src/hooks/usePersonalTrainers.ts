// client/src/hooks/usePersonalTrainers.ts
import { useState, useCallback } from 'react';
import { PersonalTrainerWithStatus, Plano, AssignPlanForm, AddTokensForm } from '../../../shared/types/planos';
import { fetchWithAuth } from '../lib/apiClient';
import { handleApiError } from '../lib/handleApiError';
import { showToast } from '../lib/toastUtils';

interface UsePersonalTrainersState {
  personalTrainers: PersonalTrainerWithStatus[];
  planos: Plano[];
  loading: boolean;
  error: string | null;
}

interface UsePersonalTrainersActions {
  fetchPersonals: () => Promise<void>;
  assignPlan: (personalId: string, data: AssignPlanForm) => Promise<void>;
  addTokens: (personalId: string, data: AddTokensForm) => Promise<void>;
  clearError: () => void;
}

interface UsePersonalTrainersReturn extends UsePersonalTrainersState, UsePersonalTrainersActions {}

/**
 * Custom hook for managing Personal Trainers data.
 * Provides centralized state management and a single source of truth.
 */
export function usePersonalTrainers(): UsePersonalTrainersReturn {
  const [state, setState] = useState<UsePersonalTrainersState>({
    personalTrainers: [],
    planos: [],
    loading: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Fetches all personal trainers and plans from the API.
   * This is the single source of truth for the data.
   */
  const fetchPersonals = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔄 [usePersonalTrainers] Carregando dados...');
      
      // Fetch both personal trainers and plans in parallel
      const [personalResponse, planosResponse] = await Promise.all([
        fetchWithAuth<PersonalTrainerWithStatus[]>('/api/admin/personal-trainers'),
        fetchWithAuth<Plano[]>('/api/admin/planos')
      ]);

      setState(prev => ({
        ...prev,
        personalTrainers: personalResponse || [],
        planos: planosResponse || [],
        loading: false,
        error: null,
      }));

      console.log('✅ [usePersonalTrainers] Dados carregados com sucesso', {
        personalTrainers: personalResponse?.length || 0,
        planos: planosResponse?.length || 0,
      });

    } catch (error) {
      console.error('❌ [usePersonalTrainers] Erro ao carregar dados:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar dados';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      // Use existing error handling infrastructure
      handleApiError(error, 'Erro ao carregar dados');
    }
  }, []);

  /**
   * Assigns a plan to a personal trainer.
   * After success, automatically reloads data to ensure consistency.
   */
  const assignPlan = useCallback(async (personalId: string, data: AssignPlanForm) => {
    try {
      console.log('🔄 [usePersonalTrainers] Atribuindo plano...', { personalId, data });

      await fetchWithAuth(`/api/admin/personal/${personalId}/assign-plan`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ [usePersonalTrainers] Plano atribuído com sucesso');

      // Show success feedback
      showToast({
        title: 'Plano Atribuído',
        description: 'O plano foi atribuído com sucesso ao personal trainer.',
        variant: 'default',
      });

      // Reload data to get fresh state from backend (source of truth strategy)
      await fetchPersonals();

    } catch (error) {
      console.error('❌ [usePersonalTrainers] Erro ao atribuir plano:', error);
      
      // Use existing error handling infrastructure
      handleApiError(error, 'Erro ao atribuir plano');
      
      // Re-throw to let calling component handle if needed
      throw error;
    }
  }, [fetchPersonals]);

  /**
   * Adds tokens to a personal trainer.
   * After success, automatically reloads data to ensure consistency.
   */
  const addTokens = useCallback(async (personalId: string, data: AddTokensForm) => {
    try {
      console.log('🔄 [usePersonalTrainers] Adicionando tokens...', { personalId, data });

      await fetchWithAuth(`/api/admin/personal/${personalId}/add-tokens`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ [usePersonalTrainers] Tokens adicionados com sucesso');

      // Show success feedback
      showToast({
        title: 'Tokens Adicionados',
        description: 'Os tokens foram adicionados com sucesso ao personal trainer.',
        variant: 'default',
      });

      // Reload data to get fresh state from backend (source of truth strategy)
      await fetchPersonals();

    } catch (error) {
      console.error('❌ [usePersonalTrainers] Erro ao adicionar tokens:', error);
      
      // Use existing error handling infrastructure
      handleApiError(error, 'Erro ao adicionar tokens');
      
      // Re-throw to let calling component handle if needed
      throw error;
    }
  }, [fetchPersonals]);

  return {
    // State
    personalTrainers: state.personalTrainers,
    planos: state.planos,
    loading: state.loading,
    error: state.error,
    
    // Actions
    fetchPersonals,
    assignPlan,
    addTokens,
    clearError,
  };
}