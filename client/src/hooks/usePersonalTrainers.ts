// client/src/hooks/usePlanManagement.ts
import { useState, useCallback, useMemo } from 'react';
import { PersonalTrainerWithStatus, Plano, AssignPlanForm, AddTokensForm } from '../../../shared/types/planos';
import { fetchWithAuth } from '../lib/apiClient';
import { handleApiError } from '../lib/handleApiError';
import { showToast } from '../lib/toastUtils';

interface PlanLookupMap {
  [planId: string]: Plano;
}

interface UsePlanManagementState {
  personalTrainers: PersonalTrainerWithStatus[];
  planos: Plano[];
  planLookupMap: PlanLookupMap;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UsePlanManagementActions {
  fetchData: () => Promise<void>;
  assignPlan: (personalId: string, data: AssignPlanForm) => Promise<void>;
  addTokens: (personalId: string, data: AddTokensForm) => Promise<void>;
  refreshPersonalData: (personalId: string) => Promise<void>;
  clearError: () => void;
  getPlanNameById: (planId: string | null) => string;
  getPlanById: (planId: string | null) => Plano | null;
}

interface UsePlanManagementReturn extends UsePlanManagementState, UsePlanManagementActions {}

/**
 * Enhanced custom hook for managing Personal Trainers and Plans.
 * Features:
 * - Robust plan name resolution with lookup maps
 * - Centralized error handling
 * - Optimized API calls
 * - Better loading states
 * - Plan name fallbacks
 */
export function usePersonalTrainers(): UsePlanManagementReturn {
  const [state, setState] = useState<UsePlanManagementState>({
    personalTrainers: [],
    planos: [],
    planLookupMap: {},
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Creates a lookup map for fast plan resolution
   */
  const createPlanLookupMap = useCallback((planos: Plano[]): PlanLookupMap => {
    const lookupMap: PlanLookupMap = {};
    planos.forEach(plano => {
      if (plano._id) {
        lookupMap[plano._id] = plano;
      }
    });
    console.log('📊 [usePlanManagement] Created plan lookup map:', lookupMap);
    return lookupMap;
  }, []);

  /**
   * Get plan name by ID with robust fallback
   */
  const getPlanNameById = useCallback((planId: string | null): string => {
    if (!planId) return 'Sem plano';
    
    const plan = state.planLookupMap[planId];
    if (plan && plan.nome) {
      return plan.nome;
    }
    
    // Fallback: try to find in the planos array directly
    const directPlan = state.planos.find(p => p._id === planId);
    if (directPlan && directPlan.nome) {
      console.log('⚠️  [usePlanManagement] Using fallback plan resolution for:', planId);
      return directPlan.nome;
    }
    
    console.warn('❌ [usePlanManagement] Plan name not found for ID:', planId);
    return `Plano ID: ${planId.substring(0, 8)}...`;
  }, [state.planLookupMap, state.planos]);

  /**
   * Get complete plan object by ID
   */
  const getPlanById = useCallback((planId: string | null): Plano | null => {
    if (!planId) return null;
    
    const plan = state.planLookupMap[planId];
    if (plan) {
      return plan;
    }
    
    // Fallback: try to find in the planos array directly
    const directPlan = state.planos.find(p => p._id === planId);
    if (directPlan) {
      console.log('⚠️  [usePlanManagement] Using fallback plan object resolution for:', planId);
      return directPlan;
    }
    
    return null;
  }, [state.planLookupMap, state.planos]);

  /**
   * Enhanced data processing that ensures plan names are correctly resolved
   */
  const processPersonalTrainerData = useCallback((
    rawPersonalTrainers: any[], 
    planLookupMap: PlanLookupMap
  ): PersonalTrainerWithStatus[] => {
    return rawPersonalTrainers.map(personal => {
      // Extract plan ID - try multiple sources for robustness
      const planId = personal.planDetails?.id || personal.planoId || null;
      
      // Resolve plan name using lookup map
      let planoAtual = 'Sem plano';
      let planDetails = null;
      
      if (planId && planLookupMap[planId]) {
        const plan = planLookupMap[planId];
        planoAtual = plan.nome;
        planDetails = {
          id: plan._id,
          nome: plan.nome,
          limiteAlunos: plan.limiteAlunos,
          preco: plan.preco,
        };
      } else if (personal.planoAtual && personal.planoAtual !== 'Sem plano') {
        // Use whatever was provided by the server as fallback
        planoAtual = personal.planoAtual;
        planDetails = personal.planDetails;
      }

      const processedPersonal: PersonalTrainerWithStatus = {
        _id: personal._id,
        nome: personal.nome,
        email: personal.email,
        createdAt: personal.createdAt,
        planoAtual,
        planoId: planId,
        planoDisplay: planoAtual,
        alunosAtivos: personal.alunosAtivos || 0,
        limiteAlunos: personal.limiteAlunos || 0,
        percentualUso: personal.percentualUso || 0,
        hasActivePlan: planId !== null && planoAtual !== 'Sem plano' && !personal.isExpired,
        isExpired: personal.isExpired || false, // Handle expired plan status
        dataInicio: personal.dataInicio || null, // Preserve plan start date
        dataVencimento: personal.dataVencimento || null, // Preserve plan expiration date
        planDetails,
      };

      console.log(`✅ [usePlanManagement] Processed ${personal.nome}: ${planoAtual}`);
      return processedPersonal;
    });
  }, []);

  /**
   * Main data fetching function - fetches both personal trainers and plans
   * then processes them together for consistent plan name resolution
   */
  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔄 [usePlanManagement] Starting data fetch...');
      
      // Fetch both datasets in parallel for better performance
      const [personalTrainersResponse, planosResponse] = await Promise.all([
        fetchWithAuth('/api/admin/personal-trainers') as Promise<any[]>,
        fetchWithAuth('/api/admin/planos') as Promise<Plano[]>
      ]);

      console.log('📊 [usePlanManagement] Raw personal trainers data:', personalTrainersResponse);
      console.log('📊 [usePlanManagement] Plans data:', planosResponse);

      // Create plan lookup map for efficient resolution
      const planLookupMap = createPlanLookupMap(planosResponse);
      
      // Process personal trainers with enhanced plan name resolution
      const processedPersonalTrainers = processPersonalTrainerData(personalTrainersResponse, planLookupMap);

      setState(prev => ({
        ...prev,
        personalTrainers: processedPersonalTrainers,
        planos: planosResponse,
        planLookupMap,
        loading: false,
        lastUpdated: new Date(),
      }));

      console.log('✅ [usePlanManagement] Data fetched and processed successfully');
      console.log('📊 [usePlanManagement] Final processed data:', processedPersonalTrainers);
      
    } catch (error) {
      console.error('❌ [usePlanManagement] Error fetching data:', error);
      handleApiError(error, 'Erro ao carregar dados dos personal trainers');
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Erro ao carregar dados. Tente novamente.' 
      }));
    }
  }, [createPlanLookupMap, processPersonalTrainerData]);

  /**
   * Refresh data for a specific personal trainer
   */
  const refreshPersonalData = useCallback(async (personalId: string) => {
    try {
      console.log('🔄 [usePlanManagement] Refreshing data for personal:', personalId);
      
      // For now, refresh all data to ensure consistency
      // In the future, we could implement a more targeted refresh
      await fetchData();
      
    } catch (error) {
      console.error('❌ [usePlanManagement] Error refreshing personal data:', error);
      throw error;
    }
  }, [fetchData]);

  /**
   * Assign a plan to a personal trainer with enhanced error handling
   */
  const assignPlan = useCallback(async (personalId: string, data: AssignPlanForm) => {
    try {
      console.log('🔄 [usePlanManagement] Assigning plan...', { personalId, data });

      // Validate plan exists
      const planExists = state.planos.find(p => p._id === data.planoId);
      if (!planExists) {
        throw new Error('Plano selecionado não encontrado');
      }

      await fetchWithAuth(`/api/admin/personal/${personalId}/assign-plan`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ [usePlanManagement] Plan assigned successfully');

      // Show success feedback
      showToast({
        title: 'Plano Atribuído',
        description: `Plano "${planExists.nome}" atribuído com sucesso.`,
        variant: 'default',
      });

      // Refresh data to get updated state
      await fetchData();

    } catch (error) {
      console.error('❌ [usePlanManagement] Error assigning plan:', error);
      handleApiError(error, 'Erro ao atribuir plano');
      throw error;
    }
  }, [state.planos, fetchData]);

  /**
   * Add tokens to a personal trainer with enhanced error handling
   */
  const addTokens = useCallback(async (personalId: string, data: AddTokensForm) => {
    try {
      console.log('🔄 [usePlanManagement] Adding tokens...', { personalId, data });

      if (!data.quantidade || data.quantidade < 1) {
        throw new Error('Quantidade de tokens deve ser pelo menos 1');
      }

      await fetchWithAuth(`/api/admin/personal/${personalId}/add-tokens`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ [usePlanManagement] Tokens added successfully');

      // Show success feedback
      showToast({
        title: 'Tokens Adicionados',
        description: `${data.quantidade} tokens adicionados com sucesso.`,
        variant: 'default',
      });

      // Refresh data to get updated state
      await fetchData();

    } catch (error) {
      console.error('❌ [usePlanManagement] Error adding tokens:', error);
      handleApiError(error, 'Erro ao adicionar tokens');
      throw error;
    }
  }, [fetchData]);

  // Memoized computed values
  const memoizedValues = useMemo(() => ({
    planLookupMap: state.planLookupMap,
    getPlanNameById,
    getPlanById
  }), [state.planLookupMap, getPlanNameById, getPlanById]);

  return {
    // State
    personalTrainers: state.personalTrainers,
    planos: state.planos,
    planLookupMap: memoizedValues.planLookupMap,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Actions
    fetchData,
    assignPlan,
    addTokens,
    refreshPersonalData,
    clearError,
    getPlanNameById: memoizedValues.getPlanNameById,
    getPlanById: memoizedValues.getPlanById,
  };
}