// client/src/components/dialogs/GerarConviteAlunoModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Copy, Check } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email("Se preenchido, deve ser um e-mail válido.").optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface GerarConviteAlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GerarConviteAlunoModal: React.FC<GerarConviteAlunoModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [view, setView] = useState<'form' | 'success'>('form');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  // Verifica se o personal tem vagas antes de permitir gerar convite
  useEffect(() => {
    async function checkSlots() {
      try {
        const res: any = await apiRequest("GET", "/api/personal/can-activate/1");
        if (!res?.canActivate) {
          toast({
            variant: "destructive",
            title: "Limite de alunos atingido",
            description: "Seu plano atual não permite convidar mais alunos. Faça upgrade ou compre tokens avulsos."
          });
          onClose(); // fecha a modal
        }
      } catch (error) {
        console.error("Erro ao verificar limite de convites:", error);
      }
    }
    if (isOpen) {
      checkSlots();
    }
  }, [isOpen, onClose, toast]);

  // Reseta o formulário quando a modal fecha
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        form.reset();
        setView('form');
        setInviteLink(null);
        setIsCopied(false);
      }, 300);
    }
  }, [isOpen, form]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest<{ linkConvite: string }>("POST", "/api/aluno/convite", { emailConvidado: data.email || undefined }),
    onSuccess: (data) => {
      setInviteLink(data.linkConvite);
      setView('success');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao gerar convite",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        setIsCopied(true);
        toast({ title: "Sucesso!", description: "Link copiado para a área de transferência." });
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const handleInviteAnother = () => {
    form.reset();
    setView('form');
    setInviteLink(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Novo Aluno</DialogTitle>
          <DialogDescription>
            {view === 'form' 
              ? "Insira o e-mail do aluno (opcional) ou gere um link de convite genérico."
              : "Link de convite gerado! Envie para o seu aluno."}
          </DialogDescription>
        </DialogHeader>
        {view === 'form' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="my-4">
                    <FormLabel>E-mail do Aluno (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nome@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4 flex flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => onClose()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gerar Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {view === 'success' && inviteLink && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-between w-full p-2 border rounded-md">
              <span className="break-all text-sm">{inviteLink}</span>
              <Button type="button" variant="ghost" size="icon" onClick={handleCopyLink}>
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex justify-end w-full space-x-2">
              <Button variant="outline" onClick={handleInviteAnother}>Convidar Outro</Button>
              <Button onClick={() => onClose()}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GerarConviteAlunoModal;
