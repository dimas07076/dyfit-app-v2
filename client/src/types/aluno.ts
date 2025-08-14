// client/src/types/aluno.ts
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
  // Novos campos para saber se o aluno utiliza plano ou token avulso
  slotType?: 'plan' | 'token';
  slotId?: string;
  slotStartDate?: string;
  slotEndDate?: string;
}
