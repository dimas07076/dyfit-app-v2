export interface Aluno {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    consumoFonte?: 'plano' | 'token';
    consumidoDoPlanoId?: string;
    consumidoDoTokenId?: string;
    validadeAcesso?: string;
    dataAssociacao?: string;
    status: 'active' | 'inactive';
}
export interface Personal {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}
export interface PersonalPlano {
    _id: string;
    personalId: string;
    planoTipo: 'Free' | 'Start' | 'Pro' | 'Elite' | 'Master';
    limiteAlunos: number;
    dataInicio: string;
    dataFim: string;
    status: 'ativo' | 'inativo' | 'expirado';
    preco?: number;
}
export interface TokenAvulso {
    _id: string;
    personalId: string;
    alunoId?: string;
    status: 'disponivel' | 'utilizado' | 'expirado';
    dataEmissao: string;
    dataExpiracao: string;
    preco?: number;
    adicionadoPorAdmin: string;
    motivoAdicao?: string;
}
export interface PlanoStatus {
    plano: any;
    personalPlano: any;
    limiteAtual: number;
    alunosAtivos: number;
    tokensAvulsos: number;
    percentualUso: number;
    podeAtivarMais: boolean;
    vagasDisponiveis: number;
    isExpired?: boolean;
}
export interface SlotInfo {
    fonte: 'plano' | 'token';
    planoId?: string;
    tokenId?: string;
    validadeAcesso: string;
}
export interface SlotAvailabilityResult {
    slotsDisponiveis: boolean;
    slotInfo?: SlotInfo;
    message: string;
    details?: {
        planoAtivo: boolean;
        limiteBasePlano: number;
        alunosAtivos: number;
        tokensDisponiveis: number;
        limiteTotal: number;
    };
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
export interface TokenStatusSummary {
    totalTokens: number;
    tokensDisponiveis: number;
    tokensUtilizados: number;
    tokensExpirados: number;
    tokens: TokenAvulso[];
}
export interface MaintenanceResult {
    plansExpired: number;
    tokensExpired: number;
    studentsDeactivated: number;
    timestamp: string;
}
