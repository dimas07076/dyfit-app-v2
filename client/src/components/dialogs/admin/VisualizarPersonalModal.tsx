// client/src/components/dialogs/admin/VisualizarPersonalModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCircle, Mail, ShieldCheck, CalendarDays, Link2, Users, BarChartHorizontalBig, Info, Crown, Zap, Clock, XCircle } from 'lucide-react';
// <<< INÍCIO DA ALTERAÇÃO: Importa os tipos do local compartilhado >>>
import { PersonalDetalhes, AlunoParaModal } from '@shared/types/personal';
// <<< FIM DA ALTERAÇÃO >>>


interface VisualizarPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  personal: PersonalDetalhes | null;
  isLoading?: boolean;
  // <<< INÍCIO DA ALTERAÇÃO: A prop agora usa o tipo importado >>>
  alunosDoPersonal: AlunoParaModal[];
  // <<< FIM DA ALTERAÇÃO >>>
}

const formatDate = (dateString?: Date | string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Data inválida';
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch (e) {
    return String(dateString);
  }
};

const InfoItem: React.FC<{ label: string; value?: string | number | React.ReactNode; isMonospace?: boolean; icon?: React.ReactNode }> = ({ label, value, isMonospace, icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center min-w-[160px] sm:min-w-fit mb-1 sm:mb-0">
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      {label}:
    </dt>
    <dd className={`text-sm text-gray-900 dark:text-gray-100 sm:text-right ${isMonospace ? 'font-mono text-xs break-all' : 'break-words'}`}>
      {value ?? <span className="text-gray-400 dark:text-gray-500 italic">Não informado</span>}
    </dd>
  </div>
);

const AlunoAssociationCard: React.FC<{ aluno: AlunoParaModal }> = ({ aluno }) => {
    const getSlotIcon = () => {
        if (aluno.status === 'inactive') return <XCircle className="h-4 w-4 text-gray-500" />;
        if (aluno.slotType === 'plan') return <Crown className="h-4 w-4 text-purple-500" />;
        if (aluno.slotType === 'token') return <Zap className="h-4 w-4 text-yellow-500" />;
        return <Info className="h-4 w-4 text-gray-500" />;
    };
    const getSlotLabel = () => {
        if (aluno.status === 'inactive') return 'Inativo';
        if (aluno.slotType === 'plan') return 'Vaga do Plano';
        if (aluno.slotType === 'token') return 'Token Avulso';
        return 'Não associado';
    };
    const getSlotColorClass = () => {
        if (aluno.status === 'inactive') return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
        if (aluno.slotType === 'plan') return 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
        if (aluno.slotType === 'token') return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    };

    return (
        <div className={`p-3 rounded-lg border ${getSlotColorClass()}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-sm">{aluno.nome}</p>
                    <p className="text-xs text-muted-foreground">{aluno.email}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium">
                    {getSlotIcon()}
                    {getSlotLabel()}
                </div>
            </div>
            {aluno.status === 'active' && aluno.slotEndDate && (
                 <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Expira em: {formatDate(aluno.slotEndDate)}</span>
                 </div>
            )}
        </div>
    );
};

export default function VisualizarPersonalModal({ isOpen, onClose, personal, isLoading, alunosDoPersonal }: VisualizarPersonalModalProps) {
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <UserCircle className="mr-3 h-7 w-7 text-primary" />
            Detalhes do Personal Trainer
          </DialogTitle>
          {personal && !isLoading && (
            <DialogDescription>
              Informações detalhadas sobre {personal.nome}.
            </DialogDescription>
          )}
        </DialogHeader>
        
        {isLoading && (
          <div className="py-12 flex flex-col justify-center items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="mt-3 text-gray-600 dark:text-gray-400">Carregando detalhes...</span>
          </div>
        )}

        {!isLoading && personal && (
          <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto pr-3 -mr-3 custom-scrollbar">
            {/* --- SEÇÃO DE DADOS GERAIS --- */}
            <InfoItem label="Nome Completo" value={personal.nome} icon={<UserCircle className="h-4 w-4 text-gray-500"/>} />
            <InfoItem label="Email" value={personal.email} icon={<Mail className="h-4 w-4 text-gray-500"/>} />
            <InfoItem 
              label="Função (Role)" 
              icon={<ShieldCheck className="h-4 w-4 text-gray-500"/>}
              value={
                <Badge variant={personal.role === 'Admin' ? 'destructive' : 'default'}
                       className={`font-medium ${personal.role === 'Admin' ? 
                                  'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border-red-300 dark:border-red-700' : 
                                  'bg-blue-100 text-blue-700 dark:bg-sky-900/60 dark:text-sky-300 border-blue-300 dark:border-sky-700'}`}>
                  {personal.role === 'Admin' && <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                  {personal.role}
                </Badge>
              }
            />
            <InfoItem label="Data de Cadastro" value={formatDate(personal.createdAt)} icon={<CalendarDays className="h-4 w-4 text-gray-500"/>} />
            
            {/* --- SEÇÃO DE ASSINATURA --- */}
            <h3 className="text-md font-semibold pt-4 text-gray-700 dark:text-gray-300 border-t mt-4">Assinatura</h3>
            <InfoItem label="Status" icon={<Info className="h-4 w-4 text-gray-500"/>} value={<Badge variant={personal.statusAssinatura === 'ativa' ? 'success' : 'secondary'}>{personal.statusAssinatura || 'Não definida'}</Badge>} />
            <InfoItem label="Plano" value={personal.plano?.nome || 'Não definido'} icon={<BarChartHorizontalBig className="h-4 w-4 text-gray-500"/>} />
            <InfoItem label="Limite de Alunos" value={personal.limiteAlunos} icon={<Users className="h-4 w-4 text-gray-500"/>} />
            <InfoItem label="Fim da Assinatura" value={formatDate(personal.dataFimAssinatura)} icon={<CalendarDays className="h-4 w-4 text-gray-500"/>} />
            
            {/* <<< INÍCIO DA ALTERAÇÃO: Nova seção para listar alunos e seus slots >>> */}
            <h3 className="text-md font-semibold pt-4 text-gray-700 dark:text-gray-300 border-t mt-4">Alunos Associados ({alunosDoPersonal.length})</h3>
            <div className="space-y-2">
                {alunosDoPersonal.length > 0 ? (
                    alunosDoPersonal.map(aluno => (
                        <AlunoAssociationCard key={aluno._id} aluno={aluno} />
                    ))
                ) : (
                    <p className="text-sm text-center text-muted-foreground py-4">Nenhum aluno associado.</p>
                )}
            </div>
            {/* <<< FIM DA ALTERAÇÃO >>> */}

            {personal.tokenCadastroAluno && (
              <>
                <h3 className="text-md font-semibold pt-4 text-gray-700 dark:text-gray-300 border-t mt-4">Link de Cadastro</h3>
                <InfoItem label="Token" value={personal.tokenCadastroAluno} isMonospace icon={<Link2 className="h-4 w-4 text-gray-500"/>} />
              </>
            )}
          </div>
        )}

        {!isLoading && !personal && isOpen && (
             <div className="py-8 text-center text-gray-500 dark:text-gray-400">Não foi possível carregar os dados do personal.</div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}