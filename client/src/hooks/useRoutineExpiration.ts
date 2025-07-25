// client/src/hooks/useRoutineExpiration.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ExpirationStatus {
  status: 'active' | 'expiring' | 'expired' | 'inactive';
  daysUntilExpiration: number;
  isExpired: boolean;
  isExpiring: boolean;
  expirationDate: string | null;
  canRenew: boolean;
}

export interface ExpirationStats {
  active: number;
  expiring: number;
  expired: number;
  inactive: number;
  total: number;
}

// API functions
const api = {
  renewRoutine: async (routineId: string, validityDays = 30) => {
    const response = await fetch(`/api/treinos/${routineId}/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ validityDays })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || 'Erro ao renovar rotina');
    }
    
    return response.json();
  },

  updateRoutineValidity: async (routineId: string, newDate: string) => {
    const response = await fetch(`/api/treinos/${routineId}/update-validity`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ newDate })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || 'Erro ao atualizar validade');
    }
    
    return response.json();
  },

  getExpiringRoutines: async () => {
    const response = await fetch('/api/treinos/expiring', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || 'Erro ao buscar rotinas expirando');
    }
    
    return response.json();
  },

  getExpirationStats: async () => {
    const response = await fetch('/api/treinos/expiration-stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || 'Erro ao buscar estatísticas');
    }
    
    return response.json();
  },

  updateRoutineStatus: async (routineId: string) => {
    const response = await fetch(`/api/treinos/${routineId}/update-status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.mensagem || 'Erro ao atualizar status');
    }
    
    return response.json();
  }
};

// Calculate expiration status from routine data
export function calculateExpirationStatus(routine: any): ExpirationStatus {
  if (!routine?.dataValidade) {
    return {
      status: 'active',
      daysUntilExpiration: Infinity,
      isExpired: false,
      isExpiring: false,
      expirationDate: null,
      canRenew: false
    };
  }

  const expirationDate = new Date(routine.dataValidade);
  const today = new Date();
  const daysUntilExpiration = differenceInDays(expirationDate, today);

  let status: 'active' | 'expiring' | 'expired' | 'inactive' = 'active';
  
  if (daysUntilExpiration > 5) {
    status = 'active';
  } else if (daysUntilExpiration <= 5 && daysUntilExpiration >= 0) {
    status = 'expiring';
  } else if (daysUntilExpiration < 0 && Math.abs(daysUntilExpiration) <= 2) {
    status = 'expired';
  } else {
    status = 'inactive';
  }

  return {
    status,
    daysUntilExpiration,
    isExpired: daysUntilExpiration < 0,
    isExpiring: daysUntilExpiration <= 5 && daysUntilExpiration >= 0,
    expirationDate: format(expirationDate, "d 'de' MMMM", { locale: ptBR }),
    canRenew: routine.tipo === 'individual'
  };
}

// Hook for managing routine renewal
export function useRoutineRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId, validityDays }: { routineId: string; validityDays?: number }) =>
      api.renewRoutine(routineId, validityDays),
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiration-stats'] });
    }
  });
}

// Hook for updating routine validity date manually
export function useRoutineValidityUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId, newDate }: { routineId: string; newDate: string }) =>
      api.updateRoutineValidity(routineId, newDate),
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiration-stats'] });
    }
  });
}

// Hook for getting expiring routines (for personal trainers)
export function useExpiringRoutines() {
  return useQuery({
    queryKey: ['expiring-routines'],
    queryFn: api.getExpiringRoutines,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Hook for getting expiration statistics
export function useExpirationStats() {
  return useQuery({
    queryKey: ['expiration-stats'],
    queryFn: api.getExpirationStats,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Hook for updating routine status manually
export function useUpdateRoutineStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (routineId: string) => api.updateRoutineStatus(routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-routines'] });
    }
  });
}

// Utility functions for UI
export const getStatusColor = (status: ExpirationStatus['status']) => {
  switch (status) {
    case 'active':
      return 'green';
    case 'expiring':
      return 'yellow';
    case 'expired':
      return 'orange';
    case 'inactive':
      return 'red';
    default:
      return 'gray';
  }
};

export const getStatusText = (status: ExpirationStatus['status']) => {
  switch (status) {
    case 'active':
      return 'Ativa';
    case 'expiring':
      return 'Expirando';
    case 'expired':
      return 'Expirada';
    case 'inactive':
      return 'Inativa';
    default:
      return 'Desconhecido';
  }
};

export const getStatusIcon = (status: ExpirationStatus['status']) => {
  switch (status) {
    case 'active':
      return '✅';
    case 'expiring':
      return '⚠️';
    case 'expired':
      return '⏰';
    case 'inactive':
      return '🚫';
    default:
      return '❓';
  }
};