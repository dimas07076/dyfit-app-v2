import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePersistedState } from '@/hooks/usePersistedState';

interface Sessao {
  id: string;
  aluno: string;
  data: Date;
  hora: string;
  status: "confirmada" | "pendente" | "concluida" | "cancelada";
  observacoes?: string;
}

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (novaSessao: Sessao) => void;
}

export default function SessionFormModal({ isOpen, onClose, onSave }: SessionFormModalProps) {
  // Persisted state for each form field
  const [aluno, setAluno, clearAluno] = usePersistedState("formNovaSessao_aluno", "");
  const [dataString, setDataString, clearDataString] = usePersistedState("formNovaSessao_data", new Date().toISOString());
  const [hora, setHora, clearHora] = usePersistedState("formNovaSessao_hora", "");
  const [status, setStatus, clearStatus] = usePersistedState<"confirmada" | "pendente" | "concluida" | "cancelada">("formNovaSessao_status", "pendente");
  const [observacoes, setObservacoes, clearObservacoes] = usePersistedState("formNovaSessao_observacoes", "");

  // Convert dataString to Date for calendar component
  const data = dataString ? new Date(dataString) : new Date();
  
  const handleSetData = (value: Date | undefined) => {
    setDataString(value ? value.toISOString() : new Date().toISOString());
  };

  const handleSalvar = () => {
    if (!aluno || !data || !hora) return alert("Preencha todos os campos obrigatórios.");

    const novaSessao: Sessao = {
      id: Date.now().toString(),
      aluno,
      data,
      hora,
      status,
      observacoes,
    };

    onSave(novaSessao);
    
    // Clear form persistence on successful save
    clearAluno();
    clearDataString();
    clearHora();
    clearStatus();
    clearObservacoes();
    
    onClose();
  };

  // Enhanced close handler that clears form persistence when cancelled
  const handleClose = () => {
    clearAluno();
    clearDataString();
    clearHora();
    clearStatus();
    clearObservacoes();
    onClose();
  };

  const limparCampos = () => {
    clearAluno();
    clearDataString();
    clearHora();
    clearStatus();
    clearObservacoes();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Sessão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nome do aluno" value={aluno} onChange={(e) => setAluno(e.target.value)} />
          <div className="flex gap-2 items-center">
            <Calendar selected={data} onSelect={handleSetData} mode="single" className="border rounded-md" />
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-1/2" />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Status da sessão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Observações (opcional)"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              Salvar Sessão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
