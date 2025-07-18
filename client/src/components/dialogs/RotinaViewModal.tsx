// client/src/components/dialogs/RotinaViewModal.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Edit, CopyPlus, User, Folder, Info, Clock, PlayCircle } from 'lucide-react';
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RotinaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rotina: RotinaListagemItem | null;
  onEdit: (rotina: RotinaListagemItem) => void;
  onAssign: (rotinaId: string, rotinaTitulo: string) => void;
  onPlayVideo: (url: string) => void;
}

const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return 'Data inválida';
    }
};

const RotinaViewModal: React.FC<RotinaViewModalProps> = ({ isOpen, onClose, rotina, onEdit, onAssign, onPlayVideo }) => {
  if (!isOpen || !rotina) return null;

  const isModelo = rotina.tipo === 'modelo';
  const alunoNome = typeof rotina.alunoId === 'object' && rotina.alunoId?.nome ? rotina.alunoId.nome : 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Dumbbell className="h-7 w-7 text-primary" />
            {rotina.titulo}
          </DialogTitle>
          <DialogDescription>{rotina.descricao || "Visualização detalhada da rotina de treino."}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow p-6 overflow-y-auto">
          <Card className="mb-6 bg-slate-50 dark:bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><Info className="h-5 w-5 mr-2"/>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                {/* <<< CORREÇÃO 2: Ajuste de cor e estilo da Badge "Individual" >>> */}
                <Badge variant={isModelo ? 'outline' : 'default'} className={
                  isModelo 
                    ? "border-purple-400 text-purple-600 dark:border-purple-600 dark:text-purple-400" 
                    : "bg-teal-100 text-teal-800 border-transparent hover:bg-teal-100/80 dark:bg-teal-900/50 dark:text-teal-300"
                }>
                  {isModelo ? <Folder className="h-3 w-3 mr-1.5"/> : <User className="h-3 w-3 mr-1.5"/>}
                  {isModelo ? 'Modelo' : 'Individual'}
                </Badge>
              </div>
              {!isModelo && <div className="font-medium"><strong>Aluno:</strong> {alunoNome}</div>}
              <div><strong>Dias de Treino:</strong> {rotina.diasDeTreino?.length || 0}</div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Clock className="h-4 w-4"/>
                <span>Criada em: {formatDate(rotina.criadoEm)}</span>
              </div>
              {rotina.atualizadoEm && new Date(rotina.criadoEm || 0).getTime() !== new Date(rotina.atualizadoEm).getTime() && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4"/>
                    <span>Atualizada em: {formatDate(rotina.atualizadoEm)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Accordion type="multiple" className="w-full space-y-3">
            {(rotina.diasDeTreino || []).sort((a,b) => a.ordemNaRotina - b.ordemNaRotina).map(dia => (
              <AccordionItem key={dia._id} value={dia._id || dia.identificadorDia} className="border dark:border-slate-700 rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:no-underline font-semibold">
                  {dia.identificadorDia} {dia.nomeSubFicha && <span className="font-normal text-muted-foreground ml-2">- {dia.nomeSubFicha}</span>}
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  {dia.exerciciosDoDia && dia.exerciciosDoDia.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Exercício</TableHead>
                          <TableHead className="text-center w-[70px]">Séries</TableHead>
                          <TableHead className="text-center w-[70px]">Reps</TableHead>
                          <TableHead>Carga</TableHead>
                          <TableHead className="pr-4">Descanso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* <<< CORREÇÃO 1: Adicionado .filter() para remover exercícios nulos da visualização >>> */}
                        {(dia.exerciciosDoDia || []).filter(ex => ex.exercicioId).sort((a,b) => a.ordemNoDia - b.ordemNoDia).map(ex => {
                            const exercicioDetalhes = typeof ex.exercicioId === 'object' ? ex.exercicioId : null;
                            return (
                                <TableRow key={ex._id}>
                                    <TableCell className="font-medium pl-4 flex items-center gap-2">
                                        {exercicioDetalhes?.nome}
                                        {exercicioDetalhes?.urlVideo && (
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPlayVideo(exercicioDetalhes.urlVideo!)}>
                                                            <PlayCircle className="h-4 w-4 text-primary opacity-60 hover:opacity-100" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Ver vídeo</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">{ex.series || '-'}</TableCell>
                                    <TableCell className="text-center">{ex.repeticoes || '-'}</TableCell>
                                    <TableCell>{ex.carga || '-'}</TableCell>
                                    <TableCell className="pr-4">{ex.descanso || '-'}</TableCell>
                                </TableRow>
                            );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground p-4">
                      Nenhum exercício cadastrado para este dia.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <DialogFooter className="p-4 border-t flex-wrap justify-end gap-2">
          {isModelo && <Button onClick={() => onAssign(rotina._id, rotina.titulo)} className="bg-green-600 hover:bg-green-700"><CopyPlus className="w-4 h-4 mr-2"/>Usar este Modelo</Button>}
          <Button variant="outline" onClick={() => onEdit(rotina)}><Edit className="w-4 h-4 mr-2"/>Editar Rotina</Button>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RotinaViewModal;