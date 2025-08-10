// client/src/forms/student-form.enhanced.tsx - Enhanced student form with robust token integration
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Aluno } from '@/types/aluno';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useEffect, MutableRefObject, useState, useCallback } from 'react';
import { formatDateForInput } from '@/utils/dateUtils';
import { TokenInfoDisplay } from '@/components/TokenInfoDisplay';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Validation functions
const requiredNumericString = (fieldName: string) => z.string().min(1, `${fieldName} é obrigatório.`).refine((val) => !isNaN(parseFloat(val.replace(',', '.'))), { message: "Deve ser um número." });
const requiredIntegerString = (fieldName: string) => z.string().min(1, `${fieldName} é obrigatório.`).refine((val) => /^\d+$/.test(val), { message: "Deve ser um número inteiro." });

// Enhanced schema with better validation
const createStudentFormSchema = (isEditing: boolean) => z.object({
    nome: z.string().min(3, "Nome completo é obrigatório."),
    email: z.string().email("E-mail inválido."),
    phone: z.string().optional(),
    birthDate: z.string().min(1, "Data de nascimento é obrigatória."),
    gender: z.enum(['masculino', 'feminino', 'outro']),
    goal: z.string().min(1, "Objetivo é obrigatório."),
    weight: requiredNumericString("Peso"),
    height: requiredIntegerString("Altura"),
    startDate: z.string().min(1, "Data de início é obrigatória."),
    status: z.enum(['active', 'inactive']),
    notes: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
}).superRefine((data, ctx) => {
    const password = data.password || "";
    const confirmPassword = data.confirmPassword || "";

    if (!isEditing) {
        // Creation mode - password required
        if (password.length < 6) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A senha deve ter no mínimo 6 caracteres.", path: ["password"] });
        }
        if (password !== confirmPassword) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "As senhas não coincidem.", path: ["confirmPassword"] });
        }
    } else {
        // Edit mode - password optional
        if (password.length > 0) {
            if (password.length < 6) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A nova senha deve ter no mínimo 6 caracteres.", path: ["password"] });
            }
            if (password !== confirmPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "As senhas não coincidem.", path: ["confirmPassword"] });
            }
        } else if (confirmPassword.length > 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Digite a nova senha primeiro.", path: ["password"] });
        }
    }
});

type StudentFormValues = z.infer<ReturnType<typeof createStudentFormSchema>>;

export interface StudentFormDataProcessed {
    nome: string; 
    email: string; 
    phone?: string; 
    birthDate: string;
    gender: 'masculino' | 'feminino' | 'outro'; 
    goal: string; 
    weight: number;
    height: number; 
    startDate: string; 
    status: 'active' | 'inactive'; 
    notes?: string;
    password?: string;
}

interface EnhancedStudentFormProps { 
    onSubmit: (data: StudentFormDataProcessed) => void; 
    isLoading?: boolean; 
    initialData?: Aluno; 
    isEditing?: boolean; 
    onCancel?: () => void; 
    disabled?: boolean; 
    tokenRefreshRef?: MutableRefObject<{ refetch: () => void; forceRefresh: () => Promise<void> } | null>;
    onStatusChange?: (newStatus: 'active' | 'inactive', oldStatus?: 'active' | 'inactive') => void;
}

