// client/src/hooks/useStudentLimit.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StudentLimitStatus {
    canActivate: boolean;
    currentLimit: number;
    activeStudents: number;
    availableSlots: number;
    planInfo: {
        plano: any;
        personalPlano: any;
        tokensAvulsos: number;
        isExpired: boolean;
    } | null;
    limitExceeded: boolean;
    blockedActions: {
        canActivateStudents: boolean;
        canSendInvites: boolean;
    };
    message?: string;
    recommendations?: string[];
}

export interface StudentLimitValidation {
    isValid: boolean;
    message: string;
    errorCode: string;
    status: StudentLimitStatus;
}

const API_BASE = '/api/student-limit';

// API functions
const fetchStudentLimitStatus = async (): Promise<StudentLimitStatus> => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
    }

    try {
        console.log('🔍 [StudentLimit] Fetching student limit status...');
        
        const response = await fetch(`${API_BASE}/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('📡 [StudentLimit] Response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                // Clear invalid token
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            if (response.status === 403) {
                throw new Error('Acesso negado. Verifique suas permissões.');
            }
            if (response.status >= 500) {
                throw new Error('Erro interno do servidor. Tente novamente em alguns instantes.');
            }
            throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📋 [StudentLimit] Raw response data:', data);
        
        if (!data.success) {
            throw new Error(data.message || 'Erro ao buscar status do limite de alunos');
        }

        console.log('✅ [StudentLimit] Successfully fetched status:', {
            canActivate: data.data.canActivate,
            currentLimit: data.data.currentLimit,
            activeStudents: data.data.activeStudents,
            availableSlots: data.data.availableSlots,
            tokensAvulsos: data.data.planInfo?.tokensAvulsos,
            limitExceeded: data.data.limitExceeded
        });

        return data.data;
    } catch (error) {
        // Log error for debugging
        console.error('❌ [StudentLimit] Error fetching status:', error);
        
        // Re-throw with a user-friendly message
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
    }
};

const validateStudentActivation = async (quantidade: number = 1): Promise<StudentLimitValidation> => {
    const response = await fetch(`${API_BASE}/validate-activation`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantidade }),
    });

    if (!response.ok) {
        throw new Error(`Failed to validate student activation: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        isValid: data.success,
        message: data.message,
        errorCode: data.code,
        status: data.data,
    };
};

const validateSendInvite = async (): Promise<StudentLimitValidation> => {
    const response = await fetch(`${API_BASE}/validate-invite`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to validate send invite: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        isValid: data.success,
        message: data.message,
        errorCode: data.code,
        status: data.data,
    };
};

export const useStudentLimit = () => {
    const queryClient = useQueryClient();

    // Main status query with aggressive refresh settings
    const {
        data: status,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery<StudentLimitStatus>({
        queryKey: ['studentLimitStatus'],
        queryFn: fetchStudentLimitStatus,
        refetchOnWindowFocus: true, // Enable refetch on window focus
        refetchOnMount: true, // Always refetch on mount
        refetchOnReconnect: true, // Refetch when network reconnects
        staleTime: 15 * 1000, // Reduced to 15 seconds for even faster updates
        gcTime: 30 * 1000, // Reduce garbage collection time to 30 seconds
        retry: 3, // Increased retry attempts
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds (more aggressive)
        refetchIntervalInBackground: false, // Don't waste resources when page is hidden
    });

    // Listen for storage events to detect cross-tab changes
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'studentLimitRefresh') {
                console.log('🔄 [StudentLimit] Detected student limit refresh event from another tab');
                console.log('🔄 [StudentLimit] Invalidating queries and forcing refresh...');
                
                // Invalidate all related queries
                queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });
                queryClient.refetchQueries({ queryKey: ['studentLimitStatus'] });
                
                // Force a fresh fetch
                refetch();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Also listen for manual refresh triggers within the same tab
        const handleBeforeUnload = () => {
            // Trigger refresh for other tabs when this tab is about to close
            localStorage.setItem('studentLimitRefresh', Date.now().toString());
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [queryClient, refetch]);

    // Validation mutations
    const activationValidation = useMutation<StudentLimitValidation, Error, number>({
        mutationFn: validateStudentActivation,
        onSuccess: (data) => {
            // Update the status cache with fresh data
            queryClient.setQueryData(['studentLimitStatus'], data.status);
        },
    });

    const inviteValidation = useMutation<StudentLimitValidation, Error, void>({
        mutationFn: validateSendInvite,
        onSuccess: (data) => {
            // Update the status cache with fresh data
            queryClient.setQueryData(['studentLimitStatus'], data.status);
        },
    });

    // Convenience methods
    const canActivateStudents = useCallback((quantidade: number = 1): boolean => {
        if (!status) return false;
        return status.availableSlots >= quantidade;
    }, [status]);

    const canSendInvites = useCallback((): boolean => {
        return status?.blockedActions.canSendInvites ?? false;
    }, [status]);

    const getStatusMessage = useCallback((): string => {
        return status?.message || 'Carregando status...';
    }, [status]);

    const getRecommendations = useCallback((): string[] => {
        return status?.recommendations || [];
    }, [status]);

    // Invalidate and refetch status (useful after student operations)
    const refreshStatus = useCallback(async () => {
        console.log('🔄 [StudentLimit] Manual refresh triggered');
        
        // Clear any existing cache
        queryClient.removeQueries({ queryKey: ['studentLimitStatus'] });
        
        // Trigger refresh across tabs
        localStorage.setItem('studentLimitRefresh', Date.now().toString());
        
        // Force a fresh fetch
        const result = await refetch();
        
        console.log('✅ [StudentLimit] Manual refresh completed', result.data);
        
        return result;
    }, [queryClient, refetch]);

    // Validate operations
    const validateActivation = useCallback((quantidade: number = 1) => {
        return activationValidation.mutateAsync(quantidade);
    }, [activationValidation]);

    const validateInvite = useCallback(() => {
        return inviteValidation.mutateAsync();
    }, [inviteValidation]);

    // Check if we're at the limit
    const isAtLimit = status?.limitExceeded ?? false;
    
    // Check if close to limit (within 1 slot)
    const isCloseToLimit = (status?.availableSlots ?? 0) <= 1 && (status?.availableSlots ?? 0) > 0;

    return {
        // Status data
        status,
        isLoading,
        isError,
        error,

        // Computed states
        isAtLimit,
        isCloseToLimit,
        canActivateStudents,
        canSendInvites,
        getStatusMessage,
        getRecommendations,

        // Actions
        refreshStatus,
        validateActivation,
        validateInvite,

        // Validation states
        activationValidation: {
            isLoading: activationValidation.isPending,
            isError: activationValidation.isError,
            error: activationValidation.error,
            data: activationValidation.data,
        },
        inviteValidation: {
            isLoading: inviteValidation.isPending,
            isError: inviteValidation.isError,
            error: inviteValidation.error,
            data: inviteValidation.data,
        },
    };
};

export default useStudentLimit;