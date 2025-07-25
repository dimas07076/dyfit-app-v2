// client/src/pages/expiration-demo.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RoutineStatusIndicator, 
  RenewalModal, 
  ExpirationNotice, 
  ExpiringRoutinesDashboard,
  ExpiredRoutineBlocker 
} from "@/components/expiration";
import { calculateExpirationStatus } from "@/hooks/useRoutineExpiration";
import { addDays, subDays } from "date-fns";

// Mock data for demonstration
const createMockRoutine = (daysFromNow: number, title: string) => ({
  _id: `mock-${title.toLowerCase().replace(/\s+/g, '-')}`,
  titulo: title,
  descricao: `Rotina de exemplo: ${title}`,
  tipo: 'individual' as const,
  dataValidade: addDays(new Date(), daysFromNow).toISOString(),
  statusExpiracao: 'active' as const,
  alunoId: {
    _id: 'mock-student',
    nome: 'João Silva',
    email: 'joao@example.com'
  },
  criadorId: 'mock-personal'
});

const mockPersonalContact = {
  nome: "Carlos Silva",
  email: "carlos@personal.com",
  telefone: "(11) 99999-9999"
};

export default function ExpirationDemoPage() {
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);

  // Create mock routines with different expiration states
  const mockRoutines = [
    createMockRoutine(15, "Treino de Força - 15 dias restantes"),
    createMockRoutine(3, "Cardio Intenso - 3 dias restantes"), 
    createMockRoutine(0, "Funcional - Expira hoje"),
    createMockRoutine(-1, "Pilates - Expirou há 1 dia"),
    createMockRoutine(-5, "Crossfit - Expirou há 5 dias (inativo)")
  ];

  const handleRenewal = (routine: any) => {
    setSelectedRoutine(routine);
    setRenewalModalOpen(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Validade para Rotinas</h1>
        <p className="text-muted-foreground mt-2">
          Demonstração completa do sistema de expiração de rotinas de treino
        </p>
      </div>

      {/* Status Indicators Demo */}
      <Card>
        <CardHeader>
          <CardTitle>🏷️ Indicadores de Status</CardTitle>
          <CardDescription>
            Diferentes estados de validade das rotinas com indicadores visuais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockRoutines.map((routine) => {
            const status = calculateExpirationStatus(routine);
            return (
              <div key={routine._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{routine.titulo}</h4>
                  <p className="text-sm text-muted-foreground">
                    {status.daysUntilExpiration >= 0 
                      ? `${status.daysUntilExpiration} dias restantes`
                      : `Expirou há ${Math.abs(status.daysUntilExpiration)} dias`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RoutineStatusIndicator routine={routine} />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRenewal(routine)}
                  >
                    Renovar
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Expiration Notices Demo */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Avisos de Expiração</CardTitle>
          <CardDescription>
            Como os alunos visualizam avisos sobre rotinas expirando ou expiradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockRoutines.filter(r => calculateExpirationStatus(r).status !== 'active').map((routine) => (
            <ExpirationNotice 
              key={routine._id}
              routine={routine}
              personalContact={mockPersonalContact}
              onContactPersonal={() => alert('Contatar personal trainer!')}
            />
          ))}
        </CardContent>
      </Card>

      {/* Blocked Access Demo */}
      <Card>
        <CardHeader>
          <CardTitle>🚫 Bloqueio de Acesso</CardTitle>
          <CardDescription>
            Como rotinas inativas bloqueiam o acesso dos alunos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Grace Period Example */}
            <div>
              <Badge variant="secondary" className="mb-2">Durante o período de tolerância</Badge>
              <ExpiredRoutineBlocker
                routine={mockRoutines[3]} // -1 day (expired but in grace period)
                personalContact={mockPersonalContact}
                onContactPersonal={() => alert('Contatar personal!')}
              >
                <div className="p-4 bg-green-50 rounded border text-center">
                  <p className="text-green-800">✅ Conteúdo da rotina acessível</p>
                  <p className="text-sm text-green-600">Período de tolerância ativo</p>
                </div>
              </ExpiredRoutineBlocker>
            </div>

            {/* Fully Blocked Example */}
            <div>
              <Badge variant="destructive" className="mb-2">Completamente bloqueada</Badge>
              <ExpiredRoutineBlocker
                routine={mockRoutines[4]} // -5 days (inactive)
                personalContact={mockPersonalContact}
                onContactPersonal={() => alert('Contatar personal!')}
              >
                <div className="p-4 bg-green-50 rounded border text-center">
                  <p className="text-green-800">Este conteúdo não aparece</p>
                </div>
              </ExpiredRoutineBlocker>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Recursos Implementados</CardTitle>
          <CardDescription>
            Resumo completo de todas as funcionalidades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-600">✅ Para Personal Trainers</h4>
              <ul className="space-y-2 text-sm">
                <li>• Dashboard com rotinas expirando</li>
                <li>• Renovação rápida com períodos customizáveis</li>
                <li>• Estatísticas de expiração</li>
                <li>• Indicadores visuais em cartões de rotina</li>
                <li>• Validade padrão de 30 dias (configurável)</li>
                <li>• Sistema de notificações automáticas</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-600">👤 Para Alunos</h4>
              <ul className="space-y-2 text-sm">
                <li>• Avisos 5 dias antes da expiração</li>
                <li>• Notificações de rotina expirada</li>
                <li>• Período de tolerância de 2 dias</li>
                <li>• Bloqueio automático após tolerância</li>
                <li>• Informações de contato do personal</li>
                <li>• Interface clara sobre status da rotina</li>
              </ul>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">30</div>
              <div className="text-sm text-green-700">Dias de validade padrão</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">5</div>
              <div className="text-sm text-yellow-700">Dias de aviso antecipado</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">2</div>
              <div className="text-sm text-orange-700">Dias de período de tolerância</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Modal */}
      <RenewalModal 
        routine={selectedRoutine}
        isOpen={renewalModalOpen}
        onClose={() => {
          setRenewalModalOpen(false);
          setSelectedRoutine(null);
        }}
      />
    </div>
  );
}