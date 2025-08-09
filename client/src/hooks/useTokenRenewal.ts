// client/src/hooks/useTokenRenewal.ts
import { useState } from 'react';

export function useTokenRenewal() {
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [selectedPlanoId, setSelectedPlanoId] = useState<string>('');

    const openRenewalModal = (planoId: string) => {
        setSelectedPlanoId(planoId);
        setIsRenewalModalOpen(true);
    };

    const closeRenewalModal = () => {
        setIsRenewalModalOpen(false);
        setSelectedPlanoId('');
    };

    return {
        isRenewalModalOpen,
        selectedPlanoId,
        openRenewalModal,
        closeRenewalModal
    };
}