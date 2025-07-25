// client/src/components/expiration/ExpiredRoutineBlocker.tsx
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, PhoneCall, Mail, AlertTriangle } from "lucide-react";
import { calculateExpirationStatus } from "@/hooks/useRoutineExpiration";
import { cn } from "@/lib/utils";

interface ExpiredRoutineBlockerProps {
  routine: any;
  children: ReactNode;
  personalContact?: {
    nome: string;
    email?: string;
    telefone?: string;
  };
  onContactPersonal?: () => void;
  allowGracePeriod?: boolean;
  className?: string;
}

export function ExpiredRoutineBlocker({
  routine,
  children,
  personalContact,
  onContactPersonal,
  allowGracePeriod = true,
  className
}: ExpiredRoutineBlockerProps) {
  const expirationStatus = calculateExpirationStatus(routine);

  // Allow access for active and expiring routines
  if (expirationStatus.status === 'active' || expirationStatus.status === 'expiring') {
    return <>{children}</>;
  }

  // Allow access during grace period if enabled
  if (allowGracePeriod && expirationStatus.status === 'expired') {
    return (
      <div className={className}>
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Aviso:</strong> Sua rotina expirou, mas ainda está acessível por tempo limitado. 
            Entre em contato com seu personal trainer para renovar.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Block access for inactive routines
  return (
    <div className={cn("w-full", className)}>
      <Card className="border-red-300 bg-red-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-800">
            Rotina Inativa 🚫
          </CardTitle>
          <CardDescription className="text-red-700">
            Sua rotina "{routine.titulo}" está inativa e não pode ser acessada no momento
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Expiration Info */}
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <div className="text-sm space-y-2">
              <div>
                <span className="font-medium">Status:</span> 
                <span className="ml-2 text-red-600">Inativa</span>
              </div>
              {expirationStatus.expirationDate && (
                <div>
                  <span className="font-medium">Data de expiração:</span> 
                  <span className="ml-2">{expirationStatus.expirationDate}</span>
                </div>
              )}
              {expirationStatus.daysUntilExpiration !== Infinity && (
                <div>
                  <span className="font-medium">Expirou há:</span> 
                  <span className="ml-2 text-red-600">
                    {Math.abs(expirationStatus.daysUntilExpiration)} dias
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* What happened */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Por que isso aconteceu?</strong><br />
              Sua rotina de treino tem um período de validade para garantir que você sempre tenha 
              um programa atualizado e adequado aos seus objetivos. Após a expiração, é necessário 
              que seu personal trainer renove ou ajuste sua rotina.
            </AlertDescription>
          </Alert>

          {/* Contact Information */}
          {personalContact && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Entre em contato com seu Personal Trainer:
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-800">{personalContact.nome}</div>
                {personalContact.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    {personalContact.email}
                  </div>
                )}
                {personalContact.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <PhoneCall className="h-3 w-3" />
                    {personalContact.telefone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onContactPersonal && (
              <Button 
                onClick={onContactPersonal}
                className="flex-1"
                size="lg"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Contatar Personal Trainer
              </Button>
            )}
            
            {personalContact?.email && (
              <Button 
                variant="outline" 
                className="flex-1"
                size="lg"
                onClick={() => window.location.href = `mailto:${personalContact.email}?subject=Renovação de Rotina - ${routine.titulo}&body=Olá ${personalContact.nome},%0D%0A%0D%0AMinha rotina "${routine.titulo}" expirou e preciso renová-la para continuar meus treinos.%0D%0A%0D%0APoderia me ajudar com isso?%0D%0A%0D%0AObrigado!`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Enviar E-mail
              </Button>
            )}
          </div>

          {/* Next Steps */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm space-y-2">
              <div className="font-medium text-green-800 mb-2">📝 Próximos passos:</div>
              <div className="text-green-700 space-y-1">
                <div>1. Entre em contato com seu personal trainer</div>
                <div>2. Aguarde a renovação da sua rotina</div>
                <div>3. Volte aqui para continuar seus treinos!</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified version for inline blocking
export function SimpleExpiredBlocker({ 
  routine, 
  children, 
  className 
}: { 
  routine: any; 
  children: ReactNode; 
  className?: string; 
}) {
  const expirationStatus = calculateExpirationStatus(routine);

  // Allow access for active, expiring, and expired (grace period) routines
  if (expirationStatus.status !== 'inactive') {
    return <>{children}</>;
  }

  return (
    <div className={cn("p-6 text-center", className)}>
      <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Rotina Inativa
      </h3>
      <p className="text-red-600 mb-4">
        Esta rotina expirou e não está mais acessível. 
        Entre em contato com seu personal trainer para renovar.
      </p>
      <Button variant="outline" onClick={() => window.history.back()}>
        Voltar
      </Button>
    </div>
  );
}