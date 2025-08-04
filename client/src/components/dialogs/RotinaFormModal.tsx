// client/src/components/dialogs/RotinaFormModal.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ArrowLeft, ArrowRight, PlusCircle, Edit, Trash2, ListPlus, XCircle, AlertTriangle, Link2, CheckSquare, Square } from "lucide-react";
import { Aluno } from '@/types/aluno';
import type { RotinaListagemItem, DiaDeTreinoDetalhado, ExercicioEmDiaDeTreinoDetalhado } from '@/types/treinoOuRotinaTypes';
import SelectExerciseModal, { BibliotecaExercicio } from './SelectExerciseModal';
import { Card, CardContent } from '../ui/card';
import { useFormPersistence } from '@/hooks/useFormPersistence';

type TipoOrganizacaoRotinaBackend = 'diasDaSemana' | 'numerico' | 'livre';
const OPCOES_TIPO_DOS_TREINOS: { value: TipoOrganizacaoRotinaBackend; label: string }[] = [ { value: 'diasDaSemana', label: 'Dia da Semana' }, { value: 'numerico', label: 'Numérico (A, B, C...)' }, { value: 'livre', label: 'Livre (Nomes)' } ];
const diasDaSemanaOptions = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
export interface RotinaParaEditar { _id?: string; titulo?: string; descricao?: string | null; tipo?: "modelo" | "individual"; statusModelo?: "ativo" | "rascunho" | "arquivado" | null; tipoOrganizacaoRotina?: TipoOrganizacaoRotinaBackend; alunoId?: string | { _id: string; nome: string; } | null; pastaId?: string | { _id: string; nome: string; } | null; diasDeTreino?: DiaDeTreinoDetalhado[]; dataValidade?: string | Date | null; totalSessoesRotinaPlanejadas?: number | null; }
interface DiaDeTreinoState { tempId: string; ordemNaRotina: number; identificadorDia: string; nomeSubFicha?: string | null; exerciciosDoDia: ExercicioEmDiaDeTreinoDetalhado[]; _id?: string; }
interface Step1Data { titulo: string; descricao: string | null; tipo: 'modelo' | 'individual'; alunoId: string | null; }
interface DiaDeTreinoFormData { identificadorDia: string; nomeSubFicha: string | null; }
interface RotinaFormModalProps { open: boolean; onClose: () => void; onSuccess: (rotinaSalva: RotinaListagemItem) => void; alunos: Aluno[]; rotinaParaEditar?: RotinaParaEditar | null; }

