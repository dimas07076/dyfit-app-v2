import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Tag, Calendar } from "lucide-react"; // Import icons for token section
import { formatDateForInput } from "@/utils/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTokenInfo } from "@/hooks/useTokenInfo";

// Interface para informações de token - updated to match useTokenInfo hook
interface TokenInfo {
    id: string;
    tipo: 'plano' | 'avulso';
    dataExpiracao: string;
    status: string;
    alunoId?: string;
    alunoNome?: string;
    quantidade: number;
}

// Interface Original para dados do Aluno (como vem da API ou é esperado no submit final)
interface AlunoEditData {
    _id?: string;
    nome?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    goal?: string;
    weight?: number | null;
    height?: number | null;
    startDate?: string;
    phone?: string;
    status?: 'active' | 'inactive';
    notes?: string;
    trainerId?: string; // Fixed: should be string, not number
    // Token information fields (readonly)
    tokenInfo?: TokenInfo;
}

// NOVA Interface para o ESTADO do formulário (permite string para campos numéricos durante digitação)
interface AlunoFormDataState {
    _id?: string;
    nome?: string;
    email?: string;
    birthDate?: string;
    gender?: string;
    goal?: string;
    weight?: string | number | null; // Permite string
    height?: string | number | null; // Permite string
    startDate?: string;
    phone?: string;
    status?: 'active' | 'inactive';
    notes?: string;
    trainerId?: string | null; // Fixed: should be string, not number
    // Token information fields (readonly)
    tokenInfo?: TokenInfo;
}


interface ModalEditarAlunoProps {
  isOpen: boolean;
  onClose: () => void;
  aluno: AlunoEditData | null; // Recebe o tipo original
  atualizarAlunos: () => void;
}

