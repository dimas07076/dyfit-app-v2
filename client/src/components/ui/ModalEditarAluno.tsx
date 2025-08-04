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
  console.log('🔍 Date string after trim:', `"${dateStr}"`);
  
  if (!dateStr) {
    console.log('🔍 Empty date string, returning empty string');
    return "";
  }
  
  // SPECIAL HANDLING for truncated Date.toString() format like "Mon Jul 21 2025 00:00:00 GM"
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Check if string starts with day name (common Date.toString() pattern)
  const startsWithDayName = dayNames.some(day => dateStr.startsWith(day + ' '));
  
  if (startsWithDayName) {
    console.log('🔍 Detected Date.toString() format starting with day name');
    try {
      // Try to parse manually if it's the truncated format
      // Format: "Mon Jul 21 2025 00:00:00 GM"
      const parts = dateStr.split(' ');
      console.log('🔍 Date parts:', parts);
      
      if (parts.length >= 4) {
        const monthStr = parts[1];
        const dayStr = parts[2];
        const yearStr = parts[3];
        
        const monthIndex = monthNames.indexOf(monthStr);
        if (monthIndex !== -1) {
          const year = parseInt(yearStr);
          const month = monthIndex + 1; // Convert to 1-based month
          const day = parseInt(dayStr);
          
          console.log('🔍 Parsed components - Year:', year, 'Month:', month, 'Day:', day);
          
          if (!isNaN(year) && !isNaN(day) && year > 1900 && year < 2100 && 
              month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const result = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            console.log('🔍 Manual parse successful:', result);
            
            // Validate the constructed date
            const testDate = new Date(result + 'T00:00:00.000Z');
            if (!isNaN(testDate.getTime())) {
              return result;
            }
          }
        }
      }
      
      // If manual parsing fails, try fixing the truncated GMT and parsing normally
      let fixedStr = dateStr;
      if (dateStr.includes(' GM') && !dateStr.includes(' GMT')) {
        fixedStr = dateStr.replace(' GM', ' GMT');
        console.log('🔍 Fixed truncated GMT:', fixedStr);
      }
      
      const date = new Date(fixedStr);
      console.log('🔍 Date parsing result:', date, 'Valid:', !isNaN(date.getTime()));
      if (!isNaN(date.getTime())) {
        const result = date.toISOString().split('T')[0];
        console.log('🔍 Successfully parsed to:', result);
        return result;
      }
    } catch (error) {
      console.log('🔍 Error parsing Date.toString() format:', error);
    }
  }
  
  // If already in YYYY-MM-DD format, validate it first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.log('🔍 Already in YYYY-MM-DD format, validating...');
    const date = new Date(dateStr + 'T00:00:00.000Z');
    if (!isNaN(date.getTime())) {
      console.log('🔍 Valid YYYY-MM-DD format, returning:', dateStr);
      return dateStr;
    }
    console.log('🔍 Invalid YYYY-MM-DD format');
  }
  
  // If contains 'T', extract just the date part
  if (dateStr.includes('T')) {
    console.log('🔍 Contains T, extracting date part...');
    const result = dateStr.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(result)) {
      const date = new Date(result + 'T00:00:00.000Z');
      if (!isNaN(date.getTime())) {
        console.log('🔍 Extracted valid date part:', result);
        return result;
      }
    }
  }
  
  // Try Brazilian/European format: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(dateStr);
  if (ddmmyyyy) {
    console.log('🔍 Detected DD/MM/YYYY format, converting...');
    const [, day, month, year] = ddmmyyyy;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    const result = `${year}-${paddedMonth}-${paddedDay}`;
    const date = new Date(result + 'T00:00:00.000Z');
    if (!isNaN(date.getTime()) && 
        parseInt(month) >= 1 && parseInt(month) <= 12 && 
        parseInt(day) >= 1 && parseInt(day) <= 31) {
      console.log('🔍 Successfully converted DD/MM/YYYY to:', result);
      return result;
    }
  }
  
  // Try generic Date parsing as last resort
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
  }
  
  console.log('🔍 ❌ All parsing methods failed, returning empty string');
  return "";
};

