import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react"; // Import Loader2

// Utility function to extract date in YYYY-MM-DD format from various date formats
const extractDateOnly = (dateValue: string | Date | undefined | null): string => {
  console.log('🔍 extractDateOnly called with:', dateValue, 'Type:', typeof dateValue);
  
  if (!dateValue) {
    console.log('🔍 No dateValue provided, returning empty string');
    return "";
  }
  
  // Handle Date objects first (before converting to string)
  if (dateValue instanceof Date) {
    if (!isNaN(dateValue.getTime())) {
      const result = dateValue.toISOString().split('T')[0];
      console.log('🔍 Date object converted to:', result);
      return result;
    } else {
      console.log('🔍 Invalid Date object, returning empty string');
      return "";
    }
  }
  
  // Convert to string in case it's not
  let dateStr = String(dateValue).trim();
  console.log('🔍 Date string after trim:', dateStr);
  
  if (!dateStr) {
    console.log('🔍 Empty date string, returning empty string');
    return "";
  }
  
  // Check if the string looks like a Date.toString() output
  // This includes: GMT, UTC, GM (truncated GMT), or starts with day names
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const startsWithDayName = dayNames.some(day => dateStr.startsWith(day));
  
  console.log('🔍 Checking Date.toString() format...');
  console.log('🔍 Contains GMT:', dateStr.includes('GMT'));
  console.log('🔍 Contains UTC:', dateStr.includes('UTC'));
  console.log('🔍 Contains GM:', dateStr.includes('GM'));
  console.log('🔍 Starts with day name:', startsWithDayName);
  
  if (dateStr.includes('GMT') || dateStr.includes('UTC') || dateStr.includes('GM') || 
      startsWithDayName || dateStr.length > 50) {
    console.log('🔍 Detected as Date.toString() format, attempting to parse...');
    try {
      // For truncated strings like "Mon Jul 21 2025 00:00:00 GM", try to parse directly
      const date = new Date(dateStr);
      console.log('🔍 Direct parse result:', date, 'Valid:', !isNaN(date.getTime()));
      if (!isNaN(date.getTime())) {
        const result = date.toISOString().split('T')[0];
        console.log('🔍 Successfully parsed to:', result);
        return result;
      }
      
      // If direct parsing fails and it's truncated GMT, try adding the 'T'
      if (dateStr.includes('GM') && !dateStr.includes('GMT')) {
        console.log('🔍 Attempting to fix truncated GMT...');
        const fixedStr = dateStr.replace(' GM', ' GMT');
        console.log('🔍 Fixed string:', fixedStr);
        const fixedDate = new Date(fixedStr);
        console.log('🔍 Fixed parse result:', fixedDate, 'Valid:', !isNaN(fixedDate.getTime()));
        if (!isNaN(fixedDate.getTime())) {
          const result = fixedDate.toISOString().split('T')[0];
          console.log('🔍 Successfully parsed fixed string to:', result);
          return result;
        }
      }
    } catch (error) {
      console.log('🔍 Error parsing Date.toString() format:', error);
      // If parsing fails, continue to other methods
    }
  }
  
  // If already in YYYY-MM-DD format, validate it first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.log('🔍 Already in YYYY-MM-DD format, validating...');
    // Validate that it's actually a valid date
    const date = new Date(dateStr + 'T00:00:00.000Z'); // Add time to avoid timezone issues
    if (!isNaN(date.getTime())) {
      console.log('🔍 Valid YYYY-MM-DD format, returning:', dateStr);
      return dateStr;
    }
    console.log('🔍 Invalid YYYY-MM-DD format, returning empty string');
    return "";
  }
  
  // If contains 'T', extract just the date part
  if (dateStr.includes('T')) {
    console.log('🔍 Contains T, extracting date part...');
    const result = dateStr.split('T')[0];
    // Validate the extracted part
    if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
      const date = new Date(result + 'T00:00:00.000Z');
      if (!isNaN(date.getTime())) {
        console.log('🔍 Extracted valid date part:', result);
        return result;
      }
    }
    console.log('🔍 Invalid extracted date part, returning empty string');
    return "";
  }
  
  // Try Brazilian/European format: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(dateStr);
  if (ddmmyyyy) {
    console.log('🔍 Detected DD/MM/YYYY format, converting...');
    const [, day, month, year] = ddmmyyyy;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    const result = `${year}-${paddedMonth}-${paddedDay}`;
    // Validate the constructed date
    const date = new Date(result + 'T00:00:00.000Z');
    if (!isNaN(date.getTime()) && 
        parseInt(month) >= 1 && parseInt(month) <= 12 && 
        parseInt(day) >= 1 && parseInt(day) <= 31) {
      console.log('🔍 Successfully converted DD/MM/YYYY to:', result);
      return result;
    }
    console.log('🔍 Invalid DD/MM/YYYY conversion');
  }
  
  // Try to parse as Date and format as YYYY-MM-DD (this will handle MM/DD/YYYY and other formats)
  try {
    console.log('🔍 Attempting generic Date parsing...');
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const result = date.toISOString().split('T')[0];
      console.log('🔍 Generic parse successful, result:', result);
      return result;
    }
  } catch (error) {
    console.log('🔍 Generic parse failed:', error);
    // If parsing fails, continue to return empty string
  }
  
  console.log('🔍 All parsing methods failed, returning empty string');
  return "";
};

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

  useEffect(() => {
    if (aluno && isOpen) {
      console.log('🔍 MODAL OPENED - Processing dates:');
      console.log('🔍 Original birthDate:', aluno.birthDate, 'Type:', typeof aluno.birthDate);
      console.log('🔍 Original startDate:', aluno.startDate, 'Type:', typeof aluno.startDate);
      
      const extractedBirthDate = extractDateOnly(aluno.birthDate);
      const extractedStartDate = extractDateOnly(aluno.startDate);
      
      console.log('🔍 Extracted birthDate:', extractedBirthDate);
      console.log('🔍 Extracted startDate:', extractedStartDate);
      
        // Ao popular o estado, converte números para string para os inputs text
      const newFormData = {
        ...aluno,
        birthDate: extractedBirthDate,
        startDate: extractedStartDate,
        // Converte para string ao carregar no estado, ou usa '' se for null/undefined
        weight: aluno.weight !== null && aluno.weight !== undefined ? String(aluno.weight) : '',
        height: aluno.height !== null && aluno.height !== undefined ? String(aluno.height) : '',
        trainerId: aluno.trainerId || '', // trainerId is already a string
      };
      
      console.log('🔍 Setting form data:', {
        birthDate: newFormData.birthDate,
        startDate: newFormData.startDate
      });
      
      setFormData(newFormData);
    }
    // Não limpar o form ao fechar para não causar piscar de dados se reabrir rápido
    // else if (!isOpen) {
    //    setFormData({});
    // }
  }, [aluno, isOpen]);

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
    if ((dataToSend.weight !== null && isNaN(dataToSend.weight)) || 
        (dataToSend.height !== null && isNaN(dataToSend.height))) {
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