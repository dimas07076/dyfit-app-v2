// shared/types/planos.ts

export interface Plano {
    _id: string;
    nome: string;
    descricao?: string;
    limiteAlunos: number;
    preco: number;
    duracao: number; // Duration in days
    tipo: 'free' | 'paid';
    ativo: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TokenAvulso {
    _id: string;
    personalTrainerId: string;
    quantidade: number;
    dataVencimento: Date;
    ativo: boolean;
    motivoAdicao?: string;
    adicionadoPorAdmin: string | PersonalTrainerBasicInfo;
    createdAt: Date;
    updatedAt: Date;
}

export interface PersonalPlano {
    _id: string;
    personalTrainerId: string;
    planoId: string | Plano;
    dataInicio: Date;
    dataVencimento: Date;
    ativo: boolean;
    atribuidoPorAdmin: string | PersonalTrainerBasicInfo;
    motivoAtribuicao?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PersonalTrainerBasicInfo {
    _id: string;
    nome: string;
    email?: string;
}

export interface PersonalPlanStatus {
    plano: Plano | null;
    personalPlano: PersonalPlano | null;
    limiteAtual: number;
    alunosAtivos: number;
    tokensAvulsos: number;
    percentualUso?: number;
    podeAtivarMais?: boolean;
    vagasDisponiveis?: number;
}

export interface PersonalTrainerWithStatus {
    _id: string;
    nome: string;
    email: string;
    createdAt: Date;
    planoAtual: string;
    planoId: string | null;
    planoDisplay: string;
    alunosAtivos: number;
    limiteAlunos: number; // Total limit including base plan + active tokens
    percentualUso: number;
    hasActivePlan: boolean;
    planDetails: {
        id: string;
        nome: string;
        limiteAlunos: number;
        preco: number;
    } | null;
}

export interface PersonalStatusAdmin {
    personalInfo: PersonalTrainerBasicInfo;
    currentPlan: PersonalPlanStatus;
    activeTokens: TokenAvulso[];
    activeStudents: number;
    totalLimit: number;
    planHistory: PersonalPlano[];
}

export interface StudentLimitStatus {
    canActivate: boolean;
    currentLimit: number;
    activeStudents: number;
    availableSlots: number;
}

// Form interfaces for admin operations
export interface AssignPlanForm {
    planoId: string;
    customDuration?: number;
    motivo?: string;
}

export interface AddTokensForm {
    quantidade: number;
    customDays?: number;
    motivo?: string;
}

// API Response types
export interface ApiResponse<T> {
    message?: string;
    data?: T;
    error?: string;
    code?: string;
}

export interface StudentLimitExceededResponse {
    message: string;
    code: 'STUDENT_LIMIT_EXCEEDED';
    data: {
        currentLimit: number;
        activeStudents: number;
        availableSlots: number;
        requestedQuantity?: number;
    };
}

export interface CleanupResult {
    message: string;
    plansDeactivated: number;
    tokensDeactivated: number;
}