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
    isExpired: boolean; // New field to indicate if current plan is expired
    dataInicio: Date | null; // Plan start date (preserved even when expired)
    dataVencimento: Date | null; // Plan expiration date (preserved even when expired)
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
    expiredTokens: TokenAvulso[];
    totalActiveTokens: number;
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

// New interfaces for plan transition functionality

export interface StudentPlanHistory {
    _id: string;
    personalTrainerId: string;
    studentId: string;
    previousPlanId: string;
    tokenId?: string;
    dateActivated: Date;
    dateDeactivated: Date;
    reason: 'plan_expired' | 'manual_deactivation' | 'plan_changed' | 'token_expired';
    wasActive: boolean;
    canBeReactivated: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlanTransitionType {
    type: 'renewal' | 'upgrade' | 'downgrade' | 'first_time';
    currentPlan: Plano | null;
    newPlan: Plano;
    limitDifference: number; // positive for upgrade, negative for downgrade, 0 for renewal
}

export interface EligibleStudentForReactivation {
    studentId: string;
    studentName: string;
    studentEmail: string;
    dateDeactivated: Date;
    previousPlanName: string;
    hasAssignedToken: boolean;
    tokenId?: string;
}

export interface PlanTransitionResult {
    success: boolean;
    transitionType: PlanTransitionType['type'];
    studentsReactivated: number;
    studentsRequiringManualSelection: number;
    availableSlots: number;
    eligibleStudents?: EligibleStudentForReactivation[];
    message: string;
}

export interface ManualReactivationRequest {
    selectedStudentIds: string[];
    personalTrainerId: string;
    newPlanId: string;
}

export interface ManualReactivationResult {
    success: boolean;
    studentsReactivated: number;
    errors: string[];
    message: string;
}