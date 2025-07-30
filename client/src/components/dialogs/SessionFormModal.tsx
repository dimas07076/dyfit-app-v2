import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useFormPersistence } from '@/hooks/useFormPersistence';

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
  // Form persistence for session creation
  const formPersistence = useFormPersistence({
    formKey: 'novaSessao',
    initialValues: {
      aluno: '',
      data: new Date().toISOString(),
      hora: '',
      status: 'pendente' as const,
      observacoes: ''
    },
    enabled: isOpen
  });

  // Get current form values from persistence
  const aluno = formPersistence.values.aluno;
  const dataString = formPersistence.values.data;
  const data = dataString ? new Date(dataString) : new Date();
  const hora = formPersistence.values.hora;
  const status = formPersistence.values.status;
  const observacoes = formPersistence.values.observacoes;

  const setAluno = (value: string) => formPersistence.updateField('aluno', value);
  const setData = (value: Date | undefined) => formPersistence.updateField('data', value ? value.toISOString() : new Date().toISOString());
  const setHora = (value: string) => formPersistence.updateField('hora', value);
  const setStatus = (value: "confirmada" | "pendente" | "concluida" | "cancelada") => formPersistence.updateField('status', value);
  const setObservacoes = (value: string) => formPersistence.updateField('observacoes', value);

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
    formPersistence.clearPersistence();
    
    onClose();
  };

  // Enhanced close handler that clears form persistence when cancelled
  const handleClose = () => {
    formPersistence.clearPersistence();
    onClose();
  };

  const limparCampos = () => {
    formPersistence.resetForm();
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
            <Calendar selected={data} onSelect={setData} mode="single" className="border rounded-md" />
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