// Test function to validate extractDateOnly with known values
const testExtractDateOnly = () => {
  console.log('🧪 ============ TESTING extractDateOnly ============');
  const testCases = [
    'Mon Jul 21 2025 00:00:00 GM',           // Truncated GMT format
    'Mon Jul 21 2025 00:00:00 GMT',          // Full GMT format
    '2025-07-21',                            // YYYY-MM-DD format
    '2025-07-21T00:00:00.000Z',              // ISO format
    '21/07/2025',                            // DD/MM/YYYY format
    '21-07-2025',                            // DD-MM-YYYY format
    new Date('2025-07-21'),                  // Date object
    null,                                    // null value
    undefined,                               // undefined value
    '',                                      // empty string
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`🧪 Test ${index + 1}: Input:`, testCase);
    const result = extractDateOnly(testCase);
    console.log(`🧪 Test ${index + 1}: Result:`, `"${result}"`);
    console.log('🧪 ---');
  });
  console.log('🧪 ================ TESTS COMPLETE ================');
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
      console.log('🔍 =================== MODAL OPENED ===================');
      
      // Run test cases first to validate the function
      testExtractDateOnly();
      
      console.log('🔍 Raw aluno object:', aluno);
      console.log('🔍 Original birthDate:', aluno.birthDate, 'Type:', typeof aluno.birthDate);
      console.log('🔍 Original startDate:', aluno.startDate, 'Type:', typeof aluno.startDate);
      
      const extractedBirthDate = extractDateOnly(aluno.birthDate);
      const extractedStartDate = extractDateOnly(aluno.startDate);
      
      console.log('🔍 ============ EXTRACTION RESULTS ============');
      console.log('🔍 Extracted birthDate:', `"${extractedBirthDate}"`);
      console.log('🔍 Extracted startDate:', `"${extractedStartDate}"`);
      
      // Create the form data object
      const newFormData = {
        ...aluno,
        birthDate: extractedBirthDate,
        startDate: extractedStartDate,
        weight: aluno.weight !== null && aluno.weight !== undefined ? String(aluno.weight) : '',
        height: aluno.height !== null && aluno.height !== undefined ? String(aluno.height) : '',
        trainerId: aluno.trainerId || '',
      };
      
      console.log('🔍 ============ FORM DATA BEING SET ============');
      console.log('🔍 Complete form data:', newFormData);
      console.log('🔍 Form birthDate value:', `"${newFormData.birthDate}"`);
      console.log('🔍 Form startDate value:', `"${newFormData.startDate}"`);
      console.log('🔍 ===============================================');
      
      setFormData(newFormData);
      
      // Add a small delay to check if the form inputs receive the values
      setTimeout(() => {
        const birthDateInput = document.getElementById('birthDate') as HTMLInputElement;
        const startDateInput = document.getElementById('startDate') as HTMLInputElement;
        console.log('🔍 ========== INPUT VALUES AFTER SETTING ==========');
        console.log('🔍 Birth date input value:', `"${birthDateInput?.value || 'NOT_FOUND'}"`);
        console.log('🔍 Start date input value:', `"${startDateInput?.value || 'NOT_FOUND'}"`);
        console.log('🔍 Birth date input validity:', birthDateInput?.validity);
        console.log('🔍 Start date input validity:', startDateInput?.validity);
        console.log('🔍 ===============================================');
      }, 100);
    }
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
    console.log('🔍 ============ FORM SUBMISSION STARTED ============');
    console.log('🔍 Current formData:', formData);
    console.log('🔍 Birth date value:', `"${formData.birthDate}"`);
    console.log('🔍 Start date value:', `"${formData.startDate}"`);
    
    if (!aluno?._id) {
        toast({ title: "ID do aluno não encontrado", variant: "destructive" });
        return;
    }

    // Basic validation for required fields
    if (!formData.nome?.trim()) {
        console.log('🔍 ❌ Validation failed: Nome is required');
        toast({ title: "Nome é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.email?.trim()) {
        console.log('🔍 ❌ Validation failed: Email is required');
        toast({ title: "Email é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.birthDate) {
        console.log('🔍 ❌ Validation failed: Birth date is required');
        console.log('🔍 Birth date value was:', `"${formData.birthDate}"`);
        toast({ title: "Data de nascimento é obrigatória", variant: "destructive" });
        return;
    }
    if (!formData.gender) {
        console.log('🔍 ❌ Validation failed: Gender is required');
        toast({ title: "Gênero é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.goal) {
        console.log('🔍 ❌ Validation failed: Goal is required');
        toast({ title: "Objetivo é obrigatório", variant: "destructive" });
        return;
    }
    if (!formData.startDate) {
        console.log('🔍 ❌ Validation failed: Start date is required');
        console.log('🔍 Start date value was:', `"${formData.startDate}"`);
        toast({ title: "Data de início é obrigatória", variant: "destructive" });
        return;
    }
    if (!formData.status) {
        console.log('🔍 ❌ Validation failed: Status is required');
        toast({ title: "Status é obrigatório", variant: "destructive" });
        return;
    }

    console.log('🔍 ✅ All validations passed!');
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
                <Input 
                  id="birthDate" 
                  name="birthDate" 
                  type="date" 
                  value={formData.birthDate || ""} 
                  onChange={handleChange}
                  onInvalid={(e) => {
                    console.log('🔍 ❌ Birth date input is invalid:', e.currentTarget.value);
                    console.log('🔍 ❌ Input validity:', e.currentTarget.validity);
                  }}
                  onLoad={() => {
                    console.log('🔍 Birth date input loaded with value:', formData.birthDate);
                  }}
                />
                {/* Debug info */}
                <div style={{fontSize: '10px', color: 'gray', marginTop: '2px'}}>
                  Debug: "{formData.birthDate || 'EMPTY'}"
                </div>
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
                <Input 
                  id="startDate" 
                  name="startDate" 
                  type="date" 
                  value={formData.startDate || ""} 
                  onChange={handleChange}
                  onInvalid={(e) => {
                    console.log('🔍 ❌ Start date input is invalid:', e.currentTarget.value);
                    console.log('🔍 ❌ Input validity:', e.currentTarget.validity);
                  }}
                />
                {/* Debug info */}
                <div style={{fontSize: '10px', color: 'gray', marginTop: '2px'}}>
                  Debug: "{formData.startDate || 'EMPTY'}"
                </div>
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