// Enhanced Token Status Section Component
const TokenStatusSection = ({ 
    studentId, 
    currentStatus, 
    tokenRefreshRef,
    onStatusChangeDetected 
}: {
    studentId?: string;
    currentStatus: 'active' | 'inactive';
    tokenRefreshRef?: MutableRefObject<{ refetch: () => void; forceRefresh: () => Promise<void> } | null>;
    onStatusChangeDetected?: (newStatus: 'active' | 'inactive') => void;
}) => {
    const { tokenInfo, isLoading: tokenLoading, refetch: refetchTokenInfo, forceRefresh: forceRefreshTokenInfo } = useTokenInfo(studentId);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Expose refetch functions via ref
    useEffect(() => {
        if (tokenRefreshRef) {
            tokenRefreshRef.current = { 
                refetch: refetchTokenInfo,
                forceRefresh: forceRefreshTokenInfo
            };
        }
    }, [tokenRefreshRef, refetchTokenInfo, forceRefreshTokenInfo]);

    const handleManualRefresh = useCallback(async () => {
        if (!studentId) return;
        
        setRefreshing(true);
        console.log(`[TokenStatusSection] Manual refresh triggered for student ${studentId}`);
        
        try {
            await forceRefreshTokenInfo();
            setLastRefresh(new Date());
            console.log(`[TokenStatusSection] Manual refresh completed for student ${studentId}`);
        } catch (error) {
            console.error(`[TokenStatusSection] Manual refresh failed for student ${studentId}:`, error);
        } finally {
            setRefreshing(false);
        }
    }, [studentId, forceRefreshTokenInfo]);

    if (!studentId) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Token será atribuído após salvar o aluno
                    </p>
                </CardContent>
            </Card>
        );
    }

    const getStatusPrediction = (currentStatus: 'active' | 'inactive') => {
        if (currentStatus === 'active' && !tokenInfo) {
            return {
                type: 'info' as const,
                message: 'Um token será atribuído automaticamente ao ativar este aluno.'
            };
        } else if (currentStatus === 'inactive' && tokenInfo) {
            return {
                type: 'warning' as const,
                message: 'O token associado será liberado ao desativar este aluno.'
            };
        }
        return null;
    };

    const statusPrediction = getStatusPrediction(currentStatus);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Status do Token</h4>
                <div className="flex items-center gap-2">
                    {lastRefresh && (
                        <span className="text-xs text-muted-foreground">
                            Atualizado: {lastRefresh.toLocaleTimeString()}
                        </span>
                    )}
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={refreshing || tokenLoading}
                        className="h-8 px-2"
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                </div>
            </div>

            <TokenInfoDisplay 
                tokenInfo={tokenInfo} 
                isLoading={tokenLoading || refreshing}
                showTitle={false}
            />

            {statusPrediction && (
                <Alert className={statusPrediction.type === 'warning' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                        {statusPrediction.message}
                    </AlertDescription>
                </Alert>
            )}

            {/* Current Status Indicator */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <span className="text-sm font-medium">Status Atual:</span>
                <Badge variant={currentStatus === 'active' ? 'default' : 'secondary'}>
                    {currentStatus === 'active' ? (
                        <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                        </>
                    ) : (
                        <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inativo
                        </>
                    )}
                </Badge>
            </div>
        </div>
    );
};

