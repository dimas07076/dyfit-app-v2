export interface Aluno {
    _id: string;
    nome: string;
    email: string;
    phone?: string;
    birthDate: string;
    gender: string;
    goal: string;
    weight: number;
    height: number;
    startDate: string;
    // --- CORREÇÃO AQUI ---
    status: 'active' | 'inactive';
    notes?: string;
    trainerId: string; // ID do PersonalTrainer
    
    // Token tracking fields
    consumoFonte?: 'plano' | 'token';
    consumidoDoPlanoId?: string;
    consumidoDoTokenId?: string;
    validadeAcesso?: string;
    dataAssociacao?: string;
    
    // Additional token info (populated by server)
    tokenInfo?: {
        id: string;
        tipo: 'plano' | 'token';
        planoTipo?: string;
        vencimento?: string;
        status?: string;
    };
  }