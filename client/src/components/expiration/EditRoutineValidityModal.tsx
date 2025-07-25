// client/src/components/expiration/EditRoutineValidityModal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calendar, Edit3 } from "lucide-react";
import { calculateExpirationStatus } from "@/hooks/useRoutineExpiration";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EditRoutineValidityModalProps {
  routine: any;
  isOpen: boolean;
  onClose: () => void;
}

// API function for updating validity
const updateRoutineValidity = async (routineId: string, newDate: string) => {
  const response = await fetch(`/api/treinos/${routineId}/update-validity`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ newDate })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.mensagem || 'Erro ao atualizar validade');
  }
  
  return response.json();
};

export function EditRoutineValidityModal({ routine, isOpen, onClose }: EditRoutineValidityModalProps) {
  const [newValidityDate, setNewValidityDate] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize with current expiration date or tomorrow
  const initializeDate = () => {
    if (routine?.dataValidade) {
      const currentDate = parseISO(routine.dataValidade);
      return format(currentDate, 'yyyy-MM-dd');
    } else {
      return format(addDays(new Date(), 1), 'yyyy-MM-dd');
    }
  };

  // Reset form when modal opens
  const handleModalOpen = () => {
    if (isOpen && !newValidityDate) {
      setNewValidityDate(initializeDate());
    }
  };

  // Call initialization when modal opens
  useState(() => {
    handleModalOpen();
  });

  const updateValidityMutation = useMutation({
    mutationFn: ({ routineId, newDate }: { routineId: string; newDate: string }) =>
      updateRoutineValidity(routineId, newDate),
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-routines'] });
      queryClient.invalidateQueries({ queryKey: ['expiration-stats'] });
      
      toast({
        title: "Validade atualizada! ✅",
        description: `A data de validade da rotina "${routine.titulo}" foi atualizada com sucesso.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar validade",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const expirationStatus = calculateExpirationStatus(routine);
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const selectedDate = newValidityDate ? parseISO(newValidityDate) : null;

  const handleSubmit = () => {
    if (!newValidityDate) {
      toast({
        title: "Erro de validação",
        description: "Por favor, selecione uma data de validade.",
        variant: "destructive",
      });
      return;
    }

    const selectedDateObj = parseISO(newValidityDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (selectedDateObj <= today) {
      toast({
        title: "Erro de validação",
        description: "A data de validade deve ser maior que a data atual.",
        variant: "destructive",
      });
      return;
    }

    updateValidityMutation.mutate({
      routineId: routine._id,
      newDate: newValidityDate
    });
  };

  const handleClose = () => {
    if (!updateValidityMutation.isPending) {
      setNewValidityDate("");
      onClose();
    }
  };

  if (!routine) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Validade da Rotina
          </DialogTitle>
          <DialogDescription>
            Defina uma nova data de validade para a rotina "{routine.titulo}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-sm">Status Atual</span>
            </div>
            <div className="text-sm text-gray-700">
              <div>Status: <span className="font-medium">{
                expirationStatus.status === 'active' ? 'Ativa' :
                expirationStatus.status === 'expiring' ? 'Expirando' :
                expirationStatus.status === 'expired' ? 'Expirada' : 'Inativa'
              }</span></div>
              {expirationStatus.expirationDate ? (
                <div>Expira em: <span className="font-medium">{expirationStatus.expirationDate}</span></div>
              ) : (
                <div className="text-gray-500">Sem data de validade definida</div>
              )}
              {expirationStatus.daysUntilExpiration !== Infinity && (
                <div>
                  {expirationStatus.daysUntilExpiration >= 0 
                    ? `${expirationStatus.daysUntilExpiration} dias restantes`
                    : `Expirou há ${Math.abs(expirationStatus.daysUntilExpiration)} dias`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label htmlFor="validity-date" className="text-base font-medium">
              Nova Data de Validade
            </Label>
            <div className="space-y-2">
              <Input
                id="validity-date"
                type="date"
                min={tomorrow}
                value={newValidityDate}
                onChange={(e) => setNewValidityDate(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                A data deve ser maior que hoje ({format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })})
              </p>
            </div>
          </div>

          {/* New Expiration Preview */}
          {selectedDate && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm text-blue-800">Nova Data de Validade</span>
              </div>
              <div className="text-sm text-blue-700">
                <div className="font-medium">
                  {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <div className="text-xs mt-1">
                  {(() => {
                    const today = new Date();
                    const daysFromNow = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return `${daysFromNow} dias a partir de hoje`;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updateValidityMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={updateValidityMutation.isPending || !newValidityDate}
          >
            {updateValidityMutation.isPending ? "Atualizando..." : "Atualizar Validade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}