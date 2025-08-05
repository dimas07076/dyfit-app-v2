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
    const response = await fetch(`${API_BASE}/status`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch student limit status: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch student limit status');
    }

    return data.data;
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

    // Main status query
    const {
        data: status,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery<StudentLimitStatus>({
        queryKey: ['studentLimitStatus'],
        queryFn: fetchStudentLimitStatus,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
    });

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
    const refreshStatus = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });
        return refetch();
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