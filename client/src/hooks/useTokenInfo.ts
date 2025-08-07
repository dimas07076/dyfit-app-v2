// client/src/hooks/useTokenInfo.ts
import { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (!studentId) {
            setTokenInfo(null);
            return;
        }

        const fetchTokenInfo = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetchWithAuth(`/api/tokens/student/${studentId}`);
                
                if (response && response.success) {
                    setTokenInfo(response.data);
                } else {
                    setTokenInfo(null);
                }
            } catch (err: any) {
                console.error('Error fetching token info:', err);
                
                // If token not found, that's not an error - just no token assigned
                if (err.response?.status === 404) {
                    setTokenInfo(null);
                    setError(null);
                } else {
                    setError('Erro ao buscar informações do token');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenInfo();
    }, [studentId]);

    return { tokenInfo, isLoading, error, refetch: () => {
        if (studentId) {
            // Trigger re-fetch by updating state
            setTokenInfo(null);
            setIsLoading(true);
        }
    }};
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