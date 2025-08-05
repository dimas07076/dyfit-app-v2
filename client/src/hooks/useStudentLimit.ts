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
    tokenInfo: {
        availableTokens: number;
        consumedTokens: number;
        totalTokens: number;
    };
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
    try {
        // Use the correct token key for personal/admin users
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('🔑 [StudentLimit] No authToken found, returning default status');
            // Return a safe default instead of throwing
            return {
                canActivate: false,
                currentLimit: 0,
                activeStudents: 0,
                availableSlots: 0,
                planInfo: null,
                tokenInfo: {
                    availableTokens: 0,
                    consumedTokens: 0,
                    totalTokens: 0,
                },
                limitExceeded: true,
                blockedActions: {
                    canActivateStudents: false,
                    canSendInvites: false,
                },
                message: 'Token de autenticação não encontrado. Faça login novamente.',
            };
        }

        console.log('🔍 [StudentLimit] Fetching student limit status...');
        
        const response = await fetch(`${API_BASE}/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('📡 [StudentLimit] Response status:', response.status);

        if (!response.ok) {
            console.warn('📡 [StudentLimit] API error, status:', response.status);
            
            if (response.status === 401) {
                // Clear invalid token and force re-login
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                console.log('🔑 [StudentLimit] AuthToken expired, clearing storage');
                
                // Return safe default instead of throwing
                return {
                    canActivate: false,
                    currentLimit: 0,
                    activeStudents: 0,
                    availableSlots: 0,
                    planInfo: null,
                    tokenInfo: {
                        availableTokens: 0,
                        consumedTokens: 0,
                        totalTokens: 0,
                    },
                    limitExceeded: true,
                    blockedActions: {
                        canActivateStudents: false,
                        canSendInvites: false,
                    },
                    message: 'Token de autenticação não encontrado. Faça login novamente.',
                };
            }
            
            // For other errors, also return safe defaults
            return {
                canActivate: false,
                currentLimit: 0,
                activeStudents: 0,
                availableSlots: 0,
                planInfo: null,
                tokenInfo: {
                    availableTokens: 0,
                    consumedTokens: 0,
                    totalTokens: 0,
                },
                limitExceeded: true,
                blockedActions: {
                    canActivateStudents: false,
                    canSendInvites: false,
                },
                message: `Erro ao carregar dados do servidor (${response.status})`,
            };
        }

        const data = await response.json();
        console.log('📋 [StudentLimit] Raw response data:', data);
        
        if (!data.success) {
            console.warn('📋 [StudentLimit] API returned success=false:', data.message);
            return {
                canActivate: false,
                currentLimit: 0,
                activeStudents: 0,
                availableSlots: 0,
                planInfo: null,
                tokenInfo: {
                    availableTokens: 0,
                    consumedTokens: 0,
                    totalTokens: 0,
                },
                limitExceeded: true,
                blockedActions: {
                    canActivateStudents: false,
                    canSendInvites: false,
                },
                message: data.message || 'Erro ao buscar status do limite de alunos',
            };
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
        
        // Return safe default instead of throwing
        return {
            canActivate: false,
            currentLimit: 0,
            activeStudents: 0,
            availableSlots: 0,
            planInfo: null,
            tokenInfo: {
                availableTokens: 0,
                consumedTokens: 0,
                totalTokens: 0,
            },
            limitExceeded: true,
            blockedActions: {
                canActivateStudents: false,
                canSendInvites: false,
            },
            message: 'Erro de conexão. Verifique sua internet e tente novamente.',
        };
    }
};

const validateStudentActivation = async (quantidade: number = 1): Promise<StudentLimitValidation> => {
    const response = await fetch(`${API_BASE}/validate-activation`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
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
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
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

    // Main status query with aggressive refresh settings and better error handling
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
        retry: false, // Disable retry since we handle errors gracefully now
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
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
        
        try {
            // Call force refresh endpoint for fresh data
            const token = localStorage.getItem('authToken');
            if (token) {
                const response = await fetch('/api/student-limit/force-refresh', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        console.log('🔄 [StudentLimit] Force refresh successful:', data.data);
                        // Update cache with fresh data
                        queryClient.setQueryData(['studentLimitStatus'], data.data);
                    }
                }
            }
        } catch (error) {
            console.warn('🔄 [StudentLimit] Force refresh failed, falling back to regular refresh:', error);
        }
        
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