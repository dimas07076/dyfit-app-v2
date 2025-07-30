import React, { useEffect, useState } from 'react';
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Edit, Trash2, Calendar, Weight, Ruler, Target, Phone, UserCircle, Info, StickyNote, Loader2, Eye } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from '@/types/aluno';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ModalConfirmacao } from '@/components/ui/modal-confirmacao';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import TreinoFormModal from '@/components/dialogs/TreinoFormModal';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FichaViewModal, { FichaTreinoView } from "@/components/dialogs/FichaViewModal"; // Será renomeado para RotinaViewModal depois
import AssociarModeloAlunoModal from "@/components/dialogs/AssociarModeloAlunoModal";
import { RotinaListagemItem, DiaDeTreinoDetalhado, ExercicioEmDiaDeTreinoDetalhado } from '@/types/treinoOuRotinaTypes';

interface StudentDetailProps {
  id?: string;
}

const StudentDetail: React.FC<StudentDetailProps> = ({ id }) => {
  const studentId = id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmDeleteAction } = useConfirmDialog();
  const [, navigate] = useLocation();

  const [isTreinoFormModalOpen, setIsTreinoFormModalOpen] = useState(false);
  const [fichaParaEditarOuCriar, setFichaParaEditarOuCriar] = useState<RotinaListagemItem | null>(null);
  const [isViewFichaModalOpen, setIsViewFichaModalOpen] = useState(false);
  const [fichaParaVisualizar, setFichaParaVisualizar] = useState<FichaTreinoView | null>(null);
  const [isAssociarModalOpen, setIsAssociarModalOpen] = useState(false);
  const [fichaOriginalParaAssociar, setFichaOriginalParaAssociar] = useState<{id: string; titulo: string} | null>(null);

  const isEditing = !!(fichaParaEditarOuCriar && fichaParaEditarOuCriar._id); 

  const { data: student, isLoading: isLoadingStudent, error: errorLoadingStudent } = useQuery<Aluno | null, Error>({
    queryKey: ["aluno", studentId],
    queryFn: async (): Promise<Aluno | null> => {
      if (!studentId) return null;
      try {
        const data = await apiRequest<Aluno>("GET", `/api/alunos/${studentId}`);
        return data;
      } catch (err: any) {
        if (err.response?.status === 404 || err.message?.includes("404")) return null;
        throw err;
      }
    },
    enabled: !!studentId,
    retry: 1,
  });

  const { data: studentWorkouts = [], isLoading: isLoadingWorkouts, error: errorLoadingWorkouts, refetch: refetchFichasAluno } = useQuery<RotinaListagemItem[], Error>({
    queryKey: ["fichasAluno", studentId],
    queryFn: async (): Promise<RotinaListagemItem[]> => {
      if (!studentId) return [];
      try {
        const dataFromApi = await apiRequest<any[]>("GET", `/api/treinos/aluno/${studentId}`);
        
        if (!Array.isArray(dataFromApi)) {
            console.warn(`API /api/treinos/aluno/${studentId} não retornou um array. Retornado:`, dataFromApi);
            return [];
        }

        return dataFromApi.map((fichaApi: any): RotinaListagemItem => {
          const diasDeTreinoProcessados = (fichaApi.diasDeTreino || []).map((diaApi: any): DiaDeTreinoDetalhado => {
            const exerciciosDoDiaProcessados = (diaApi.exerciciosDoDia || []).map((exApi: any): ExercicioEmDiaDeTreinoDetalhado => ({
              ...exApi,
              _id: exApi._id, 
              exercicioId: exApi.exercicioId, 
              series: exApi.series !== undefined ? String(exApi.series) : undefined, 
              repeticoes: exApi.repeticoes !== undefined ? String(exApi.repeticoes) : undefined, 
              carga: exApi.carga !== undefined ? String(exApi.carga) : undefined, 
              descanso: exApi.descanso !== undefined ? String(exApi.descanso) : undefined, 
              ordemNoDia: exApi.ordemNoDia ?? 0, 
              concluido: exApi.concluido ?? false, 
            }));
            return {
              ...diaApi,
              _id: diaApi._id, 
              identificadorDia: diaApi.identificadorDia, 
              ordemNaRotina: diaApi.ordemNaRotina ?? 0, 
              exerciciosDoDia: exerciciosDoDiaProcessados, 
            };
          });

          return {
            _id: fichaApi._id, 
            titulo: fichaApi.titulo, 
            descricao: fichaApi.descricao, 
            tipo: fichaApi.tipo, 
            alunoId: fichaApi.alunoId, 
            criadorId: fichaApi.criadorId, 
            tipoOrganizacaoRotina: fichaApi.tipoOrganizacaoRotina || 'numerico', 
            diasDeTreino: diasDeTreinoProcessados, 
            pastaId: fichaApi.pastaId, 
            statusModelo: fichaApi.statusModelo, 
            ordemNaPasta: fichaApi.ordemNaPasta, 
            dataValidade: fichaApi.dataValidade, 
            totalSessoesRotinaPlanejadas: fichaApi.totalSessoesRotinaPlanejadas, 
            sessoesRotinaConcluidas: fichaApi.sessoesRotinaConcluidas ?? 0, 
            criadoEm: fichaApi.criadoEm, 
            atualizadoEm: fichaApi.atualizadoEm, 
          };
        });
      } catch (err: any) {
        if (err.message?.includes("404") || (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.status === 404) ) {
            console.warn(`Nenhuma rotina encontrada para o aluno ${studentId} ou erro 404 na API (queryFn).`);
            return []; 
        }
        console.error("Erro ao buscar rotinas do aluno (queryFn):", err);
        throw err;
      }
    },
    enabled: !!studentId, 
    retry: 1, 
    initialData: [], 
  });

  const deleteMutation = useMutation<any, Error, string>({
    mutationFn: (rotinaId) => apiRequest("DELETE", `/api/treinos/${rotinaId}`), 
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Rotina de treino excluída." }); 
      refetchFichasAluno(); 
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro ao Excluir", description: error.message || "Não foi possível excluir a rotina." }); 
    },
    onSettled: () => closeConfirmDialog(), 
  });

  const handleEditFichaClick = (rotina: RotinaListagemItem) => {
    console.log("[StudentDetail] handleEditFichaClick - Rotina recebida:", JSON.parse(JSON.stringify(rotina)));
    setFichaParaEditarOuCriar(rotina); 
    setIsTreinoFormModalOpen(true); 
  };

  const handleCreateFichaClick = () => {
    setFichaParaEditarOuCriar(null); 
    setIsTreinoFormModalOpen(true); 
  };

  const handleDeleteClick = (rotina: RotinaListagemItem) => {
    openConfirmDialog({
        titulo: "Excluir Rotina de Treino", 
        mensagem: `Tem certeza que deseja excluir a rotina "${rotina.titulo}"?`, 
        textoConfirmar: "Excluir Rotina", 
        textoCancelar: "Cancelar", 
        onConfirm: () => deleteMutation.mutate(rotina._id), 
    });
  };

  const handleViewFichaClick = (rotina: RotinaListagemItem) => {
    const todosExerciciosPlanos: ExercicioEmDiaDeTreinoDetalhado[] = (rotina.diasDeTreino || []).flatMap(
      (dia: DiaDeTreinoDetalhado) => (dia.exerciciosDoDia || []).map(
        (ex: ExercicioEmDiaDeTreinoDetalhado): ExercicioEmDiaDeTreinoDetalhado => ({ ...ex })
      )
    );
    const fichaViewData: FichaTreinoView = {
        _id: rotina._id, 
        titulo: rotina.titulo, 
        descricao: rotina.descricao, 
        tipo: rotina.tipo, 
        alunoId: rotina.alunoId, 
        criadorId: rotina.criadorId, 
        diasDeTreino: rotina.diasDeTreino || [], 
        exercicios: todosExerciciosPlanos,  
        criadoEm: rotina.criadoEm, 
        atualizadoEm: rotina.atualizadoEm, 
        statusModelo: rotina.statusModelo, 
        tipoOrganizacaoRotina: rotina.tipoOrganizacaoRotina, 
    };
    setFichaParaVisualizar(fichaViewData); 
    setIsViewFichaModalOpen(true); 
  };

  const handleTriggerEditFichaFromView = (fichaFromView: FichaTreinoView) => {
      setIsViewFichaModalOpen(false); 
      const fichaOriginal = studentWorkouts.find(f => f._id === fichaFromView._id); 
      if (fichaOriginal) {
        handleEditFichaClick(fichaOriginal); 
      } else {
        toast({ title: "Erro", description: "Não foi possível encontrar a rotina original para edição.", variant: "destructive"}); 
      }
  };

  const handleTriggerCopyFichaFromView = (fichaId: string, fichaTitulo: string, tipoFichaOriginal?: "modelo" | "individual") => {
    setIsViewFichaModalOpen(false); 
    setFichaOriginalParaAssociar({ id: fichaId, titulo: fichaTitulo }); 
    setIsAssociarModalOpen(true); 
  };

  const handleTreinoFormSuccess = () => {
      refetchFichasAluno(); 
      setIsTreinoFormModalOpen(false); 
      setFichaParaEditarOuCriar(null); 
  };

  if (isLoadingStudent) return <LoadingSpinner text="Carregando dados do aluno..." />; 
  if (!studentId) return <ErrorMessage title="Erro" message="ID do aluno não fornecido na URL."/>; 
  if (!isLoadingStudent && !errorLoadingStudent && !student) { return <ErrorMessage title="Não Encontrado" message={`Aluno com ID "${studentId}" não encontrado.`} />; 
  }
  if (errorLoadingStudent) { return <ErrorMessage title="Erro ao Carregar Aluno" message={errorLoadingStudent.message} />; 
  }

  const formatDate = (dateString?: string): string => {
      if (!dateString) return 'Não informado'; 
      try {
          const date = new Date(dateString); 
          if (isNaN(date.getTime())) return dateString; 
          return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
      } catch (e) {
          return dateString; 
      }
  };

  const renderFichasContent = () => {
    if (isLoadingWorkouts) {
      return <LoadingSpinner text="Carregando rotinas de treino..." />; 
    }
    if (errorLoadingWorkouts) {
      return <ErrorMessage title="Erro ao Carregar Rotinas" message={errorLoadingWorkouts.message} />; 
    }
    if (Array.isArray(studentWorkouts) && studentWorkouts.length > 0) { 
      return (
        <div className="space-y-4">
          {studentWorkouts.map((rotina) => ( 
            <div key={rotina._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{rotina.titulo}</h3>
                </div>
                {rotina.descricao && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                    {rotina.descricao}
                  </p>
                )} 
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Criada em: {formatDate(rotina.criadoEm)}
                  </span>
                </div>
              </div>
       
              <div className="flex-shrink-0 flex gap-2 self-start sm:self-center"> 
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 rounded-lg hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20" 
                  title="Visualizar Rotina" 
                  onClick={() => handleViewFichaClick(rotina)}
                > 
                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" /> 
                </Button> 
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 rounded-lg hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-900/20" 
                  title="Editar Rotina" 
                  onClick={() => handleEditFichaClick(rotina)} 
                  disabled={deleteMutation.isPending}
                > 
                  <Edit className="w-4 h-4 text-orange-600 dark:text-orange-400" /> 
                </Button> 
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 rounded-lg hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20" 
                  title="Excluir Rotina" 
                  onClick={() => handleDeleteClick(rotina)} 
                  disabled={deleteMutation.isPending && deleteMutation.variables === rotina._id}
                > 
                  {deleteMutation.isPending && deleteMutation.variables === rotina._id ? ( 
                    <Loader2 className="w-4 h-4 animate-spin text-red-600 dark:text-red-400" /> 
                  ) : ( 
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /> 
                  )} 
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Dumbbell className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Este aluno ainda não possui rotinas de treino atribuídas.
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
          Clique no botão "Nova Rotina" para começar.
        </p>
      </div>
    ); 
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6"> 
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/alunos")} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
           Voltar para Lista de Alunos
        </Button>
      </div>

      {/* Main Student Header */}
      <Card className="mb-8 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-t-2xl">
          <CardTitle className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {student?.nome}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Informações do Aluno
              </p>
            </div>
            <Link href={`/alunos/editar/${studentId}`}>
              <Button variant="outline" size="sm" className="rounded-xl">
                <Edit className="w-4 h-4 mr-2" /> Editar Aluno
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Personal Information Section */}
          <div className="bg-muted/10 rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Informações Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Nome Completo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student?.nome ?? 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student?.email ?? 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Telefone</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student?.phone ?? 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Data de Nascimento</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(student?.birthDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Gênero</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student?.gender ?? 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Status</p>
                  <Badge variant={student?.status === 'active' ? 'success' : 'secondary'} className="mt-1">
                    {student?.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Physical Data Section */}
          <div className="bg-muted/10 rounded-lg p-4 shadow-sm border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Weight className="w-5 h-5 text-green-600 dark:text-green-400" />
              Dados Físicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Peso</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {student?.weight ? `${student.weight} kg` : 'Não informado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Altura</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {student?.height ? `${student.height} cm` : 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Training Information Section */}
          <div className="bg-muted/10 rounded-lg p-4 shadow-sm border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Informações de Treinamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Objetivo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{student?.goal ?? 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Data de Início</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(student?.startDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {student?.notes && (
            <div className="bg-muted/10 rounded-lg p-4 shadow-sm border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                Observações
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border-l-4 border-yellow-400">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {student.notes}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card> 

      {/* Workout Routines Section */}
      <Card className="rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 rounded-t-2xl">
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-green-600 dark:text-green-400" />
                Rotinas de Treino
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gerencie as rotinas atribuídas ao aluno
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={handleCreateFichaClick} 
              disabled={!studentId || !student}
              className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
            > 
              <Dumbbell className="w-4 h-4 mr-2" /> 
              Nova Rotina para {student?.nome?.split(' ')[0]}
            </Button> 
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {renderFichasContent()}
        </CardContent>
      </Card> 

      {isTreinoFormModalOpen && (
          <TreinoFormModal
              open={isTreinoFormModalOpen}
              onClose={() => {setIsTreinoFormModalOpen(false); setFichaParaEditarOuCriar(null);}}
              onSuccess={handleTreinoFormSuccess}
              alunos={student ? [student] : []}
              rotinaParaEditar={fichaParaEditarOuCriar} 
              alunoId={!(fichaParaEditarOuCriar && fichaParaEditarOuCriar._id) ? studentId : undefined}
          />
      )}
      {isViewFichaModalOpen && fichaParaVisualizar && (
          <FichaViewModal
              isOpen={isViewFichaModalOpen}
              onClose={() => setIsViewFichaModalOpen(false)}
              ficha={fichaParaVisualizar} 
              onEditFicha={handleTriggerEditFichaFromView}
              onUseOuCopiarFicha={handleTriggerCopyFichaFromView}
          />
      )}
      {isAssociarModalOpen && fichaOriginalParaAssociar && (
        <AssociarModeloAlunoModal
            isOpen={isAssociarModalOpen}
            onClose={() => setIsAssociarModalOpen(false)} 
            fichaModeloId={fichaOriginalParaAssociar.id} 
            fichaModeloTitulo={fichaOriginalParaAssociar.titulo} 
        />
      )}
      <ModalConfirmacao
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDeleteAction}
        titulo={confirmOptions.titulo}
        mensagem={confirmOptions.mensagem}
        textoConfirmar={confirmOptions.textoConfirmar}
        textoCancelar={confirmOptions.textoCancelar} 
        isLoadingConfirm={deleteMutation.isPending} 
      />
    </div>
  );
}

export default StudentDetail; 