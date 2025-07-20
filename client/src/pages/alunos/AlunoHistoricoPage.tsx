// Caminho: ./client/src/pages/alunos/AlunoHistoricoPage.tsx
import { useState } from 'react';
import { useAluno } from '@/context/AlunoContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ArrowLeft, History, MessageSquareText, Star, AlertTriangle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Link as WouterLink } from 'wouter';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
// <<< ADIÇÃO: Importa o novo componente de modal que criamos >>>
import SessaoDetalheModal from '@/components/dialogs/SessaoDetalheModal'; 

// --- Interfaces e Helpers (sem alterações) ---
const OPCOES_PSE_FRONTEND = ['Muito Leve', 'Leve', 'Moderado', 'Intenso', 'Muito Intenso', 'Máximo Esforço'] as const;
type OpcaoPSEFrontend = typeof OPCOES_PSE_FRONTEND[number];

interface SessaoHistorico {
  _id: string;
  sessionDate: string; 
  concluidaEm: string; 
  tipoCompromisso: string; 
  status: string;
  rotinaId?: { 
    _id: string;
    titulo: string; 
  } | null;
  diaDeTreinoId?: string | null;
  diaDeTreinoIdentificador?: string | null; 
  nomeSubFichaDia?: string | null; 
  personalId?: { 
    _id: string;
    nome: string;
  } | null;
  pseAluno?: OpcaoPSEFrontend | null;
  comentarioAluno?: string | null;
}

interface HistoricoSessoesResponse {
  sessoes: SessaoHistorico[];
  currentPage: number;
  totalPages: number;
  totalSessoes: number;
}

const getPseBadgeVariant = (pse: OpcaoPSEFrontend | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
  if (!pse) return "secondary";
  switch (pse) {
    case 'Muito Leve': case 'Leve': return "default";
    case 'Moderado': return "secondary";
    case 'Intenso': case 'Muito Intenso': return "outline";
    case 'Máximo Esforço': return "destructive";
    default: return "secondary";
  }
};

const AlunoHistoricoPage: React.FC = () => {
  const { aluno } = useAluno();
  const [currentPage, setCurrentPage] = useState(1);
  const SESSIONS_PER_PAGE = 5;

  const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoHistorico | null>(null);

  const { 
    data: historicoData, 
    isLoading: isLoadingHistorico, 
    error: errorHistorico,
    isFetching: isFetchingHistorico,
  } = useQuery<HistoricoSessoesResponse, Error>({
    queryKey: ['alunoHistoricoSessoes', aluno?.id, currentPage, SESSIONS_PER_PAGE],
    queryFn: async () => {
      if (!aluno?.id) throw new Error("Aluno não autenticado.");
      return apiRequest<HistoricoSessoesResponse>(
        'GET', 
        `/api/aluno/meu-historico-sessoes?page=${currentPage}&limit=${SESSIONS_PER_PAGE}`
      );
    },
    enabled: !!aluno,
    placeholderData: (previousData) => previousData,
  });

  if (isLoadingHistorico && !historicoData) { 
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4"> <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" /> <p className="text-muted-foreground">Carregando seu histórico...</p> </div> );
  }

  const formatarDataHora = (dataISO?: string): string => {
    if (!dataISO) return 'N/A';
    try { return format(parseISO(dataISO), "dd/MM/yy 'às' HH:mm", { locale: ptBR }); }
    catch (e) { return 'Data inválida'; }
  };

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-6"><WouterLink href="/aluno/dashboard"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Painel</Button></WouterLink></div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-3"><History className="w-8 h-8" />Meu Histórico de Treinos</CardTitle>
          <CardDescription>Revise seus treinos concluídos e seu feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          {errorHistorico && (
            <div className="text-red-600 p-4 bg-red-50 rounded-md flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /><span>Erro: {errorHistorico.message}</span></div>
          )}
          {!isLoadingHistorico && !errorHistorico && (!historicoData || historicoData.sessoes.length === 0) && (
            <div className="text-center py-12"><p className="text-muted-foreground">Você ainda não concluiu nenhum treino.</p><p className="text-sm mt-2">Comece um treino no seu painel para ver seu progresso aqui!</p></div>
          )}

          {historicoData && historicoData.sessoes.length > 0 && (
            <div className="space-y-5 mt-4">
              {historicoData.sessoes.map(sessao => (
                <Card key={sessao._id} className="bg-card border shadow-sm">
                  <CardHeader className="flex flex-row justify-between items-start pb-3">
                    <div>
                      <CardTitle className="text-lg leading-tight">{sessao.rotinaId?.titulo || 'Sessão Avulsa'}</CardTitle>
                      <CardDescription className="text-sm mt-1">{sessao.diaDeTreinoIdentificador || 'Detalhes não especificados'}{sessao.nomeSubFichaDia && ` - ${sessao.nomeSubFichaDia}`}</CardDescription>
                    </div>
                    {sessao.rotinaId && sessao.diaDeTreinoId && (
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setSessaoSelecionada(sessao)}>
                        Ver Detalhes <Eye className="w-3 h-3 ml-1.5"/>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sessao.pseAluno && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-semibold text-sm">PSE:</span>
                        <Badge variant={getPseBadgeVariant(sessao.pseAluno)}>{sessao.pseAluno}</Badge>
                      </div>
                    )}
                    {sessao.comentarioAluno && (
                      <div className="flex items-start gap-2">
                        <MessageSquareText className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                        <div className="text-sm">
                          <span className="font-semibold">Seu comentário:</span>
                          <blockquote className="mt-1 text-xs italic text-muted-foreground border-l-2 pl-3">{sessao.comentarioAluno}</blockquote>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground pt-3 pb-4 border-t"><p>Finalizado em: {formatarDataHora(sessao.concluidaEm)}</p></CardFooter>
                </Card>
              ))}
            </div>
          )}

          {historicoData && historicoData.totalPages > 1 && (
            <div className="pt-6 flex items-center justify-between border-t mt-6">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isFetchingHistorico}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {historicoData.currentPage} de {historicoData.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(historicoData.totalPages, prev + 1))} disabled={currentPage === historicoData.totalPages || isFetchingHistorico}>Próxima <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* <<< ALTERAÇÃO: Placeholder substituído pela chamada ao modal real >>> */}
      <SessaoDetalheModal 
        sessao={sessaoSelecionada} 
        onClose={() => setSessaoSelecionada(null)} 
      />

    </div>
  );
};

export default AlunoHistoricoPage;