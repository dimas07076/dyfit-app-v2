// client/src/hooks/useStudentLimit.ts
import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TokenStatus {
    plan: {
        total: number;
        available: number;
        expirationDate?: string;
    };
    avulso: {
        total: number;
        available: number;
    };
    availableSlots: number;
    hasPlan: boolean;
}

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

const API_BASE = '/api/token';
const LEGACY_API_BASE = '/api/student-limit';

// New token API functions
const fetchTokenStatus = async (): Promise<TokenStatus> => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('🔑 [TokenStatus] No authToken found, returning default status');
            return {
                plan: { total: 0, available: 0 },
                avulso: { total: 0, available: 0 },
                availableSlots: 0,
                hasPlan: false,
            };
        }

        console.log('🔍 [TokenStatus] Fetching token status...');
        
        const response = await fetch(`${API_BASE}/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('📡 [TokenStatus] Response status:', response.status);

        if (!response.ok) {
            console.warn('📡 [TokenStatus] API error, status:', response.status);
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                console.log('🔑 [TokenStatus] AuthToken expired, clearing storage');
            }
            
            return {
                plan: { total: 0, available: 0 },
                avulso: { total: 0, available: 0 },
                availableSlots: 0,
                hasPlan: false,
            };
        }

        const data = await response.json();
        console.log('📋 [TokenStatus] Raw response data:', data);
        
        if (!data.success) {
            console.warn('📋 [TokenStatus] API returned success=false:', data.message);
            return {
                plan: { total: 0, available: 0 },
                avulso: { total: 0, available: 0 },
                availableSlots: 0,
                hasPlan: false,
            };
        }

        console.log('✅ [TokenStatus] Successfully fetched status:', {
            availableSlots: data.data.availableSlots,
            hasPlan: data.data.hasPlan,
            planTokens: data.data.plan.available,
            avulsoTokens: data.data.avulso.available
        });

        return data.data;
    } catch (error) {
        console.error('❌ [TokenStatus] Error fetching status:', error);
        return {
            plan: { total: 0, available: 0 },
            avulso: { total: 0, available: 0 },
            availableSlots: 0,
            hasPlan: false,
        };
    }
};

// Legacy student limit API functions (kept for backward compatibility)
const fetchStudentLimitStatus = async (): Promise<StudentLimitStatus> => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('🔑 [StudentLimit] No authToken found, returning default status');
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
        
        const response = await fetch(`${LEGACY_API_BASE}/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('📡 [StudentLimit] Response status:', response.status);

        if (!response.ok) {
            console.warn('📡 [StudentLimit] API error, status:', response.status);
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                console.log('🔑 [StudentLimit] AuthToken expired, clearing storage');
            }
            
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
        console.error('❌ [StudentLimit] Error fetching status:', error);
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
    const response = await fetch(`${LEGACY_API_BASE}/validate-activation`, {
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
    const response = await fetch(`${LEGACY_API_BASE}/validate-invite`, {
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

    // New token status query
    const {
        data: tokenStatus,
        isLoading: isTokenLoading,
        isError: isTokenError,
        error: tokenError,
        refetch: refetchTokens,
    } = useQuery<TokenStatus>({
        queryKey: ['tokenStatus'],
        queryFn: fetchTokenStatus,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 15 * 1000,
        gcTime: 30 * 1000,
        retry: false,
        refetchInterval: 30 * 1000,
        refetchIntervalInBackground: false,
    });

    // Legacy student limit status query (kept for backward compatibility)
    const {
        data: status,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery<StudentLimitStatus>({
        queryKey: ['studentLimitStatus'],
        queryFn: fetchStudentLimitStatus,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 15 * 1000,
        gcTime: 30 * 1000,
        retry: false,
        refetchInterval: 30 * 1000,
        refetchIntervalInBackground: false,
    });

    // Listen for storage events to detect cross-tab changes
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'studentLimitRefresh') {
                console.log('🔄 [StudentLimit] Detected student limit refresh event from another tab');
                console.log('🔄 [StudentLimit] Invalidating queries and forcing refresh...');
                
                // Invalidate all related queries
                queryClient.invalidateQueries({ queryKey: ['tokenStatus'] });
                queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });
                queryClient.refetchQueries({ queryKey: ['tokenStatus'] });
                queryClient.refetchQueries({ queryKey: ['studentLimitStatus'] });
                
                // Force a fresh fetch
                refetchTokens();
                refetch();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        const handleBeforeUnload = () => {
            localStorage.setItem('studentLimitRefresh', Date.now().toString());
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [queryClient, refetch, refetchTokens]);

    // Validation mutations
    const activationValidation = useMutation<StudentLimitValidation, Error, number>({
        mutationFn: validateStudentActivation,
        onSuccess: (data) => {
            queryClient.setQueryData(['studentLimitStatus'], data.status);
        },
    });

    const inviteValidation = useMutation<StudentLimitValidation, Error, void>({
        mutationFn: validateSendInvite,
        onSuccess: (data) => {
            queryClient.setQueryData(['studentLimitStatus'], data.status);
        },
    });

    // Convenience methods using new token system when available
    const canActivateStudents = useCallback((quantidade: number = 1): boolean => {
        if (tokenStatus) {
            return tokenStatus.availableSlots >= quantidade;
        }
        if (status) {
            return status.availableSlots >= quantidade;
        }
        return false;
    }, [tokenStatus, status]);

    const canSendInvites = useCallback((): boolean => {
        if (tokenStatus) {
            return tokenStatus.availableSlots > 0;
        }
        return status?.blockedActions.canSendInvites ?? false;
    }, [tokenStatus, status]);

    const getStatusMessage = useCallback((): string => {
        if (tokenStatus) {
            if (tokenStatus.availableSlots === 0) {
                return 'Você não possui tokens disponíveis para cadastrar/ativar novos alunos.';
            } else if (tokenStatus.availableSlots === 1) {
                return 'Você pode ativar mais 1 aluno.';
            } else {
                return `Você pode ativar mais ${tokenStatus.availableSlots} alunos.`;
            }
        }
        return status?.message || 'Carregando status...';
    }, [tokenStatus, status]);

    const getRecommendations = useCallback((): string[] => {
        if (tokenStatus && tokenStatus.availableSlots === 0) {
            const recommendations = [];
            if (!tokenStatus.hasPlan) {
                recommendations.push('Contrate um plano para começar a ativar alunos');
            } else {
                recommendations.push('Faça upgrade do seu plano para mais slots');
            }
            recommendations.push('Adquira tokens avulsos entrando em contato com o Suporte DyFit');
            return recommendations;
        }
        return status?.recommendations || [];
    }, [tokenStatus, status]);

    // Get available slots (prioritize new token system)
    const availableSlots = tokenStatus?.availableSlots ?? status?.availableSlots ?? 0;

    // Invalidate and refetch status
    const refreshStatus = useCallback(async () => {
        console.log('🔄 [StudentLimit] Manual refresh triggered');
        
        try {
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
                        queryClient.setQueryData(['studentLimitStatus'], data.data);
                    }
                }
            }
        } catch (error) {
            console.warn('🔄 [StudentLimit] Force refresh failed, falling back to regular refresh:', error);
        }
        
        // Clear caches
        queryClient.removeQueries({ queryKey: ['tokenStatus'] });
        queryClient.removeQueries({ queryKey: ['studentLimitStatus'] });
        
        // Trigger refresh across tabs
        localStorage.setItem('studentLimitRefresh', Date.now().toString());
        
        // Force fresh fetches
        const [tokenResult, statusResult] = await Promise.all([
            refetchTokens(),
            refetch()
        ]);
        
        console.log('✅ [StudentLimit] Manual refresh completed', {
            tokens: tokenResult.data,
            status: statusResult.data
        });
        
        return { tokens: tokenResult, status: statusResult };
    }, [queryClient, refetch, refetchTokens]);

    // Validate operations
    const validateActivation = useCallback(async (quantidade: number = 1) => {
        // First check with new token system if available
        if (tokenStatus && tokenStatus.availableSlots < quantidade) {
            return Promise.resolve({
                isValid: false,
                message: 'Você não possui tokens disponíveis para cadastrar/ativar novos alunos.',
                errorCode: 'NO_TOKENS_AVAILABLE',
                status: status || {} as StudentLimitStatus,
            });
        }
        
        // Fallback to legacy validation
        return activationValidation.mutateAsync(quantidade);
    }, [tokenStatus, status, activationValidation]);

    const validateInvite = useCallback(async () => {
        // First check with new token system if available
        if (tokenStatus && tokenStatus.availableSlots === 0) {
            return Promise.resolve({
                isValid: false,
                message: 'Você não possui tokens disponíveis para enviar convites.',
                errorCode: 'NO_TOKENS_AVAILABLE',
                status: status || {} as StudentLimitStatus,
            });
        }
        
        // Fallback to legacy validation
        return inviteValidation.mutateAsync();
    }, [tokenStatus, status, inviteValidation]);

    // Check if we're at the limit
    const isAtLimit = availableSlots === 0;
    
    // Check if close to limit (within 1 slot)
    const isCloseToLimit = availableSlots <= 1 && availableSlots > 0;

    return {
        // New token system data
        tokenStatus,
        isTokenLoading,
        isTokenError,
        tokenError,

        // Legacy status data (for backward compatibility)
        status,
        isLoading,
        isError,
        error,

        // Computed states (using new system when available)
        availableSlots,
        canActivateStudent: canActivateStudents(1),
        canActivateStudents,
        canSendInvites,
        isAtLimit,
        isCloseToLimit,
        loading: isTokenLoading || isLoading,
        reason: !canActivateStudents(1) ? getStatusMessage() : undefined,
        
        // Message and recommendations
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