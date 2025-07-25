// client/src/components/expiration/ExpirationNotice.tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, PhoneCall, Mail } from "lucide-react";
import { calculateExpirationStatus } from "@/hooks/useRoutineExpiration";
import { cn } from "@/lib/utils";

interface ExpirationNoticeProps {
  routine: any;
  personalContact?: {
    nome: string;
    email?: string;
    telefone?: string;
  };
  onContactPersonal?: () => void;
  className?: string;
}

export function ExpirationNotice({ 
  routine, 
  personalContact, 
  onContactPersonal, 
  className 
}: ExpirationNoticeProps) {
  const expirationStatus = calculateExpirationStatus(routine);

  // Don't show notice for active routines with more than 5 days
  if (expirationStatus.status === 'active' && expirationStatus.daysUntilExpiration > 5) {
    return null;
  }

  const getNoticeConfig = () => {
    switch (expirationStatus.status) {
      case 'expiring':
        return {
          variant: 'default' as const,
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          title: 'Sua rotina expira em breve! ⚠️',
          description: `Sua rotina "${routine.titulo}" expira em ${expirationStatus.daysUntilExpiration} dias (${expirationStatus.expirationDate}). Entre em contato com seu personal trainer para renovar.`,
          urgent: false
        };
      
      case 'expired':
        return {
          variant: 'destructive' as const,
          icon: Clock,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200',
          title: 'Rotina expirada hoje! ⏰',
          description: `Sua rotina "${routine.titulo}" expirou em ${expirationStatus.expirationDate}. Sua rotina precisa ser renovada para continuar.`,
          urgent: true
        };
      
      case 'inactive':
        return {
          variant: 'destructive' as const,
          icon: Clock,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
          title: 'Rotina inativa 🚫',
          description: `Sua rotina "${routine.titulo}" está inativa desde ${expirationStatus.expirationDate}. Contate seu personal trainer para reativar.`,
          urgent: true
        };
      
      default:
        return null;
    }
  };

  const config = getNoticeConfig();
  if (!config) return null;

  const { variant, icon: Icon, iconColor, bgColor, title, description, urgent } = config;

  return (
    <Card className={cn("w-full", urgent && "border-red-300 shadow-lg", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={cn("h-5 w-5", iconColor)} />
          {title}
        </CardTitle>
        <CardDescription className="text-base">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Contact Information */}
          {personalContact && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Seu Personal Trainer:
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-medium">{personalContact.nome}</div>
                {personalContact.email && (
                  <div className="flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3" />
                    {personalContact.email}
                  </div>
                )}
                {personalContact.telefone && (
                  <div className="flex items-center gap-1 mt-1">
                    <PhoneCall className="h-3 w-3" />
                    {personalContact.telefone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {onContactPersonal && (
              <Button 
                onClick={onContactPersonal}
                className="flex-1"
                variant={urgent ? "default" : "outline"}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Contatar Personal
              </Button>
            )}
            
            {personalContact?.email && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = `mailto:${personalContact.email}?subject=Renovação de Rotina - ${routine.titulo}`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar E-mail
              </Button>
            )}
          </div>
          
          {urgent && (
            <Alert className={cn("mt-4", bgColor)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> Enquanto sua rotina estiver {expirationStatus.status === 'expired' ? 'expirada' : 'inativa'}, 
                você não terá acesso aos exercícios. Entre em contato com seu personal trainer o quanto antes.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
export function CompactExpirationNotice({ routine, className }: { routine: any; className?: string }) {
  const expirationStatus = calculateExpirationStatus(routine);

  // Don't show notice for active routines with more than 5 days
  if (expirationStatus.status === 'active' && expirationStatus.daysUntilExpiration > 5) {
    return null;
  }

  const getAlertVariant = () => {
    switch (expirationStatus.status) {
      case 'expiring':
        return 'default';
      case 'expired':
      case 'inactive':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getMessage = () => {
    switch (expirationStatus.status) {
      case 'expiring':
        return `⚠️ Rotina expira em ${expirationStatus.daysUntilExpiration} dias. Contate seu personal trainer.`;
      case 'expired':
        return `⏰ Rotina expirada. Entre em contato com seu personal trainer.`;
      case 'inactive':
        return `🚫 Rotina inativa. Entre em contato com seu personal trainer.`;
      default:
        return '';
    }
  };

  const message = getMessage();
  if (!message) return null;

  return (
    <Alert variant={getAlertVariant() as any} className={cn("mb-4", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}