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
