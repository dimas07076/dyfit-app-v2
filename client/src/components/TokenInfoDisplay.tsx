// client/src/components/TokenInfoDisplay.tsx
import React from 'react';
import { useTokenInfo, ITokenInfo } from '@/hooks/useTokenInfo';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, Ticket, Calendar, Info, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';

interface TokenInfoDisplayProps {
  studentId: string | null;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
  <div className="flex items-center text-sm py-2">
    <Icon className="h-4 w-4 mr-3 text-slate-500" />
    <span className="font-medium text-slate-600 dark:text-slate-400 w-28">{label}:</span>
    <span className="text-slate-900 dark:text-slate-100">{value}</span>
  </div>
);

const TokenInfoDisplay: React.FC<TokenInfoDisplayProps> = ({ studentId }) => {
  const { tokenInfo, isLoading, isError, error } = useTokenInfo(studentId);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30">
        <AlertCircle className="h-4 w-4 !text-red-600 dark:!text-red-400" />
        <AlertTitle className="text-red-800 dark:text-red-300">Token Não Associado</AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-400">
          Este aluno ainda não tem um plano ou token associado. O recurso será atribuído automaticamente ao ativar o aluno.
        </AlertDescription>
      </Alert>
    );
  }

  if (!tokenInfo) {
    return <p className="text-sm text-muted-foreground">Nenhuma informação de token para exibir.</p>;
  }

  return (
    <div className="space-y-2">
       <InfoRow 
         icon={Ticket} 
         label="Tipo" 
         value={<Badge variant={tokenInfo.tipo === 'plano' ? 'success' : 'secondary'}>{tokenInfo.tipo}</Badge>} 
       />
       <InfoRow 
         icon={ShieldCheck} 
         label="Status" 
         value={<Badge variant="success">Ativo</Badge>} 
       />
       <InfoRow 
         icon={Calendar} 
         label="Válido até" 
         value={formatDate(tokenInfo.dataExpiracao)} 
       />
       {tokenInfo.motivoAdicao && (
         <InfoRow 
           icon={Info} 
           label="Origem" 
           value={tokenInfo.motivoAdicao} 
         />
       )}
    </div>
  );
};

export default TokenInfoDisplay;