// client/src/hooks/useConsumedTokens.ts
import { useQuery } from '@tanstack/react-query';

export interface ConsumedTokenDetail {
    tokenId: string;
    type: 'plano' | 'avulso';
    quantidade: number;
    dataVencimento: Date;
    dateAssigned: Date;
    assignedStudent: {
        id: string;
        nome: string;
        email: string;
        status: 'active' | 'inactive';
    };
}

export interface ConsumedTokensData {
    summary: {
        availableTokens: number;
        consumedTokens: number;
        totalTokens: number;
    };
    consumedTokenDetails: ConsumedTokenDetail[];
}

const fetchConsumedTokens = async (): Promise<ConsumedTokensData> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Token de autenticação não encontrado');
    }

    const response = await fetch('/api/student-limit/consumed-tokens', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch consumed tokens: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch consumed tokens');
    }

    return data.data;
};

export const useConsumedTokens = () => {
    return useQuery<ConsumedTokensData>({
        queryKey: ['consumedTokens'],
        queryFn: fetchConsumedTokens,
        refetchOnWindowFocus: true,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 60 * 1000, // 1 minute
    });
};

export default useConsumedTokens;