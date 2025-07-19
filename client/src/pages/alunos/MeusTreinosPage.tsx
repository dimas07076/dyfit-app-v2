// client/src/pages/alunos/MeusTreinosPage.tsx
import React, { useState, useEffect } from 'react';
import { useAluno } from '../../context/AlunoContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Loader2, AlertTriangle, ListChecks, Star, Eye, ArrowLeft } from 'lucide-react';
// <<< CORREÇÃO: Removido o import não utilizado 'Link as WouterLink' >>>
import { useLocation } from 'wouter';
import { format, parseISO, isValid as isDateValidFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces (Estrutura de dados deve ser consistente com o resto do app)
interface RotinaDeTreinoAluno {
  _id: string;
  titulo: string;
  descricao?: string;
  tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre';
  criadorId?: { _id: string; nome: string; } | string;
  dataValidade?: string | null;
  totalSessoesRotinaPlanejadas?: number | null;
  sessoesRotinaConcluidas: number;
  criadoEm: string;
  atualizadoEm?: string;
}

const MeusTreinosPage: React.FC = () => {
  const { aluno, tokenAluno } = useAluno();
  const [, navigate] = useLocation();

  const [activeRotinaId, setActiveRotinaId] = useState<string | null>(() => {
    return localStorage.getItem(`activeRotinaId_${aluno?.id}`);
  });

  const {
    data: minhasRotinas,
    isLoading: isLoadingRotinas,
    error: errorRotinas,
  } = useQuery<RotinaDeTreinoAluno[], Error>({
    queryKey: ['minhasRotinasAluno', aluno?.id],
    queryFn: async () => {
      if (!aluno?.id) throw new Error("Aluno não autenticado.");
      const rotinas = await apiRequest<RotinaDeTreinoAluno[]>('GET', '/api/aluno/meus-treinos');
      return rotinas.sort((a, b) => new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime());
    },
    enabled: !!aluno && !!tokenAluno,
  });

  useEffect(() => {
    if (minhasRotinas && minhasRotinas.length > 0) {
      const rotinaAtivaExiste = minhasRotinas.some(r => r._id === activeRotinaId);
      if (!activeRotinaId || !rotinaAtivaExiste) {
        const defaultActiveId = minhasRotinas[0]._id;
        setActiveRotinaId(defaultActiveId);
        if (aluno?.id) {
          localStorage.setItem(`activeRotinaId_${aluno.id}`, defaultActiveId);
        }
      }
    }
  }, [minhasRotinas, activeRotinaId, aluno?.id]);

  const handleSetRotinaAtiva = (id: string) => {
    setActiveRotinaId(id);
    if (aluno?.id) {
      localStorage.setItem(`activeRotinaId_${aluno.id}`, id);
    }
  };

  const formatarDataSimples = (dataISO?: string | null): string => {
    if (!dataISO) return 'N/A';
    try {
      const dateObj = parseISO(dataISO);
      return isDateValidFn(dateObj) ? format(dateObj, "dd/MM/yyyy", { locale: ptBR }) : 'Data inválida';
    } catch (e) {
      return 'Data inválida';
    }
  };

  if (isLoadingRotinas) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3">Carregando suas rotinas...</span>
      </div>
    );
  }

  if (errorRotinas) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-red-600 bg-red-50 p-4 rounded-md flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>Erro ao carregar rotinas: {errorRotinas.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => navigate('/aluno/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
         </Button>
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Minhas Rotinas de Treino</h1>
            <p className="text-md text-muted-foreground">Veja todas as suas fichas e escolha qual deseja seguir.</p>
        </div>
      </div>

      {minhasRotinas && minhasRotinas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {minhasRotinas.map((rotina) => {
            const isAtiva = rotina._id === activeRotinaId;
            const progresso = rotina.totalSessoesRotinaPlanejadas 
              ? (rotina.sessoesRotinaConcluidas / rotina.totalSessoesRotinaPlanejadas) * 100
              : 0;

            return (
              <Card key={rotina._id} className={`flex flex-col transition-all hover:shadow-xl ${isAtiva ? 'border-2 border-primary' : 'border'}`}>
                <CardHeader>
                  {isAtiva && (
                     <div className="flex items-center gap-2 text-sm font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full mb-2 w-fit-content">
                        <Star className="w-4 h-4" />
                        <span>Rotina Ativa</span>
                    </div>
                  )}
                  <CardTitle>{rotina.titulo}</CardTitle>
                  <CardDescription>{rotina.descricao || 'Sem descrição detalhada.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3 text-sm text-muted-foreground">
                    {rotina.totalSessoesRotinaPlanejadas != null && (
                        <div>
                             <p className="font-medium text-xs mb-1">
                                Progresso: <strong>{rotina.sessoesRotinaConcluidas}</strong> de <strong>{rotina.totalSessoesRotinaPlanejadas}</strong> sessões
                            </p>
                            <Progress value={progresso} className="h-2" />
                        </div>
                    )}
                    <p><strong>Organização:</strong> <span className="capitalize">{rotina.tipoOrganizacaoRotina}</span></p>
                    {rotina.dataValidade && <p><strong>Válida até:</strong> {formatarDataSimples(rotina.dataValidade)}</p>}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                   <Button 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={() => navigate(`/aluno/ficha/${rotina._id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  <Button 
                    className="w-full sm:w-auto"
                    disabled={isAtiva}
                    onClick={() => handleSetRotinaAtiva(rotina._id)}
                  >
                    <Star className={`w-4 h-4 mr-2 ${isAtiva ? 'text-yellow-400 fill-current' : ''}`} />
                    {isAtiva ? "Já está Ativa" : "Tornar Ativa"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-md text-center py-12">
            <CardHeader>
                <CardTitle className="flex justify-center items-center text-xl"><ListChecks className="w-8 h-8 mr-3 text-gray-400" /></CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-lg text-muted-foreground">Nenhuma rotina de treino foi encontrada para você.</p>
                <p className="text-sm mt-2">Fale com seu personal trainer para que ele possa criar uma ficha de treinos personalizada.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MeusTreinosPage;