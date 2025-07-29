// client/src/components/rotinas/RotinaCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Eye, CopyPlus, User, Folder as FolderIcon, BookCopy } from 'lucide-react'; // Importado BookCopy
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';
import type { Pasta } from '@/pages/treinos/index';

interface RotinaCardProps {
  rotina: RotinaListagemItem;
  pastas: Pasta[];
  alunoNome?: string;
  onView: (rotina: RotinaListagemItem) => void;
  onEdit: (rotina: RotinaListagemItem) => void;
  onDelete: (rotina: RotinaListagemItem) => void;
  onAssign: (rotinaId: string, rotinaTitulo: string) => void;
  onMoveToFolder: (rotinaId: string, pastaId: string) => void;
  onRemoveFromFolder: (rotinaId: string) => void;
  onConvertToModel: (rotina: RotinaListagemItem) => void; // Nova prop para converter para modelo
}

export const RotinaCard: React.FC<RotinaCardProps> = ({ 
  rotina, 
  pastas,
  alunoNome, 
  onView, 
  onEdit, 
  onDelete, 
  onAssign,
  onMoveToFolder,
  onRemoveFromFolder,
  onConvertToModel // Nova prop
}) => {
  const isModelo = rotina.tipo === 'modelo';
  const diasDeTreinoCount = Array.isArray(rotina.diasDeTreino) ? rotina.diasDeTreino.length : 0;
  const pastaAtualId = typeof rotina.pastaId === 'object' ? rotina.pastaId?._id : rotina.pastaId;

  const outrasPastas = pastas.filter(p => p._id !== pastaAtualId);

  const ActionButton = ({ title, onClick, children, className }: { title: string, onClick: () => void, children: React.ReactNode, className?: string }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 w-8 p-0 transition-all duration-200 ${className}`} 
            onClick={onClick}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="group flex flex-col h-full shadow-md hover:shadow-xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors duration-200" title={rotina.titulo}>
          {/* Icon based on type */}
          <div className={`w-2 h-2 rounded-full ${isModelo ? 'bg-primary' : 'bg-accent'} animate-pulse`} />
          <span className="truncate">{rotina.titulo}</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground h-8 leading-relaxed" title={rotina.descricao ?? undefined}>
          {rotina.descricao || 'Sem descrição.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow pt-2 pb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant="secondary" 
            className="bg-gradient-to-r from-muted to-muted/50 border border-border/40 text-xs font-medium"
          >
            {`${diasDeTreinoCount} Dia${diasDeTreinoCount !== 1 ? 's' : ''}`}
          </Badge>
          <Badge 
            variant={isModelo ? 'outline' : 'default'} 
            className={
              isModelo 
                ? "border-primary/50 text-primary bg-primary/5 hover:bg-primary/10" 
                : "bg-gradient-to-r from-accent/90 to-accent text-accent-foreground border-transparent hover:from-accent hover:to-accent/90"
            }
          >
            {isModelo ? 'Modelo' : 'Individual'}
          </Badge>
        </div>
        
        {!isModelo && alunoNome && (
            <div className="flex items-center text-sm text-muted-foreground pt-1 bg-muted/30 rounded-lg p-2 border border-border/40">
                <User className="h-4 w-4 mr-2 shrink-0 text-accent" />
                <span className="truncate font-medium" title={alunoNome}>{alunoNome}</span>
            </div>
        )}
      </CardContent>

      <CardFooter className="p-3 border-t border-border/40 bg-gradient-to-r from-muted/20 to-muted/10 flex justify-between items-center gap-2 mt-auto rounded-b-lg">
        <div className="flex-1">
          {isModelo && (
            <Popover>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      >
                        <FolderIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Mover para Pasta</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-56 p-2 border border-border/60 bg-card/95 backdrop-blur-sm">
                <div className="grid gap-1">
                  <p className="font-semibold text-sm px-2 py-1.5 text-muted-foreground">Mover para...</p>
                  
                  {outrasPastas.length > 0 ? (
                    outrasPastas.map(p => (
                      <Button 
                        key={p._id} 
                        variant="ghost" 
                        className="w-full justify-start text-sm hover:bg-primary/10 hover:text-primary transition-colors" 
                        onClick={() => onMoveToFolder(rotina._id, p._id)}
                      >
                        {p.nome}
                      </Button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhuma outra pasta disponível.</p>
                  )}
                  {pastaAtualId && (
                    <>
                      <hr className="my-1 border-border/40"/>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors" 
                        onClick={() => onRemoveFromFolder(rotina._id)}
                      >
                        Remover da Pasta Atual
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex items-center gap-1">
          <ActionButton 
            title="Visualizar" 
            onClick={() => onView(rotina)}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <Eye className="h-4 w-4" />
          </ActionButton>
          
          {isModelo && (
            <ActionButton 
              title="Atribuir a Aluno" 
              onClick={() => onAssign(rotina._id, rotina.titulo)}
              className="hover:bg-secondary/10 hover:text-secondary"
            >
              <CopyPlus className="h-4 w-4" />
            </ActionButton>
          )}
          
          {!isModelo && (
            <ActionButton 
              title="Tornar Modelo" 
              onClick={() => onConvertToModel(rotina)}
              className="hover:bg-accent/10 hover:text-accent"
            >
              <BookCopy className="h-4 w-4" />
            </ActionButton>
          )}
          
          <ActionButton 
            title="Editar" 
            onClick={() => onEdit(rotina)}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <Edit className="h-4 w-4" />
          </ActionButton>
          
          <ActionButton 
            title="Excluir" 
            onClick={() => onDelete(rotina)} 
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </ActionButton>
        </div>
      </CardFooter>
    </Card>
  );
};
