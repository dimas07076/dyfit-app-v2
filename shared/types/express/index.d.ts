// shared/types/express/index.d.ts
// Este arquivo estende os tipos globais do Express para o projeto inteiro.

// Payload para Personal e Admin, com todas as propriedades usadas no middleware
interface UserPayload {
    id: string;
    role: 'personal' | 'admin';
    firstName: string; 
    lastName: string;  
    email: string;     
}

// Payload para Aluno, com todas as propriedades usadas no middleware
interface AlunoPayload {
    id: string;
    role: 'aluno';
    nome: string;
    email: string; // <<< ADICIONE ESTA LINHA
    personalId?: string;
}

// Sobrescreve o namespace 'Express' para adicionar nossos tipos customizados ao objeto Request
declare namespace Express {
  export interface Request {
    user?: UserPayload;
    aluno?: AlunoPayload;
  }
}