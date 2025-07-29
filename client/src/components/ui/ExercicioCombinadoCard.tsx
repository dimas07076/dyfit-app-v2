// client/src/components/ui/ExercicioCombinadoCard.tsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Zap, ArrowRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExercicioCombinado {
  tempIdExercicio: string;
  nomeExercicio: string;
  grupoMuscular?: string;
  categoria?: string;
  series?: string;
  repeticoes?: string;
  carga?: string;
  descanso?: string;
  observacoes?: string;
  ordemNoDia: number;
}

interface ExercicioCombinadoCardProps {
  ejercicios: ExercicioCombinado[];
  grupoId: string;
  onRemoveGrupo?: () => void;
  onRemoveExercicio?: (tempIdExercicio: string) => void;
  modo?: 'prescrição' | 'visualização';
  className?: string;
}

export default function ExercicioCombinadoCard({
  ejercicios,
  grupoId,
  onRemoveGrupo,
  onRemoveExercicio,
  modo = 'visualização',
  className,
}: ExercicioCombinadoCardProps) {
  
  const isPrescricao = modo === 'prescrição';
  
  // Ordenar exercícios por ordem no dia
  const exerciciosOrdenados = [...ejercicios].sort((a, b) => a.ordemNoDia - b.ordemNoDia);

  return (
    <Card className={cn(
      "relative border-2 border-dashed border-primary/40 bg-gradient-to-r from-primary/5 to-secondary/5",
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Cabeçalho do grupo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-primary">
              <Link2 className="w-4 h-4" />
              <Zap className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">
                Exercícios Combinados
              </span>
              <span className="text-xs text-muted-foreground">
                Executar em sequência direta
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {exerciciosOrdenados.length} exercícios
            </Badge>
          </div>
          
          {isPrescricao && onRemoveGrupo && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
              onClick={onRemoveGrupo}
              title="Desfazer combinação"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Lista de exercícios combinados */}
        <div className="space-y-3">
          {exerciciosOrdenados.map((exercicio, index) => (
            <div key={exercicio.tempIdExercicio} className="relative">
              <Card className="bg-background/80 border border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow space-y-2">
                      {/* Nome e badges do exercício */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">
                            {exercicio.nomeExercicio}
                          </span>
                        </div>
                        
                        {exercicio.grupoMuscular && (
                          <Badge variant="outline" className="text-xs">
                            {exercicio.grupoMuscular}
                          </Badge>
                        )}
                        
                        {exercicio.categoria && (
                          <Badge variant="secondary" className="text-xs">
                            {exercicio.categoria}
                          </Badge>
                        )}
                      </div>

                      {/* Detalhes do exercício */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {exercicio.series && (
                          <div>
                            <span className="font-medium text-muted-foreground">Séries:</span>
                            <span className="ml-1">{exercicio.series}</span>
                          </div>
                        )}
                        {exercicio.repeticoes && (
                          <div>
                            <span className="font-medium text-muted-foreground">Reps:</span>
                            <span className="ml-1">{exercicio.repeticoes}</span>
                          </div>
                        )}
                        {exercicio.carga && (
                          <div>
                            <span className="font-medium text-muted-foreground">Carga:</span>
                            <span className="ml-1">{exercicio.carga}</span>
                          </div>
                        )}
                        {exercicio.descanso && (
                          <div>
                            <span className="font-medium text-muted-foreground">Desc:</span>
                            <span className="ml-1">{exercicio.descanso}</span>
                          </div>
                        )}
                      </div>

                      {exercicio.observacoes && (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          <span className="font-medium">Obs:</span> {exercicio.observacoes}
                        </div>
                      )}
                    </div>

                    {isPrescricao && onRemoveExercicio && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 ml-2"
                        onClick={() => onRemoveExercicio(exercicio.tempIdExercicio)}
                        title="Remover exercício do grupo"
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Seta indicando sequência (não no último exercício) */}
              {index < exerciciosOrdenados.length - 1 && (
                <div className="flex justify-center my-1">
                  <div className="flex items-center gap-1 text-primary/60">
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-xs font-medium">SEM DESCANSO</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Instrução final */}
        <div className="flex items-center justify-center p-2 bg-primary/10 rounded border border-primary/20">
          <div className="flex items-center gap-2 text-primary text-xs font-medium">
            <Zap className="w-3 h-3" />
            <span>Execute todos os exercícios em sequência, depois descanse</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}