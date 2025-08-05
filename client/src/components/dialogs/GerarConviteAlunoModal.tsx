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
import { useStudentLimit } from '@/hooks/useStudentLimit';
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
  const { canSendInvite, getLimitMessage, getRecommendations, refreshStatus } = useStudentLimit();
  const [view, setView] = useState<'form' | 'success'>('form');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

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
      refreshStatus(); // Refresh status after successful invite
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao gerar convite",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    // Check if invite can be sent before submitting
    if (!canSendInvite()) {
      const limitMessage = getLimitMessage();
      const recommendations = getRecommendations();
      
      toast({
        variant: "destructive",
        title: "Limite atingido",
        description: limitMessage || "Não é possível enviar convites no momento.",
      });
      
      // Show recommendations if available
      if (recommendations.length > 0) {
        setTimeout(() => {
          toast({
            title: "Sugestões",
            description: recommendations.join(" • "),
          });
        }, 2000);
      }
      
      return;
    }
    
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
            {/* Show limit status */}
            {!canSendInvite() && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">
                      Limite de alunos atingido
                    </h3>
                    <div className="mt-2 text-sm text-orange-700">
                      <p>{getLimitMessage()}</p>
                      {getRecommendations().length > 0 && (
                        <ul className="mt-1 list-disc list-inside">
                          {getRecommendations().map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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
                <Button 
                  type="submit" 
                  disabled={mutation.isPending || !canSendInvite()}
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gerar Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
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