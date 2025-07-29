// client/src/components/dialogs/CombinarExerciciosModal.tsx
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCombinarExercicios, ExercicioParaCombinar } from '@/hooks/useCombinarExercicios';
import { Loader2, Link2, Users, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CombinarExerciciosModalProps {
  open: boolean;
  onClose: () => void;
  exerciciosDisponiveis: ExercicioParaCombinar[];
  onExerciciosCombinados: (exerciciosSelecionados: ExercicioParaCombinar[], grupoId: string) => void;
}

export default function CombinarExerciciosModal({
  open,
  onClose,
  exerciciosDisponiveis,
  onExerciciosCombinados,
}: CombinarExerciciosModalProps) {
  const { toast } = useToast();
  const { gerarIdGrupoCombinado, validarCombinacao } = useCombinarExercicios();
  
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtrar apenas exercícios que ainda não estão em grupos
  const exerciciosDisponiveisParaCombinar = useMemo(() => {
    return exerciciosDisponiveis.filter(ex => !ex.tempIdExercicio.includes('combo-'));
  }, [exerciciosDisponiveis]);

  const handleExercicioToggle = (tempIdExercicio: string) => {
    setExerciciosSelecionados(prev => {
      if (prev.includes(tempIdExercicio)) {
        return prev.filter(id => id !== tempIdExercicio);
      } else {
        return [...prev, tempIdExercicio];
      }
    });
  };

  const exerciciosParaCombinar = useMemo(() => {
    return exerciciosDisponiveisParaCombinar.filter(ex => 
      exerciciosSelecionados.includes(ex.tempIdExercicio)
    );
  }, [exerciciosDisponiveisParaCombinar, exerciciosSelecionados]);

  const resultadoValidacao = useMemo(() => {
    return validarCombinacao(exerciciosParaCombinar);
  }, [exerciciosParaCombinar, validarCombinacao]);

  const handleConfirmar = async () => {
    if (!resultadoValidacao.valido) {
      toast({
        title: "Erro na Combinação",
        description: resultadoValidacao.erro,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const grupoId = gerarIdGrupoCombinado();
      onExerciciosCombinados(exerciciosParaCombinar, grupoId);
      
      toast({
        title: "Exercícios Combinados!",
        description: `${exerciciosParaCombinar.length} exercícios foram agrupados para execução em sequência.`,
      });
      
      // Reset e fechar
      setExerciciosSelecionados([]);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível combinar os exercícios. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setExerciciosSelecionados([]);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(openStatus) => { if (!openStatus) handleCancel(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Combinar Exercícios
          </DialogTitle>
          <DialogDescription>
            Selecione 2 ou mais exercícios para executar em sequência direta, sem descanso entre eles.
            Esta é uma funcionalidade visual para orientar o aluno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto space-y-4">
          {exerciciosDisponiveisParaCombinar.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Não há exercícios disponíveis para combinar. Adicione exercícios ao dia de treino primeiro.
              </AlertDescription>
            </Alert>
          )}

          {exerciciosDisponiveisParaCombinar.length > 0 && (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Exercícios Disponíveis ({exerciciosDisponiveisParaCombinar.length})
                </h4>
                
                {exerciciosDisponiveisParaCombinar.map((exercicio) => (
                  <Card key={exercicio.tempIdExercicio} className="p-3">
                    <CardContent className="p-0">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={exercicio.tempIdExercicio}
                          checked={exerciciosSelecionados.includes(exercicio.tempIdExercicio)}
                          onCheckedChange={() => handleExercicioToggle(exercicio.tempIdExercicio)}
                        />
                        <div className="flex-grow">
                          <label 
                            htmlFor={exercicio.tempIdExercicio}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {exercicio.nomeExercicio}
                          </label>
                          <div className="flex gap-2 mt-1">
                            {exercicio.grupoMuscular && (
                              <Badge variant="secondary" className="text-xs">
                                {exercicio.grupoMuscular}
                              </Badge>
                            )}
                            {exercicio.categoria && (
                              <Badge variant="outline" className="text-xs">
                                {exercicio.categoria}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {exerciciosSelecionados.length > 0 && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Exercícios Selecionados ({exerciciosSelecionados.length})
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {exerciciosParaCombinar.map((exercicio, index) => (
                      <Badge key={exercicio.tempIdExercicio} variant="default" className="text-xs">
                        {index + 1}. {exercicio.nomeExercicio}
                      </Badge>
                    ))}
                  </div>

                  {!resultadoValidacao.valido && (
                    <Alert className="mt-3" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {resultadoValidacao.erro}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={!resultadoValidacao.valido || isProcessing || exerciciosDisponiveisParaCombinar.length === 0}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Combinar Exercícios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}