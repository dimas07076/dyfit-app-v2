// client/src/hooks/useTokenInfo.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/apiClient';
import { TokenInfo } from '@/components/TokenInfoDisplay';

export interface TokenStatus {
    availableTokens: number;
    consumedTokens: number;
    totalTokens: number;
    planTokens: number;
    standaloneTokens: number;
    tokenDetails: TokenInfo[];
}

export function useTokenInfo(studentId?: string) {
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchAttempts, setFetchAttempts] = useState(0);

    const fetchTokenInfo = useCallback(async (retryCount: number = 0) => {
        if (!studentId) {
            setTokenInfo(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log(`[useTokenInfo] 🔍 ENHANCED: Fetching token info for student ${studentId} (attempt ${retryCount + 1})`);
            
            const response = await fetchWithAuth(`/api/tokens/student/${studentId}`);
            
            if (response && response.success) {
                setTokenInfo(response.data);
                console.log(`[useTokenInfo] ✅ ENHANCED: Token info found for student ${studentId}:`, {
                    tokenId: response.data?.id,
                    tipo: response.data?.tipo,
                    status: response.data?.status
                });
            } else {
                console.log(`[useTokenInfo] ℹ️ ENHANCED: No token found for student ${studentId} on attempt ${retryCount + 1}`);
                
                // ENHANCED: Retry logic for cases where token assignment might be delayed
                if (retryCount < 3) {
                    console.log(`[useTokenInfo] 🔄 ENHANCED: Retrying token fetch for student ${studentId} in ${(retryCount + 1) * 500}ms`);
                    setTimeout(() => {
                        fetchTokenInfo(retryCount + 1);
                    }, (retryCount + 1) * 500); // Progressive delay: 500ms, 1s, 1.5s
                    return;
                }
                
                setTokenInfo(null);
            }
        } catch (err: any) {
            console.error(`[useTokenInfo] ❌ ENHANCED: Error fetching token info for student ${studentId} (attempt ${retryCount + 1}):`, err);
            
            // If token not found, that's not an error - just no token assigned
            if (err.response?.status === 404) {
                // ENHANCED: Retry for 404s in case of timing issues
                if (retryCount < 2) {
                    console.log(`[useTokenInfo] 🔄 ENHANCED: Retrying 404 for student ${studentId} in ${(retryCount + 1) * 750}ms`);
                    setTimeout(() => {
                        fetchTokenInfo(retryCount + 1);
                    }, (retryCount + 1) * 750);
                    return;
                }
                
                setTokenInfo(null);
                setError(null);
            } else {
                // ENHANCED: Retry on other errors
                if (retryCount < 1) {
                    console.log(`[useTokenInfo] 🔄 ENHANCED: Retrying error for student ${studentId} in 1000ms`);
                    setTimeout(() => {
                        fetchTokenInfo(retryCount + 1);
                    }, 1000);
                    return;
                }
                
                setError('Erro ao buscar informações do token');
            }
        } finally {
            setIsLoading(false);
            setFetchAttempts(prev => prev + 1);
        }
    }, [studentId]);

    useEffect(() => {
        fetchTokenInfo(0);
    }, [fetchTokenInfo]);

    const refetch = useCallback(() => {
        if (studentId) {
            console.log(`[useTokenInfo] 🔄 ENHANCED: Manual refetch triggered for student ${studentId}`);
            setTokenInfo(null);
            setIsLoading(true);
            setFetchAttempts(0);
            fetchTokenInfo(0);
        }
    }, [studentId, fetchTokenInfo]);

    const forceRefresh = useCallback(async () => {
        if (studentId) {
            console.log(`[useTokenInfo] 🚨 ENHANCED: Force refresh triggered for student ${studentId}`);
            
            // Wait a bit longer for database consistency
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setTokenInfo(null);
            setIsLoading(true);
            setFetchAttempts(0);
            fetchTokenInfo(0);
        }
    }, [studentId, fetchTokenInfo]);

    return { 
        tokenInfo, 
        isLoading, 
        error, 
        refetch,
        forceRefresh,
        fetchAttempts
    };
}

export function useTokenStatus() {
    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTokenStatus = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth('/api/tokens/status');
            
            if (response && response.success) {
                setTokenStatus(response.data);
            } else {
                setError('Erro ao buscar status dos tokens');
            }
        } catch (err: any) {
            console.error('Error fetching token status:', err);
            setError('Erro ao buscar status dos tokens');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTokenStatus();
    }, []);

    return { 
        tokenStatus, 
        isLoading, 
        error, 
        refetch: fetchTokenStatus 
    };
}