export function EnhancedStudentForm({ 
    onSubmit: onSubmitProp, 
    isLoading = false, 
    initialData, 
    isEditing = false, 
    onCancel, 
    disabled = false, 
    tokenRefreshRef,
    onStatusChange
}: EnhancedStudentFormProps) {
    const [currentStatus, setCurrentStatus] = useState<'active' | 'inactive'>(
        initialData?.status || 'active'
    );
    
    // Form persistence for new students only
    const persistedForm = useFormPersistence({
        formKey: 'novo_aluno',
        initialValues: {
            nome: "", email: "", phone: "", birthDate: "", gender: undefined, goal: "",
            weight: "", height: "", startDate: "", status: 'active', notes: "",
            password: "", confirmPassword: ""
        },
        enabled: !isEditing
    });

    // Determine initial values
    const getInitialValues = () => {
        if (isEditing) {
            return {
                nome: initialData?.nome || "", 
                email: initialData?.email || "", 
                phone: initialData?.phone || "",
                birthDate: formatDateForInput(initialData?.birthDate),
                gender: initialData?.gender as any || undefined, 
                goal: initialData?.goal || "",
                weight: initialData?.weight ? String(initialData.weight) : '', 
                height: initialData?.height ? String(initialData.height) : '',
                startDate: formatDateForInput(initialData?.startDate),
                status: initialData?.status || 'active', 
                notes: initialData?.notes || "",
                password: "", 
                confirmPassword: ""
            };
        } else {
            return {
                nome: persistedForm.values.nome || "", 
                email: persistedForm.values.email || "", 
                phone: persistedForm.values.phone || "",
                birthDate: persistedForm.values.birthDate || "",
                gender: persistedForm.values.gender || undefined, 
                goal: persistedForm.values.goal || "",
                weight: persistedForm.values.weight || '', 
                height: persistedForm.values.height || '',
                startDate: persistedForm.values.startDate || "",
                status: persistedForm.values.status || 'active', 
                notes: persistedForm.values.notes || "",
                password: persistedForm.values.password || "", 
                confirmPassword: persistedForm.values.confirmPassword || ""
            };
        }
    };

    const form = useForm<StudentFormValues>({
        resolver: zodResolver(createStudentFormSchema(isEditing)),
        defaultValues: getInitialValues(),
    });

    // Watch form changes and sync with persistence for new students
    const watchedValues = form.watch();
    const watchedStatus = form.watch('status');
    
    useEffect(() => {
        if (!isEditing) {
            const hasAnyValue = Object.values(watchedValues).some(value => 
                value !== undefined && value !== null && value !== ""
            );
            if (hasAnyValue) {
                persistedForm.updateFields(watchedValues);
            }
        }
    }, [watchedValues, isEditing, persistedForm]);

    // Handle status changes with callback
    useEffect(() => {
        if (watchedStatus !== currentStatus) {
            const oldStatus = currentStatus;
            setCurrentStatus(watchedStatus);
            
            console.log(`[EnhancedStudentForm] Status changed from ${oldStatus} to ${watchedStatus}`);
            
            if (onStatusChange) {
                onStatusChange(watchedStatus, oldStatus);
            }
        }
    }, [watchedStatus, currentStatus, onStatusChange]);

    function handleFormSubmit(data: StudentFormValues) {
        const { confirmPassword, ...restOfData } = data;
        const processedData: StudentFormDataProcessed = {
            ...restOfData,
            weight: parseFloat(data.weight.replace(',', '.')),
            height: parseInt(data.height, 10),
            password: data.password && data.password.trim() !== '' ? data.password : undefined,
        };
        
        console.log(`[EnhancedStudentForm] Form submitted with status: ${processedData.status}`);
        
        // Clear persistence before submitting for new students
        if (!isEditing) {
            persistedForm.clearPersistence();
        }
        
        onSubmitProp(processedData);
    }

    const handleCancel = () => {
        // Clear persistence when cancelled for new students
        if (!isEditing) {
            persistedForm.clearPersistence();
        }
        
        if (onCancel) {
            onCancel();
        } else {
            window.history.back();
        }
    };

    const passwordValue = form.watch('password');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                {/* Dados Pessoais */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField 
                            control={form.control} 
                            name="nome" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome completo*</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Digite o nome completo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="email" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email*</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="exemplo@email.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="phone" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="birthDate" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de nascimento*</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="gender" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gênero*</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o gênero" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="masculino">Masculino</SelectItem>
                                            <SelectItem value="feminino">Feminino</SelectItem>
                                            <SelectItem value="outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                    </div>
                </div>

                {/* Medidas Corporais */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Medidas Corporais</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField 
                            control={form.control} 
                            name="weight" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Peso (kg)*</FormLabel>
                                    <FormControl>
                                        <Input type="text" inputMode="decimal" placeholder="Ex: 75,5" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="height" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Altura (cm)*</FormLabel>
                                    <FormControl>
                                        <Input type="text" inputMode="numeric" placeholder="Ex: 178" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                    </div>
                </div>

                {/* Credenciais de Acesso */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Credenciais de Acesso</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField 
                            control={form.control} 
                            name="password" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isEditing ? 'Nova Senha (Opcional)' : 'Senha*'}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="password" 
                                            placeholder={isEditing ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'} 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        {(passwordValue && passwordValue.trim() !== '') || !isEditing ? (
                             <FormField 
                                control={form.control} 
                                name="confirmPassword" 
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmar Senha*</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Repita a senha" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} 
                            />
                        ) : null}
                    </div>
                </div>

                {/* Token Information - Enhanced Section for Editing */}
                {isEditing && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Gestão de Token</h3>
                        <TokenStatusSection 
                            studentId={initialData?._id}
                            currentStatus={currentStatus}
                            tokenRefreshRef={tokenRefreshRef}
                        />
                    </div>
                )}

                 {/* Metas e Status */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold border-b pb-2">Metas e Status</h3>
                    <div className="space-y-4">
                        <FormField 
                            control={form.control} 
                            name="goal" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Objetivo*</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o objetivo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                                            <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                                            <SelectItem value="Outros">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="startDate" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de início*</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="status" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status*</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="active">Ativo</SelectItem>
                                            <SelectItem value="inactive">Inativo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        
                        <FormField 
                            control={form.control} 
                            name="notes" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Observações adicionais..." 
                                            {...field} 
                                            value={field.value ?? ''} 
                                            rows={4} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                    </div>
                </div>
                
                <Separator className="my-8" />
                
                <div className="flex justify-end space-x-3">
                    <Button variant="outline" type="button" onClick={handleCancel} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading || disabled}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Salvar Alterações" : "Adicionar Aluno"}
                    </Button>
                </div>
                
                {disabled && !isLoading && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                        Formulário desabilitado devido ao limite de alunos atingido.
                    </p>
                )}
            </form>
        </Form>
    );
}