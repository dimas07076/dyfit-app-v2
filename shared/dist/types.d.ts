export interface Aluno {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export interface Personal {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export interface ExercicioFichaAluno {
    exercicioId: {
        _id: string;
        nome: string;
        grupoMuscular: string;
    };
    ordem: number;
    series: string;
    repeticoes: string;
    carga?: string;
    observacoes?: string;
}
export interface IFichaTreinoAluno {
    _id: string;
    alunoId: string;
    personalId: string;
    nome: string;
    descricao?: string;
    exercicios: ExercicioFichaAluno[];
    dataCriacao: string;
    dataAtualizacao: string;
}
export interface StudentLimitStatus {
    planDetails: {
        name: string;
        limit: number;
        isActive: boolean;
        expiresAt: Date | null;
    } | null;
    tokensAvailable: number;
    totalLimit: number;
    activeStudents: number;
    availableSlots: number;
    isAtLimit: boolean;
}
export interface ValidationResult {
    success: boolean;
    message: string;
    code: string;
    data: {
        currentLimit: number;
        activeStudents: number;
        availableSlots: number;
        recommendations: string[];
    };
}
