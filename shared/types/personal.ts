// shared/types/personal.ts

// <<< INÍCIO DA ALTERAÇÃO: Nova interface para os dados do aluno no modal >>>
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
// <<< FIM DA ALTERAÇÃO >>>

// Interface para os detalhes completos de um PersonalTrainer, como retornado pela API (sem campos sensíveis)
export interface PersonalDetalhes {
    _id: string;
    nome: string;
    email: string;
    role: 'Personal Trainer' | 'Admin'; // Roles permitidas
    tokenCadastroAluno?: string;
    statusAssinatura?: 'ativa' | 'inativa' | 'pendente_pagamento' | 'cancelada' | 'trial' | 'sem_assinatura';
    limiteAlunos?: number;
    dataInicioAssinatura?: string | Date; 
    dataFimAssinatura?: string | Date;
    idAssinaturaGateway?: string;
    planoId?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    // <<< INÍCIO DA ALTERAÇÃO: Adiciona a lista de alunos à interface >>>
    alunos?: AlunoParaModal[];
    // <<< FIM DA ALTERAÇÃO >>>
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
    
  // Interface para os itens listados na tabela de personais (pode ser um subconjunto de PersonalDetalhes)
  export interface PersonalListadoItem {
    _id: string;
    nome: string;
    email: string;
    role: 'Personal Trainer' | 'Admin';
    createdAt: string | Date; 
    statusAssinatura?: string;
  }