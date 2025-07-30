// client/src/components/rotinas/RotinaCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card className="group card-hover-lift flex flex-col h-full shadow-md border border-border/60 bg-amber-50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-bold text-zinc-800 flex items-center gap-2 group-hover:text-primary transition-colors duration-200 flex-1 min-w-0" title={rotina.titulo}>
            {/* Icon based on type */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isModelo ? 'bg-primary' : 'bg-accent'} animate-pulse`} />
            <span className="truncate">{rotina.titulo}</span>
          </CardTitle>
        </div>
        {rotina.descricao && (
          <CardDescription 
            className="text-xs text-zinc-500 leading-relaxed overflow-hidden"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis'
            }}
            title={rotina.descricao}
          >
            {rotina.descricao}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="flex-grow pt-2 pb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">
            {`${diasDeTreinoCount} Dia${diasDeTreinoCount !== 1 ? 's' : ''}`}
          </span>
          <span className={
            isModelo 
              ? "bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs" 
              : "bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs"
          }>
            {isModelo ? 'Modelo' : 'Individual'}
          </span>
        </div>
        
        {!isModelo && alunoNome && (
            <div className="flex items-center text-sm text-zinc-600 pt-1 bg-zinc-100 rounded-lg p-2 border border-zinc-200">
                <User className="h-4 w-4 mr-2 shrink-0 text-accent" />
                <span className="truncate font-medium" title={alunoNome}>{alunoNome}</span>
            </div>
        )}
      </CardContent>

      <CardFooter className="p-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center gap-2 mt-auto rounded-b-lg">
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

        <div className="flex items-center gap-1 flex-shrink-0">
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