const Stepper = ({ currentStep }: { currentStep: number }) => ( <div className="flex items-center w-full mb-8 px-2"> {[ {num: 1, label: "Detalhes"}, {num: 2, label: "Dias"}, {num: 3, label: "Exercícios"} ].map(({num, label}, index, arr) => ( <React.Fragment key={num}> <div className="flex flex-col items-center shrink-0 text-center"> <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${currentStep >= num ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}> {num} </div> <p className={`text-xs mt-2 font-semibold transition-colors w-20 ${currentStep >= num ? 'text-primary' : 'text-slate-500'}`}>{label}</p> </div> {index < arr.length - 1 && <div className={`flex-auto border-t-2 mx-2 transition-colors ${currentStep > num ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}></div>} </React.Fragment> ))} </div> );

// Componente para renderizar cada exercício individualmente
const ExerciseCard = ({ 
  ex, 
  index, 
  diaAtivo, 
  isCombinacoesMode, 
  exerciciosSelecionados,
  handleToggleExercicioSelecionado,
  handleExercicioDetailChange,
  handleRemoveExercicio,
  isInGroup
}: {
  ex: ExercicioEmDiaDeTreinoDetalhado;
  index: number;
  diaAtivo: string;
  isCombinacoesMode: boolean;
  exerciciosSelecionados: number[];
  handleToggleExercicioSelecionado: (index: number) => void;
  handleExercicioDetailChange: (diaTempId: string, exIndex: number, field: keyof ExercicioEmDiaDeTreinoDetalhado, value: string) => void;
  handleRemoveExercicio: (diaTempId: string, exIndex: number) => void;
  isInGroup: boolean;
}) => {
  const isSelected = exerciciosSelecionados.includes(index);
  
  return (
    <Card className={`p-3 shadow-sm border-l-4 transition-all ${
      isSelected 
        ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : isInGroup 
          ? 'border-l-blue-300 bg-white dark:bg-slate-800/60'
          : 'border-l-primary/50 bg-white dark:bg-slate-800/60'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          {isCombinacoesMode && !isInGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => handleToggleExercicioSelecionado(index)}
            >
              {isSelected ? 
                <CheckSquare className="h-4 w-4 text-blue-600" /> : 
                <Square className="h-4 w-4 text-gray-400" />
              }
            </Button>
          )}
          <p className="font-medium text-sm">{(typeof ex.exercicioId === 'object' && ex.exercicioId.nome) || 'Exercício'}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive/70 hover:text-destructive shrink-0" 
          onClick={() => handleRemoveExercicio(diaAtivo, index)}
        >
          <XCircle className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Input 
          placeholder="Séries" 
          value={ex.series || ''} 
          onChange={e => handleExercicioDetailChange(diaAtivo, index, 'series', e.target.value)} 
        />
        <Input 
          placeholder="Reps" 
          value={ex.repeticoes || ''} 
          onChange={e => handleExercicioDetailChange(diaAtivo, index, 'repeticoes', e.target.value)} 
        />
        <Input 
          placeholder="Carga" 
          value={ex.carga || ''} 
          onChange={e => handleExercicioDetailChange(diaAtivo, index, 'carga', e.target.value)} 
        />
        <Input 
          placeholder="Descanso" 
          value={ex.descanso || ''} 
          onChange={e => handleExercicioDetailChange(diaAtivo, index, 'descanso', e.target.value)} 
        />
      </div>
      <Textarea 
        placeholder="Observações..." 
        value={ex.observacoes || ''} 
        onChange={e => handleExercicioDetailChange(diaAtivo, index, 'observacoes', e.target.value)} 
        className="mt-2 text-xs" 
        rows={1} 
      />
    </Card>
  );
};

export default function RotinaFormModal({ open, onClose, onSuccess, alunos: alunosProp, rotinaParaEditar }: RotinaFormModalProps) {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!rotinaParaEditar?._id;

  // Form persistence hooks
  const step1Form = useFormPersistence({
    formKey: 'rotina_step1',
    initialValues: { titulo: '', descricao: null, tipo: 'modelo', alunoId: null },
    enabled: open && !isEditing // Only persist for new rotinas, not edits
  });

  const step2Form = useFormPersistence({
    formKey: 'rotina_step2', 
    initialValues: { tipoOrganizacaoRotina: 'numerico' as TipoOrganizacaoRotinaBackend },
    enabled: open && !isEditing
  });

  // For editing mode, use separate state to manage form data
  const [editingFormData, setEditingFormData] = useState<Step1Data>({
    titulo: '',
    descricao: null,
    tipo: 'modelo',
    alunoId: null
  });

  const [editingStep2Data, setEditingStep2Data] = useState<{ tipoOrganizacaoRotina: TipoOrganizacaoRotinaBackend }>({
    tipoOrganizacaoRotina: 'numerico'
  });

  const [diasDeTreino, setDiasDeTreino] = useState<DiaDeTreinoState[]>([]);
  const [showDiaForm, setShowDiaForm] = useState(false);
  const [editingDiaTempId, setEditingDiaTempId] = useState<string | null>(null);

  const diaForm = useFormPersistence({
    formKey: 'rotina_dia_form',
    initialValues: { identificadorDia: '', nomeSubFicha: null },
    enabled: open && showDiaForm && !isEditing
  });

  const [isSelectExerciseModalOpen, setIsSelectExerciseModalOpen] = useState(false);
  const [diaAtivo, setDiaAtivo] = useState<string | null>(null);
  
  // Estados para funcionalidade de conjugação de exercícios
  const [isCombinacoesMode, setIsCombinacoesMode] = useState(false);
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<number[]>([]);

  // Enhanced close handler that clears form persistence
  const handleClose = () => {
    // Clear form persistence when modal is closed (cancelled)
    if (!isEditing) {
      step1Form.clearPersistence();
      step2Form.clearPersistence();
      diaForm.clearPersistence();
      localStorage.removeItem('rotina_current_step');
      localStorage.removeItem('rotina_dias_treino');
    }
    onClose();
  };

  // Get current form values
  const step1Data = isEditing ? editingFormData : step1Form.values;
  const step2Data = isEditing ? editingStep2Data : step2Form.values;

  const diaFormValues = diaForm.values;

  useEffect(() => {
    if (open) {
      if (isEditing && rotinaParaEditar) {
        // When editing, load data from props and don't use persistence
        setEditingFormData({
          titulo: rotinaParaEditar?.titulo || '', 
          descricao: rotinaParaEditar?.descricao || null, 
          tipo: rotinaParaEditar?.tipo || 'modelo', 
          alunoId: typeof rotinaParaEditar?.alunoId === 'object' && rotinaParaEditar?.alunoId !== null ? 
            rotinaParaEditar.alunoId._id : rotinaParaEditar?.alunoId as string | null 
        });

        setEditingStep2Data({
          tipoOrganizacaoRotina: rotinaParaEditar?.tipoOrganizacaoRotina || 'numerico' 
        });

        const diasEdit = (rotinaParaEditar.diasDeTreino || []).map((dia, i) => ({ 
            ...dia, 
            tempId: dia._id || `edit-dia-${i}-${Date.now()}`, 
            exerciciosDoDia: (dia.exerciciosDoDia || [])
                .filter(ex => ex.exercicioId) // Filtra exercícios cujo exercicioId é null
                .map((ex, j) => ({ ...ex, tempIdExercicio: (ex as any)._id || `edit-ex-${i}-${j}-${Date.now()}` })) 
        } as unknown as DiaDeTreinoState));

        setDiasDeTreino(diasEdit);
        if (diasEdit.length > 0) setDiaAtivo(diasEdit[0].tempId);
      } else {
        // For new rotinas, try to restore from localStorage or use defaults
        const savedDias = localStorage.getItem('rotina_dias_treino');
        if (savedDias && !isEditing) {
          try {
            const parsedDias = JSON.parse(savedDias);
            setDiasDeTreino(parsedDias);
            if (parsedDias.length > 0) setDiaAtivo(parsedDias[0].tempId);
          } catch (error) {
            localStorage.removeItem('rotina_dias_treino');
            setDiasDeTreino([]);
            setDiaAtivo(null);
          }
        } else {
          setDiasDeTreino([]);
          setDiaAtivo(null);
        }
      }
      
      // Restore step from localStorage if available (and not editing)
      if (!isEditing) {
        const savedStep = localStorage.getItem('rotina_current_step');
        if (savedStep) {
          setStep(parseInt(savedStep) || 1);
        } else {
          setStep(1);
        }
      } else {
        setStep(1);
      }
      
      setShowDiaForm(false); 
      setEditingDiaTempId(null);
      
      // Reset combination state
      setIsCombinacoesMode(false);
      setExerciciosSelecionados([]);
    }
  }, [open, isEditing, rotinaParaEditar]);

  // Save current step to localStorage
  useEffect(() => {
    if (open && !isEditing) {
      localStorage.setItem('rotina_current_step', step.toString());
    }
  }, [step, open, isEditing]);

  // Save dias de treino to localStorage
  useEffect(() => {
    if (open && !isEditing && diasDeTreino.length > 0) {
      localStorage.setItem('rotina_dias_treino', JSON.stringify(diasDeTreino));
    }
  }, [diasDeTreino, open, isEditing]);

  const { data: alunosFetched = [], isLoading: isLoadingAlunos } = useQuery<Aluno[]>({ 
    queryKey: ["/api/aluno/gerenciar"], 
    queryFn: () => apiRequest<Aluno[]>("GET", "/api/aluno/gerenciar"), 
    enabled: open && step1Data.tipo === 'individual', 
    initialData: alunosProp 
  });

  // Helper functions for updating editing form data
  const updateEditingStep1Field = (field: keyof Step1Data, value: any) => {
    if (isEditing) {
      setEditingFormData(prev => ({ ...prev, [field]: value }));
    } else {
      step1Form.updateField(field, value);
    }
  };

  const updateEditingStep1Fields = (fields: Partial<Step1Data>) => {
    if (isEditing) {
      setEditingFormData(prev => ({ ...prev, ...fields }));
    } else {
      step1Form.updateFields(fields);
    }
  };

  const updateEditingStep2Field = (field: keyof typeof editingStep2Data, value: any) => {
    if (isEditing) {
      setEditingStep2Data(prev => ({ ...prev, [field]: value }));
    } else {
      step2Form.updateField(field, value);
    }
  };


  const nextStep = () => {
    if (step === 1 && !step1Data.titulo.trim()) { toast({ variant: "destructive", title: "Campo obrigatório", description: "O título da rotina é obrigatório." }); return; }
    if (step === 1 && step1Data.tipo === 'individual' && !step1Data.alunoId) { toast({ variant: "destructive", title: "Campo obrigatório", description: "Selecione um aluno." }); return; }
    if (step === 2 && diasDeTreino.length === 0) { toast({ variant: "destructive", title: "Atenção", description: "Adicione pelo menos um dia de treino." }); return; }
    if (step === 2 && diasDeTreino.length > 0 && !diaAtivo) setDiaAtivo(diasDeTreino[0].tempId);
    setStep(s => Math.min(s + 1, 3));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  
  const mutation = useMutation<RotinaListagemItem, Error, any>({
    mutationFn: (payload) => apiRequest(isEditing ? "PUT" : "POST", isEditing ? `/api/treinos/${rotinaParaEditar?._id}` : "/api/treinos", payload),
    onSuccess: (savedRotina) => {
        toast({ title: "Sucesso!", description: `Rotina "${savedRotina.titulo}" salva.` });
        queryClient.invalidateQueries({ queryKey: ["/api/treinos"] });
        
        // Clear persisted form data on successful save
        if (!isEditing) {
          step1Form.clearPersistence();
          step2Form.clearPersistence();
          diaForm.clearPersistence();
          localStorage.removeItem('rotina_current_step');
          localStorage.removeItem('rotina_dias_treino');
        }
        
        onSuccess(savedRotina); 
        onClose();
    },
    onError: (error) => toast({ variant: "destructive", title: "Erro ao Salvar", description: error.message }),
  });

  const handleFinalSubmit = () => {
    const payload = {
        ...step1Data,
        ...step2Data,
        diasDeTreino: diasDeTreino.map(dia => ({
            _id: dia._id, identificadorDia: dia.identificadorDia, nomeSubFicha: dia.nomeSubFicha, ordemNaRotina: dia.ordemNaRotina,
            exerciciosDoDia: dia.exerciciosDoDia.map(ex => ({
                _id: (ex as any)._idSubDocExercicio,
                exercicioId: typeof ex.exercicioId === 'object' ? ex.exercicioId._id : ex.exercicioId,
                series: ex.series, repeticoes: ex.repeticoes, carga: ex.carga, descanso: ex.descanso, observacoes: ex.observacoes, ordemNoDia: ex.ordemNoDia,
                grupoCombinado: ex.grupoCombinado
            }))
        }))
    };
    console.log("Payload enviado:", payload); // Log para depuração
    mutation.mutate(payload);
  };
  
  const handleAddOrUpdateDia = () => { 
    if (!diaFormValues.identificadorDia.trim()) { 
      toast({ variant: "destructive", title: "Erro", description: "O identificador do dia é obrigatório." }); 
      return; 
    } 
    const diaJaExiste = diasDeTreino.some(dia => dia.identificadorDia.toLowerCase() === diaFormValues.identificadorDia.toLowerCase() && dia.tempId !== editingDiaTempId); 
    if (diaJaExiste) { 
      toast({ variant: "destructive", title: "Erro", description: `O identificador "${diaFormValues.identificadorDia}" já foi usado.` }); 
      return; 
    } 
    setDiasDeTreino(prev => { 
      let novosDias = [...prev]; 
      if (editingDiaTempId) { 
        novosDias = novosDias.map(d => d.tempId === editingDiaTempId ? {...d, ...diaFormValues, nomeSubFicha: diaFormValues.nomeSubFicha || null} : d); 
      } else { 
        novosDias.push({ ...diaFormValues, nomeSubFicha: diaFormValues.nomeSubFicha || null, tempId: `new-${Date.now()}`, ordemNaRotina: prev.length, exerciciosDoDia: [] }); 
      } 
      return novosDias; 
    }); 
    setShowDiaForm(false); 
    setEditingDiaTempId(null); 
    diaForm.resetForm();
  };
  
  const handleEditDia = (dia: DiaDeTreinoState) => { 
    diaForm.updateFields({ identificadorDia: dia.identificadorDia, nomeSubFicha: dia.nomeSubFicha || null }); 
    setEditingDiaTempId(dia.tempId); 
    setShowDiaForm(true); 
  };
  
  const handleRemoveDia = (tempId: string) => { 
    setDiasDeTreino(prev => prev.filter(d => d.tempId !== tempId).map((d, i) => ({...d, ordemNaRotina: i}))); 
  };
  
  const handleShowDiaForm = () => { 
    setEditingDiaTempId(null); 
    diaForm.resetForm(); 
    setShowDiaForm(true); 
  };
  const handleOpenSelectExerciseModal = (diaTempId: string) => { setDiaAtivo(diaTempId); setIsSelectExerciseModalOpen(true); };
  const handleExercisesSelected = (selecionados: BibliotecaExercicio[]) => { if (!diaAtivo) return; setDiasDeTreino(prev => prev.map(dia => { if (dia.tempId === diaAtivo) { const novosExercicios = selecionados.map((ex, i) => ({ _id: `new-ex-${Date.now()}-${i}`, exercicioId: { _id: ex._id, nome: ex.nome, grupoMuscular: ex.grupoMuscular, categoria: ex.categoria }, ordemNoDia: (dia.exerciciosDoDia?.length || 0) + i, } as unknown as ExercicioEmDiaDeTreinoDetalhado)); return { ...dia, exerciciosDoDia: [...(dia.exerciciosDoDia || []), ...novosExercicios] }; } return dia; })); setIsSelectExerciseModalOpen(false); };
  const handleExercicioDetailChange = (diaTempId: string, exIndex: number, field: keyof ExercicioEmDiaDeTreinoDetalhado, value: string) => { setDiasDeTreino(prev => prev.map(dia => { if (dia.tempId === diaTempId) { const exerciciosAtualizados = [...dia.exerciciosDoDia]; (exerciciosAtualizados[exIndex] as any)[field] = value; return { ...dia, exerciciosDoDia: exerciciosAtualizados }; } return dia; })); };
  const handleRemoveExercicio = (diaTempId: string, exIndex: number) => { setDiasDeTreino(prev => prev.map(dia => { if (dia.tempId === diaTempId) { const exerciciosAtualizados = dia.exerciciosDoDia.filter((_, index) => index !== exIndex); return { ...dia, exerciciosDoDia: exerciciosAtualizados.map((ex, i) => ({ ...ex, ordemNoDia: i })) }; } return dia; })); };
  
  // Funções para conjugação de exercícios
  const handleToggleCombinacaoMode = () => {
    setIsCombinacoesMode(!isCombinacoesMode);
    setExerciciosSelecionados([]);
  };

  const handleToggleExercicioSelecionado = (exIndex: number) => {
    setExerciciosSelecionados(prev => 
      prev.includes(exIndex) 
        ? prev.filter(idx => idx !== exIndex)
        : [...prev, exIndex]
    );
  };

  const handleConjugarExercicios = () => {
    if (!diaAtivo || exerciciosSelecionados.length < 2) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos 2 exercícios para conjugar."
      });
      return;
    }

    const grupoCombinado = `grupo-${Date.now()}`;
    
    setDiasDeTreino(prev => prev.map(dia => {
      if (dia.tempId === diaAtivo) {
        const exerciciosAtualizados = dia.exerciciosDoDia.map((ex, index) => {
          if (exerciciosSelecionados.includes(index)) {
            return { ...ex, grupoCombinado };
          }
          return ex;
        });
        return { ...dia, exerciciosDoDia: exerciciosAtualizados };
      }
      return dia;
    }));

    setExerciciosSelecionados([]);
    setIsCombinacoesMode(false);
    
    toast({
      title: "Sucesso!",
      description: `${exerciciosSelecionados.length} exercícios conjugados com sucesso.`
    });
  };

  const handleDesconjugarExercicios = (grupoCombinado: string) => {
    if (!diaAtivo) return;

    setDiasDeTreino(prev => prev.map(dia => {
      if (dia.tempId === diaAtivo) {
        const exerciciosAtualizados = dia.exerciciosDoDia.map(ex => {
          if (ex.grupoCombinado === grupoCombinado) {
            const { grupoCombinado: _, ...exercicioSemGrupo } = ex;
            return exercicioSemGrupo;
          }
          return ex;
        });
        return { ...dia, exerciciosDoDia: exerciciosAtualizados };
      }
      return dia;
    }));

    toast({
      title: "Sucesso!",
      description: "Exercícios desconjugados com sucesso."
    });
  };
  
  const diasDaSemanaUtilizados = useMemo(() => diasDeTreino.map(d => d.identificadorDia), [diasDeTreino]);

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      {/* Ajustes para responsividade: sm:max-w-4xl agora é w-[95vw] h-[90vh] para mobile, e flex-col para empilhar conteúdo */}
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>{isEditing ? "Editar Rotina" : "Nova Rotina"}</DialogTitle>
          <DialogDescription>Siga os passos para configurar a rotina de treino.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          <Stepper currentStep={step} />
          {step === 1 && <div className="space-y-4 animate-in fade-in-50">
              <div><Label className="font-semibold">Título da Rotina*</Label><Input value={step1Data.titulo} onChange={e => updateEditingStep1Field('titulo', e.target.value)} /></div>
              <div><Label className="font-semibold">Descrição (Opcional)</Label><Textarea value={step1Data.descricao || ''} onChange={e => updateEditingStep1Field('descricao', e.target.value)} /></div>
              <div><Label className="font-semibold">Tipo de Rotina</Label><Select value={step1Data.tipo} onValueChange={(v: any) => updateEditingStep1Fields({tipo: v, alunoId: null})} disabled={isEditing}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="modelo">Modelo</SelectItem><SelectItem value="individual">Individual</SelectItem></SelectContent></Select></div>
              {step1Data.tipo === 'individual' && (<div><Label className="font-semibold">Aluno*</Label><Select value={step1Data.alunoId || ''} onValueChange={(v) => updateEditingStep1Field('alunoId', v)} disabled={isEditing}><SelectTrigger>{isLoadingAlunos ? <span className="text-muted-foreground">Carregando alunos...</span> : <SelectValue placeholder="Selecione um aluno..."/>}</SelectTrigger><SelectContent>{alunosFetched.map(aluno => <SelectItem key={aluno._id} value={aluno._id}>{aluno.nome}</SelectItem>)}</SelectContent></Select></div>)}
          </div>}
          {step === 2 && <div className="space-y-6 animate-in fade-in-50">
             <div><Label className="font-semibold">Organização dos Dias*</Label><Select value={step2Data.tipoOrganizacaoRotina} onValueChange={(v:any) => updateEditingStep2Field('tipoOrganizacaoRotina', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{OPCOES_TIPO_DOS_TREINOS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select></div>
             <div className="space-y-2">{diasDeTreino.map(dia => (<Card key={dia.tempId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border-l-4 border-l-primary"><div><p className="font-medium">{dia.identificadorDia}</p>{dia.nomeSubFicha && <p className="text-xs text-muted-foreground">{dia.nomeSubFicha}</p>}</div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditDia(dia)}><Edit className="h-4 w-4 text-slate-500"/></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleRemoveDia(dia.tempId)}><Trash2 className="h-4 w-4"/></Button></div></Card>))}</div>
             {showDiaForm && (<Card className="p-4 border-dashed"><CardContent className="p-0 space-y-4"><h4 className="font-medium text-sm">{editingDiaTempId ? 'Editando Dia' : 'Novo Dia de Treino'}</h4><div><Label>Identificador do Dia*</Label>{step2Data.tipoOrganizacaoRotina === 'diasDaSemana' ? (<Select value={diaFormValues.identificadorDia} onValueChange={(v) => diaForm.updateField('identificadorDia', v)}><SelectTrigger><SelectValue placeholder="Selecione um dia..." /></SelectTrigger><SelectContent>{diasDaSemanaOptions.map(opt => <SelectItem key={opt} value={opt} disabled={diasDaSemanaUtilizados.includes(opt)}>{opt}</SelectItem>)}</SelectContent></Select>) : (<Input value={diaFormValues.identificadorDia} onChange={e => diaForm.updateField('identificadorDia', e.target.value)} placeholder={step2Data.tipoOrganizacaoRotina === 'numerico' ? `Ex: Treino ${diasDeTreino.length + 1}` : 'Ex: Peito & Tríceps'} />)}</div><div><Label>Nome Específico (Opcional)</Label><Input value={diaFormValues.nomeSubFicha || ''} onChange={e => diaForm.updateField('nomeSubFicha', e.target.value)} placeholder="Ex: Foco em Força" /></div><div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => {setShowDiaForm(false); setEditingDiaTempId(null); diaForm.resetForm();}}>Cancelar</Button><Button onClick={handleAddOrUpdateDia}>{editingDiaTempId ? 'Atualizar' : 'Adicionar'}</Button></div></CardContent></Card>)}
             {!showDiaForm && (<Button variant="outline" className="w-full border-dashed border-primary text-primary hover:text-primary hover:bg-primary/5" onClick={handleShowDiaForm}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Dia de Treino</Button>)}
          </div>}
          {step === 3 && (
            <div className="flex flex-col md:flex-row h-full max-h-full overflow-hidden"> {/* Alterado para flex-col em mobile e md:flex-row em desktop */}
              <div className="md:col-span-1 border-b md:border-b-0 md:border-r dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 overflow-y-auto w-full md:w-1/3 lg:w-1/4 shrink-0"> {/* Ajustes de largura e borda para mobile/desktop */}
                <h3 className="font-semibold mb-3">Dias de Treino</h3>
                <div className="space-y-2">
                  {diasDeTreino.map(dia => (
                    <Button
                      key={dia.tempId}
                      variant={diaAtivo === dia.tempId ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setDiaAtivo(dia.tempId)}
                    >
                      <span className="flex flex-col">
                        <span>{dia.identificadorDia}</span>
                        {dia.nomeSubFicha && <span className="text-xs font-normal opacity-70">{dia.nomeSubFicha}</span>}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 p-4 overflow-y-auto flex-grow"> {/* flex-grow para ocupar o espaço restante */}
                {diaAtivo && diasDeTreino.find(d => d.tempId === diaAtivo) ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Exercícios do Dia: {diasDeTreino.find(d => d.tempId === diaAtivo)?.identificadorDia}</h3>
                      {(diasDeTreino.find(d => d.tempId === diaAtivo)?.exerciciosDoDia || []).length > 0 && (
                        <div className="flex gap-2">
                          {isCombinacoesMode && exerciciosSelecionados.length > 1 && (
                            <Button 
                              size="sm" 
                              onClick={handleConjugarExercicios}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Link2 className="mr-2 h-4 w-4" />
                              Conjugar ({exerciciosSelecionados.length})
                            </Button>
                          )}
                          <Button 
                            variant={isCombinacoesMode ? "default" : "outline"}
                            size="sm" 
                            onClick={handleToggleCombinacaoMode}
                            disabled={(diasDeTreino.find(d => d.tempId === diaAtivo)?.exerciciosDoDia || []).length < 2 && !isCombinacoesMode}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {isCombinacoesMode ? "Cancelar" : "Conjugar Exercícios"}
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Renderização dos exercícios com agrupamento visual */}
                    {(() => {
                      const exerciciosDoDia = diasDeTreino.find(d => d.tempId === diaAtivo)?.exerciciosDoDia || [];
                      const grupos: { [key: string]: { exercicios: typeof exerciciosDoDia, indices: number[] } } = {};
                      const exerciciosSemGrupo: { exercicio: typeof exerciciosDoDia[0], index: number }[] = [];
                      
                      exerciciosDoDia.forEach((ex, index) => {
                        if (ex.grupoCombinado) {
                          if (!grupos[ex.grupoCombinado]) {
                            grupos[ex.grupoCombinado] = { exercicios: [], indices: [] };
                          }
                          grupos[ex.grupoCombinado].exercicios.push(ex);
                          grupos[ex.grupoCombinado].indices.push(index);
                        } else {
                          exerciciosSemGrupo.push({ exercicio: ex, index });
                        }
                      });

                      return (
                        <div className="space-y-4">
                          {/* Exercícios agrupados */}
                          {Object.entries(grupos).map(([grupoId, grupo]) => (
                            <div key={grupoId} className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-900/10">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    Exercícios Conjugados ({grupo.exercicios.length})
                                  </span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDesconjugarExercicios(grupoId)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-3">
                                {grupo.exercicios.map((ex, grupoIndex) => {
                                  const originalIndex = grupo.indices[grupoIndex];
                                  return (
                                    <ExerciseCard 
                                      key={(ex as any)._id || (ex as any).tempIdExercicio || originalIndex}
                                      ex={ex}
                                      index={originalIndex}
                                      diaAtivo={diaAtivo}
                                      isCombinacoesMode={isCombinacoesMode}
                                      exerciciosSelecionados={exerciciosSelecionados}
                                      handleToggleExercicioSelecionado={handleToggleExercicioSelecionado}
                                      handleExercicioDetailChange={handleExercicioDetailChange}
                                      handleRemoveExercicio={handleRemoveExercicio}
                                      isInGroup={true}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          
                          {/* Exercícios individuais */}
                          {exerciciosSemGrupo.map(({ exercicio: ex, index }) => {
                            if (!ex.exercicioId) {
                              return (
                                <Card key={index} className="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500">
                                  <p className="text-red-600 dark:text-red-400 text-sm flex items-center">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Este exercício foi removido e não pode ser editado.
                                  </p>
                                </Card>
                              );
                            }
                            return (
                              <ExerciseCard 
                                key={(ex as any)._id || (ex as any).tempIdExercicio || index}
                                ex={ex}
                                index={index}
                                diaAtivo={diaAtivo}
                                isCombinacoesMode={isCombinacoesMode}
                                exerciciosSelecionados={exerciciosSelecionados}
                                handleToggleExercicioSelecionado={handleToggleExercicioSelecionado}
                                handleExercicioDetailChange={handleExercicioDetailChange}
                                handleRemoveExercicio={handleRemoveExercicio}
                                isInGroup={false}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                    
                    <Button variant="outline" className="w-full border-dashed" onClick={() => handleOpenSelectExerciseModal(diaAtivo)}>
                      <ListPlus className="mr-2 h-4 w-4" />Adicionar Exercício
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground pt-20 flex flex-col items-center">
                    <p className="font-semibold">Nenhum dia selecionado</p>
                    <p className="text-sm">Selecione um dia de treino à esquerda.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t flex justify-between shrink-0">
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>}
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
          <div>
            {step < 3 && <Button onClick={nextStep} disabled={step === 2 && diasDeTreino.length === 0}>Próximo <ArrowRight className="ml-2 h-4 w-4"/></Button>}
            {step === 3 && <Button onClick={handleFinalSubmit} disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditing ? "Salvar Alterações" : "Criar Rotina"}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
      {isSelectExerciseModalOpen && <SelectExerciseModal isOpen={isSelectExerciseModalOpen} onClose={() => setIsSelectExerciseModalOpen(false)} onExercisesSelect={handleExercisesSelected} />}
    </Dialog>
  );
}
