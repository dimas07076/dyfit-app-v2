// client/src/components/rotinas/RotinaCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Eye, CopyPlus, User, Folder as FolderIcon, BookCopy, RotateCcw } from 'lucide-react'; // Importado BookCopy
import type { RotinaListagemItem } from '@/types/treinoOuRotinaTypes';
import type { Pasta } from '@/pages/treinos/index';
import { FullStatusIndicator } from '@/components/expiration';
import { calculateExpirationStatus } from '@/hooks/useRoutineExpiration';

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
  onRenew?: (rotina: RotinaListagemItem) => void; // Nova prop para renovar rotina
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
  onConvertToModel, // Nova prop
  onRenew // Nova prop para renovação
}) => {
  const isModelo = rotina.tipo === 'modelo';
  const diasDeTreinoCount = Array.isArray(rotina.diasDeTreino) ? rotina.diasDeTreino.length : 0;
  const pastaAtualId = typeof rotina.pastaId === 'object' ? rotina.pastaId?._id : rotina.pastaId;

  const outrasPastas = pastas.filter(p => p._id !== pastaAtualId);

  // Check expiration status for individual routines
  const expirationStatus = !isModelo ? calculateExpirationStatus(rotina) : null;
  const needsRenewal = expirationStatus && (expirationStatus.status === 'expiring' || expirationStatus.status === 'expired');

  const ActionButton = ({ title, onClick, children, className }: { title: string, onClick: () => void, children: React.ReactNode, className?: string }) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${className}`} onClick={onClick}>{children}</Button>
        </TooltipTrigger>
        <TooltipContent><p>{title}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-200 dark:bg-slate-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold truncate text-slate-800 dark:text-slate-100" title={rotina.titulo}>{rotina.titulo}</CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 h-8 line-clamp-2" title={rotina.descricao ?? undefined}>{rotina.descricao || 'Sem descrição.'}</CardDescription>
          </div>
          {/* Expiration Status Indicator for Individual Routines */}
          {!isModelo && rotina.dataValidade && (
            <div className="flex-shrink-0">
              <FullStatusIndicator routine={rotina} />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow pt-2 pb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{`${diasDeTreinoCount} Dia(s)`}</Badge>
          {/* <<< CORREÇÃO 2: Ajuste de cor e estilo da Badge "Individual" para consistência >>> */}
          <Badge variant={isModelo ? 'outline' : 'default'} className={
            isModelo 
              ? "border-primary text-primary" 
              : "bg-teal-100 text-teal-800 border-transparent hover:bg-teal-100/80 dark:bg-teal-900/50 dark:text-teal-300"
          }>
            {isModelo ? 'Modelo' : 'Individual'}
          </Badge>
        </div>
        
        {!isModelo && alunoNome && (
            <div className="flex items-center text-sm text-muted-foreground pt-1">
                <User className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate" title={alunoNome}>{alunoNome}</span>
            </div>
        )}

      </CardContent>

      <CardFooter className="p-2 border-t dark:border-slate-700 flex justify-between items-center gap-1 mt-auto">
        <div className="flex-1">
          {isModelo && (
            <Popover>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <FolderIcon className="h-4 w-4 text-slate-500" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Mover para Pasta</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-56 p-2">
                <div className="grid gap-1">
                  <p className="font-semibold text-sm px-2 py-1.5 text-muted-foreground">Mover para...</p>
                  
                  {outrasPastas.length > 0 ? (
                    outrasPastas.map(p => (
                      <Button key={p._id} variant="ghost" className="w-full justify-start text-sm" onClick={() => onMoveToFolder(rotina._id, p._id)}>
                        {p.nome}
                      </Button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhuma outra pasta disponível.</p>
                  )}
                  {pastaAtualId && (
                    <>
                      <hr className="my-1"/>
                      <Button variant="ghost" className="w-full justify-start text-sm text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50" onClick={() => onRemoveFromFolder(rotina._id)}>
                        Remover da Pasta Atual
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex justify-end">
          <ActionButton title="Visualizar" onClick={() => onView(rotina)}><Eye className="h-4 w-4 text-slate-500" /></ActionButton>
          {isModelo && <ActionButton title="Atribuir a Aluno" onClick={() => onAssign(rotina._id, rotina.titulo)}><CopyPlus className="h-4 w-4 text-slate-500" /></ActionButton>}
          {/* Botão de renovação para rotinas individuais que precisam */}
          {!isModelo && needsRenewal && onRenew && (
            <ActionButton 
              title="Renovar Rotina" 
              onClick={() => onRenew(rotina)}
              className="text-orange-500/80 hover:text-orange-500"
            >
              <RotateCcw className="h-4 w-4" />
            </ActionButton>
          )}
          {/* Novo botão para converter rotina individual em modelo */}
          {!isModelo && (
            <ActionButton 
              title="Tornar Modelo" 
              onClick={() => onConvertToModel(rotina)} // Chama a nova prop
              className="text-primary/80 hover:text-primary" // Estilo para destacar
            >
              <BookCopy className="h-4 w-4" /> {/* Ícone de livro/cópia */}
            </ActionButton>
          )}
          <ActionButton title="Editar" onClick={() => onEdit(rotina)}><Edit className="h-4 w-4 text-slate-500" /></ActionButton>
          <ActionButton title="Excluir" onClick={() => onDelete(rotina)} className="text-red-500/80 hover:text-red-500"><Trash2 className="h-4 w-4" /></ActionButton>
        </div>
      </CardFooter>
    </Card>
  );
};