export function ModalEditarAluno({ isOpen, onClose, aluno, atualizarAlunos }: ModalEditarAlunoProps) {
  const { toast } = useToast();
  
  // Usa a NOVA interface para o estado do formulário
  const [formData, setFormData] = useState<AlunoFormDataState>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the useTokenInfo hook for better authentication and error handling
  const { tokenInfo, isLoading: isLoadingTokenInfo, error: tokenError, refetch: refetchTokenInfo } = useTokenInfo(aluno?._id);

  // Debug logging to help understand what's happening
  useEffect(() => {
    if (isOpen) {
      console.log(`[ModalEditarAluno] 🔍 Modal opened with aluno:`, aluno);
      console.log(`[ModalEditarAluno] 🔍 Student ID: ${aluno?._id}`);
      console.log(`[ModalEditarAluno] 🔍 Token Info:`, tokenInfo);
      console.log(`[ModalEditarAluno] 🔍 Is Loading Token:`, isLoadingTokenInfo);
      console.log(`[ModalEditarAluno] 🔍 Token Error:`, tokenError);
      
      // Log form data changes
      console.log(`[ModalEditarAluno] 🔍 Form Data Token Info:`, formData.tokenInfo);
    }
  }, [isOpen, aluno?._id, tokenInfo, isLoadingTokenInfo, tokenError, formData.tokenInfo]);

  useEffect(() => {
    if (aluno && isOpen) {
        // Ao popular o estado, converte números para string para os inputs text
      const baseFormData = {
        ...aluno,
        birthDate: formatDateForInput(aluno.birthDate),
        startDate: formatDateForInput(aluno.startDate),
        // Converte para string ao carregar no estado, ou usa '' se for null/undefined
        weight: aluno.weight !== null && aluno.weight !== undefined ? String(aluno.weight) : '',
        height: aluno.height !== null && aluno.height !== undefined ? String(aluno.height) : '',
        trainerId: aluno.trainerId || '', // trainerId is already a string
        // Include token information from the hook
        tokenInfo: tokenInfo || undefined
      };

      setFormData(baseFormData);
    }
  }, [aluno, isOpen, tokenInfo]);

  // handleChange agora está consistente com o tipo AlunoFormDataState (que permite string)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

   // handleSelectChange também está consistente
   const handleSelectChange = (name: keyof AlunoFormDataState) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!aluno?._id) {
        toast({ title: "ID do aluno não encontrado", variant: "destructive" });
        return;
    }

    // Basic validation for required fields
    if (!formData.nome?.trim()) {
        toast({ title: "Nome é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.email?.trim()) {
        toast({ title: "Email é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.birthDate) {
        toast({ title: "Data de nascimento é obrigatória", variant: "destructive" });
        return;
    }
    if (!formData.gender) {
        toast({ title: "Gênero é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.goal) {
        toast({ title: "Objetivo é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.startDate) {
        toast({ title: "Data de início é obrigatória", variant: "destructive" });
        return;
    }
    if (!formData.status) {
        toast({ title: "Status é obrigatório", variant: "destructive" });
        return;
    }

    setIsLoading(true);

    // Prepara os dados para enviar, convertendo de volta para número onde necessário
    const dataToSend: AlunoEditData = { // Envia o tipo esperado pela API
        _id: formData._id, // Mantém o ID se necessário na API
        nome: formData.nome,
        email: formData.email,
        birthDate: formData.birthDate,
        gender: formData.gender,
        goal: formData.goal,
        phone: formData.phone,
        status: formData.status,
        notes: formData.notes,

        weight: formData.weight !== null && formData.weight !== undefined && String(formData.weight).trim() !== ''
                 ? parseFloat(String(formData.weight).replace(',', '.'))
                 : null,
        height: formData.height !== null && formData.height !== undefined && String(formData.height).trim() !== ''
                ? parseInt(String(formData.height), 10)
                : null,
        startDate: formData.startDate, // Garanta que esteja no formato correto se necessário

        trainerId: formData.trainerId && String(formData.trainerId).trim() !== ''
                 ? String(formData.trainerId).trim()
                 : undefined, // trainerId is string, not number
    };

    // Validação simples antes de enviar
    // Verifica se, após a conversão, o resultado é NaN (Not a Number)
    if ((dataToSend.weight !== null && dataToSend.weight !== undefined && isNaN(dataToSend.weight)) || 
        (dataToSend.height !== null && dataToSend.height !== undefined && isNaN(dataToSend.height))) {
       toast({ title: "Peso ou Altura contém valor inválido.", variant: "destructive" });
       setIsLoading(false);
       return;
     }

    // Remover campos não editáveis ou que a API não espera no PUT
    // delete dataToSend._id; // Exemplo: remover _id do corpo

    try {
      // Use the correct API endpoint
      const response = await fetch(`/api/alunos/gerenciar/${aluno._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({ title: "Aluno atualizado com sucesso!" });
        atualizarAlunos();
        onClose();
      } else {
         const errorData = await response.json().catch(() => null);
        toast({
            title: "Erro ao atualizar aluno",
            description: errorData?.message || errorData?.erro || `Status: ${response.status}`,
            variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao editar aluno:", error);
      toast({ title: "Erro de conexão ao salvar", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

   if (!isOpen || !aluno) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Conteúdo do Dialog (mantido igual ao anterior, pois a lógica de UI não mudou) */}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Aluno</DialogTitle>
           <DialogDescription>Atualize as informações de {aluno?.nome || 'aluno'}.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Linha 1: Nome */}
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="nome" className="text-right">Nome*</Label>
            <Input id="nome" name="nome" value={formData.nome || ""} onChange={handleChange} className="col-span-3" placeholder="Nome completo" />
          </div>
           {/* Linha 2: Email */}
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="email" className="text-right">Email*</Label>
            <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} className="col-span-3" placeholder="email@exemplo.com" />
          </div>
           {/* Linha 3: Telefone */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Telefone</Label>
            <Input id="phone" name="phone" value={formData.phone || ""} onChange={handleChange} className="col-span-3" placeholder="(00) 00000-0000" />
          </div>
          {/* Linha 4: Data Nasc e Gênero */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label htmlFor="birthDate">Data de Nascimento*</Label>
                <Input id="birthDate" name="birthDate" type="date" value={formData.birthDate || ""} onChange={handleChange} />
             </div>
              <div>
                 <Label htmlFor="gender">Gênero*</Label>
                 <Select name="gender" value={formData.gender || ""} onValueChange={handleSelectChange('gender')}>
                     <SelectTrigger id="gender"><SelectValue placeholder="Selecione" /></SelectTrigger>
                     <SelectContent>
                         <SelectItem value="Masculino">Masculino</SelectItem>
                         <SelectItem value="Feminino">Feminino</SelectItem>
                         <SelectItem value="Outro">Outro</SelectItem>
                     </SelectContent>
                 </Select>
             </div>
          </div>
          {/* Linha 5: Peso e Altura */}
           <div className="grid grid-cols-2 gap-4">
             <div>
                 <Label htmlFor="weight">Peso (kg)</Label>
                 <Input
                    id="weight"
                    name="weight"
                    type="text"
                    inputMode="decimal"
                    // Usa o valor do estado (que pode ser string, number ou null)
                    // ?? '' garante que se for null/undefined, o input fique vazio
                    value={formData.weight ?? ''}
                    onChange={handleChange}
                    placeholder="Ex: 75,5"
                 />
             </div>
             <div>
                <Label htmlFor="height">Altura (cm)</Label>
                 <Input
                    id="height"
                    name="height"
                    type="text"
                    inputMode="numeric"
                    value={formData.height ?? ''}
                    onChange={handleChange}
                    placeholder="Ex: 178"
                 />
             </div>
           </div>
          {/* Linha 6: Objetivo */}
          <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="goal" className="text-right">Objetivo*</Label>
              <Select name="goal" value={formData.goal || ""} onValueChange={handleSelectChange('goal')} >
                 <SelectTrigger className="col-span-3"><SelectValue placeholder="Selecione o objetivo" /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="Reabilitação">Reabilitação</SelectItem>
                    <SelectItem value="Condicionamento físico">Condicionamento físico</SelectItem>
                    <SelectItem value="Definição muscular">Definição muscular</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Preparação para competição">Preparação para competição</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                 </SelectContent>
              </Select>
          </div>
          {/* Linha 7: Data Início e Status */}
           <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Data de Início*</Label>
                <Input id="startDate" name="startDate" type="date" value={formData.startDate || ""} onChange={handleChange} />
              </div>
              <div>
                 <Label htmlFor="status">Status*</Label>
                 <Select name="status" value={formData.status || ""} onValueChange={handleSelectChange('status')}>
                     <SelectTrigger id="status"><SelectValue placeholder="Selecione" /></SelectTrigger>
                     <SelectContent>
                         <SelectItem value="active">Ativo</SelectItem>
                         <SelectItem value="inactive">Inativo</SelectItem>
                     </SelectContent>
                 </Select>
              </div>
           </div>
           {/* Linha 8: Notas */}
           <div className="grid grid-cols-4 items-start gap-4">
             <Label htmlFor="notes" className="text-right pt-2">Notas</Label>
             <Textarea id="notes" name="notes" value={formData.notes || ""} onChange={handleChange} placeholder="Observações adicionais..." className="col-span-3" rows={3} />
           </div>
          {/* Linha 9: Trainer ID (Comentado - descomente e ajuste se precisar editar) */}
          {/* <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="trainerId" className="text-right">ID Personal</Label>
            <Input id="trainerId" name="trainerId" type="text" inputMode="numeric" value={formData.trainerId ?? ''} onChange={handleChange} className="col-span-3" />
          </div> */}

          {/* Seção de Informações de Token - DEBUGGING VERSION */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Informações de Token</Label>
              </div>
              
              {/* Debug info and refresh button */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  DEBUG: ID={aluno?._id?.slice(-4)} | Loading={isLoadingTokenInfo ? 'Y' : 'N'} | HasToken={tokenInfo ? 'Y' : 'N'}
                </span>
                {tokenError && (
                  <span className="text-xs text-destructive">
                    Erro: {tokenError}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchTokenInfo()}
                  className="h-6 px-2 text-xs"
                >
                  Atualizar
                </Button>
              </div>
            </div>
            
            {isLoadingTokenInfo ? (
              <div className="animate-pulse space-y-2">
                <div className="h-10 bg-muted rounded"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 bg-muted rounded"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </div>
              </div>
            ) : formData.tokenInfo ? (
              <>
                {/* Token ID e Tipo */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="tokenId" className="text-sm">ID do Token</Label>
                    <Input 
                      id="tokenId" 
                      value={formData.tokenInfo.id || ""} 
                      readOnly 
                      className="bg-muted text-muted-foreground font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tokenTipo" className="text-sm">Tipo de Token</Label>
                    <Input 
                      id="tokenTipo" 
                      value={formData.tokenInfo.tipo === 'plano' ? 'Plano' : 'Avulso'} 
                      readOnly 
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Data de Expiração e Quantidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tokenExpiracao" className="text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Data de Expiração
                    </Label>
                    <Input 
                      id="tokenExpiracao" 
                      value={formData.tokenInfo.dataExpiracao ? 
                        format(new Date(formData.tokenInfo.dataExpiracao), 'dd/MM/yyyy', { locale: ptBR }) : 
                        ""
                      } 
                      readOnly 
                      className={`bg-muted text-muted-foreground ${
                        formData.tokenInfo.dataExpiracao && new Date(formData.tokenInfo.dataExpiracao) <= new Date() 
                          ? 'text-destructive' 
                          : ''
                      }`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tokenQuantidade" className="text-sm">Quantidade</Label>
                    <Input 
                      id="tokenQuantidade" 
                      value={formData.tokenInfo.quantidade || 0} 
                      readOnly 
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
                <p className="font-medium text-orange-600">⚠️ Nenhum token associado a este aluno</p>
                <p className="text-xs mt-1">
                  Aluno ID: {aluno?._id}
                </p>
                <p className="text-xs">
                  API chamada: {tokenInfo === null ? 'Sim (sem token encontrado)' : 'Não executada'}
                </p>
                {tokenError && (
                  <p className="text-xs text-destructive">
                    Erro: {tokenError}
                  </p>
                )}
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchTokenInfo()}
                    className="text-xs"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}