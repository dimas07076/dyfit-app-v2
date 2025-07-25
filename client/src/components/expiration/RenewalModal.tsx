// client/src/components/expiration/RenewalModal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar, RotateCcw } from "lucide-react";
import { useRoutineRenewal, calculateExpirationStatus } from "@/hooks/useRoutineExpiration";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RenewalModalProps {
  routine: any;
  isOpen: boolean;
  onClose: () => void;
}

const VALIDITY_OPTIONS = [
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias (padrão)" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

export function RenewalModal({ routine, isOpen, onClose }: RenewalModalProps) {
  const [validityDays, setValidityDays] = useState(30);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  
  const { mutate: renewRoutine, isPending } = useRoutineRenewal();
  const { toast } = useToast();

  const expirationStatus = calculateExpirationStatus(routine);
  const daysToUse = useCustom ? parseInt(customDays) || 30 : validityDays;
  const newExpirationDate = addDays(new Date(), daysToUse);

  const handleRenewal = () => {
    if (useCustom && (!customDays || parseInt(customDays) < 1)) {
      toast({
        title: "Erro de validação",
        description: "Por favor, insira um número válido de dias (mínimo 1).",
        variant: "destructive",
      });
      return;
    }

    renewRoutine(
      { routineId: routine._id, validityDays: daysToUse },
      {
        onSuccess: () => {
          toast({
            title: "Rotina renovada! ✅",
            description: `A rotina "${routine.titulo}" foi renovada por ${daysToUse} dias.`,
          });
          onClose();
        },
        onError: (error: any) => {
          toast({
            title: "Erro ao renovar rotina",
            description: error.message || "Ocorreu um erro inesperado.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    if (!isPending) {
      setValidityDays(30);
      setCustomDays("");
      setUseCustom(false);
      onClose();
    }
  };

  if (!routine) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Renovar Rotina
          </DialogTitle>
          <DialogDescription>
            Configure o período de validade para a rotina "{routine.titulo}"
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
              {expirationStatus.expirationDate && (
                <div>Expira em: <span className="font-medium">{expirationStatus.expirationDate}</span></div>
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

          {/* Validity Period Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Período de Validade</Label>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="validity-select">Opções predefinidas</Label>
                <Select 
                  value={useCustom ? "" : validityDays.toString()} 
                  onValueChange={(value) => {
                    setValidityDays(parseInt(value));
                    setUseCustom(false);
                  }}
                  disabled={useCustom}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {VALIDITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-1" />
                <span className="text-sm text-gray-500">ou</span>
                <hr className="flex-1" />
              </div>

              <div>
                <Label htmlFor="custom-days">Período personalizado</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="custom-days"
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Ex: 45"
                    value={customDays}
                    onChange={(e) => {
                      setCustomDays(e.target.value);
                      setUseCustom(!!e.target.value);
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* New Expiration Preview */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-800">Nova Data de Expiração</span>
            </div>
            <div className="text-sm text-green-700">
              <div className="font-medium">
                {format(newExpirationDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="text-xs mt-1">
                A rotina será válida por {daysToUse} dias a partir de hoje
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleRenewal} disabled={isPending}>
            {isPending ? "Renovando..." : "Renovar Rotina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}