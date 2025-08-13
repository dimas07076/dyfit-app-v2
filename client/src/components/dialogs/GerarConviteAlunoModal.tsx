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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { useSlotAvailability } from '@/hooks/use-slot-management';
import LoadingSpinner from '@/components/LoadingSpinner';

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

  // Check slot availability for invites
  const { data: slotCheck, isLoading: isCheckingSlots, error: slotError } = useSlotAvailability(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

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

  const canCreateInvite = slotCheck?.podeAtivar === true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <>
            {isCheckingSlots ? (
              <div className="py-8">
                <LoadingSpinner text="Verificando disponibilidade de slots..." />
              </div>
            ) : !canCreateInvite ? (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Limite de alunos atingido!</strong></p>
                    <p>{slotCheck?.message || 'Você atingiu o limite de alunos do seu plano atual.'}</p>
                    {slotCheck?.details && (
                      <div className="text-sm mt-2">
                        {slotCheck.details.plano && (
                          <p>
                            Plano {slotCheck.details.plano.tipo}: {slotCheck.details.plano.utilizados}/{slotCheck.details.plano.limite} alunos
                          </p>
                        )}
                        {slotCheck.details.tokens && slotCheck.details.tokens.disponiveis > 0 && (
                          <p>Tokens disponíveis: {slotCheck.details.tokens.disponiveis}</p>
                        )}
                      </div>
                    )}
                    <p className="text-sm">Para convidar novos alunos, você precisa de slots disponíveis em seu plano ou tokens avulsos.</p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail do Aluno (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={mutation.isPending || !canCreateInvite}>
                      {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Gerar Link
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
            
            {!canCreateInvite && (
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>Fechar</Button>
              </DialogFooter>
            )}
          </>
        )}

        {view === 'success' && inviteLink && (
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input value={inviteLink} readOnly className="flex-1" />
              <Button size="icon" onClick={handleCopyLink}>
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleInviteAnother}>Convidar Outro</Button>
                <Button onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GerarConviteAlunoModal;