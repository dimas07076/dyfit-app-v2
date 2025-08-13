// shared/types.ts

// Interface básica para Aluno com novos campos de consumo
export interface Aluno {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    // Novos campos para controle de slots
    consumoFonte?: 'plano' | 'token';
    consumidoDoPlanoId?: string;
    consumidoDoTokenId?: string;
    validadeAcesso?: string; // ISO date string
    dataAssociacao?: string; // ISO date string
    status: 'active' | 'inactive';
}
  
// Interface básica para Personal
export interface Personal {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

// Interface para PersonalPlano
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

// Interface para TokenAvulso
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

// Interface para status de plano e consumo
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

// Interface para detalhes de slot
export interface SlotInfo {
    fonte: 'plano' | 'token';
    planoId?: string;
    tokenId?: string;
    validadeAcesso: string;
}

// Interface para resultado de verificação de slots
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
  
// Interface para os detalhes de um exercício dentro da ficha de treino do aluno
export interface ExercicioFichaAluno {
    exercicioId: { // Populated exercise details (assumindo que você popula)
      _id: string;
      nome: string;
      grupoMuscular: string;
      // Adicione outros campos do exercício que você popula
    };
    ordem: number;
    series: string;
    repeticoes: string;
    carga?: string;
    observacoes?: string;
}
  
// Interface para o documento da Ficha de Treino do Aluno
export interface IFichaTreinoAluno {
    _id: string;
    alunoId: string; // Pode ser string se não for populado, ou Aluno se for populado
    personalId: string; // Pode ser string se não for populado, ou Personal se for populado
    nome: string;
    descricao?: string;
    exercicios: ExercicioFichaAluno[];
    dataCriacao: string; // Use string se for ISO date string, ou Date se converter
    dataAtualizacao: string; // Use string se for ISO date string, ou Date se converter
}

// Interface para estatísticas de tokens
export interface TokenStatusSummary {
    totalTokens: number;
    tokensDisponiveis: number;
    tokensUtilizados: number;
    tokensExpirados: number;
    tokens: TokenAvulso[];
}

// Interface para relatório de manutenção
export interface MaintenanceResult {
    plansExpired: number;
    tokensExpired: number;
    studentsDeactivated: number;
    timestamp: string;
}
  
// Adicione outras interfaces compartilhadas aqui (Exercicio, FichaModelo, etc.)