// client/src/components/dialogs/GerarConviteAlunoModal.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Copy, Check, Mail, Users, Send } from 'lucide-react';

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
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-lg border-0 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <DialogHeader className="p-8 pb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-gray-100 dark:border-gray-800">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Convidar Novo Aluno
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
                      {view === 'form' 
                        ? "Gere um link de convite personalizado para seu aluno"
                        : "Link de convite gerado com sucesso!"}
                    </DialogDescription>
                  </div>
                </motion.div>
              </DialogHeader>
              
              <div className="p-8">
                {view === 'form' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                E-mail do Aluno
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                                    placeholder="email@exemplo.com (opcional)" 
                                    className="pl-10 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20" 
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Deixe em branco para gerar um link genérico
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter className="flex gap-3 pt-6">
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={onClose}
                            className="rounded-xl border-gray-200 dark:border-gray-700"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={mutation.isPending}
                            className="rounded-xl min-w-[120px]"
                          >
                            {mutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Gerar Link
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </motion.div>
                )}

                {view === 'success' && inviteLink && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 flex items-center justify-center"
                      >
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Compartilhe este link com seu aluno para que ele possa se cadastrar
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <Input 
                          value={inviteLink} 
                          readOnly 
                          className="flex-1 bg-transparent border-0 focus:ring-0 text-xs font-mono" 
                        />
                        <Button 
                          size="sm" 
                          onClick={handleCopyLink}
                          className={`rounded-xl transition-all duration-200 ${
                            isCopied ? 'bg-green-600 hover:bg-green-700' : ''
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <DialogFooter className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleInviteAnother}
                        className="rounded-xl border-gray-200 dark:border-gray-700"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Convidar Outro
                      </Button>
                      <Button 
                        onClick={onClose}
                        className="rounded-xl"
                      >
                        Fechar
                      </Button>
                    </DialogFooter>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default GerarConviteAlunoModal;