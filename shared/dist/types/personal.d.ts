export interface AlunoParaModal {
    _id: string;
    nome: string;
    email: string;
    status: 'active' | 'inactive';
    slotType?: 'plan' | 'token';
    slotId?: string;
    slotStartDate?: string | Date;
    slotEndDate?: string | Date;
}
export interface PersonalDetalhes {
    _id: string;
    nome: string;
    email: string;
    role: 'Personal Trainer' | 'Admin';
    tokenCadastroAluno?: string;
    statusAssinatura?: 'ativa' | 'inativa' | 'pendente_pagamento' | 'cancelada' | 'trial' | 'sem_assinatura';
    limiteAlunos?: number;
    dataInicioAssinatura?: string | Date;
    dataFimAssinatura?: string | Date;
    idAssinaturaGateway?: string;
    planoId?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    alunos?: AlunoParaModal[];
    plano?: {
        _id: string;
        nome: string;
        descricao?: string;
        limiteAlunos: number;
        preco: number;
        duracao: number;
        tipo: string;
    };
}
export interface PersonalListadoItem {
    _id: string;
    nome: string;
    email: string;
    role: 'Personal Trainer' | 'Admin';
    createdAt: string | Date;
    statusAssinatura?: string;
}
