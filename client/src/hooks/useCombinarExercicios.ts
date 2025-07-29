// client/src/hooks/useCombinarExercicios.ts
import { useCallback } from 'react';

export interface ExercicioParaCombinar {
  tempIdExercicio: string;
  exercicioId: string;
  nomeExercicio: string;
  grupoMuscular?: string;
  categoria?: string;
}

export const useCombinarExercicios = () => {
  
  // Gerar identificador único para grupo combinado
  const gerarIdGrupoCombinado = useCallback((): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `combo-${timestamp}-${random}`;
  }, []);

  // Verificar se exercícios podem ser combinados
  const podeCompriarExercicios = useCallback((exercicios: ExercicioParaCombinar[]): boolean => {
    return exercicios.length >= 2;
  }, []);

  // Agrupar exercícios por grupo combinado
  const agruparExerciciosPorCombinacao = useCallback((exercicios: any[]): { [key: string]: any[] } => {
    const grupos: { [key: string]: any[] } = {};
    const exerciciosIndividuais: any[] = [];

    exercicios.forEach(exercicio => {
      if (exercicio.grupoCombinado) {
        if (!grupos[exercicio.grupoCombinado]) {
          grupos[exercicio.grupoCombinado] = [];
        }
        grupos[exercicio.grupoCombinado].push(exercicio);
      } else {
        exerciciosIndividuais.push(exercicio);
      }
    });

    // Adicionar exercícios individuais com chave especial
    if (exerciciosIndividuais.length > 0) {
      grupos['__individuais__'] = exerciciosIndividuais;
    }

    return grupos;
  }, []);

  // Verificar se um exercício pertence a um grupo
  const exercicioPertenceAGrupo = useCallback((exercicio: any): boolean => {
    return !!(exercicio.grupoCombinado);
  }, []);

  // Obter exercícios de um grupo específico
  const obterExerciciosDoGrupo = useCallback((exercicios: any[], grupoCombinado: string): any[] => {
    return exercicios.filter(ex => ex.grupoCombinado === grupoCombinado);
  }, []);

  // Validar se exercícios selecionados podem ser combinados
  const validarCombinacao = useCallback((exerciciosSelecionados: ExercicioParaCombinar[]): { 
    valido: boolean; 
    erro?: string; 
  } => {
    if (exerciciosSelecionados.length < 2) {
      return { valido: false, erro: 'Selecione pelo menos 2 exercícios para combinar.' };
    }

    if (exerciciosSelecionados.length > 10) {
      return { valido: false, erro: 'Máximo de 10 exercícios por combinação.' };
    }

    return { valido: true };
  }, []);

  return {
    gerarIdGrupoCombinado,
    podeCompriarExercicios,
    agruparExerciciosPorCombinacao,
    exercicioPertenceAGrupo,
    obterExerciciosDoGrupo,
    validarCombinacao,
  };
};