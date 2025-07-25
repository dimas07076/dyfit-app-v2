// client/src/components/expiration/ExpiringRoutinesDashboard.tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RotateCcw, TrendingUp, Users, Clock, RefreshCw } from "lucide-react";
import { useExpiringRoutines, useExpirationStats, calculateExpirationStatus } from "@/hooks/useRoutineExpiration";
import { RenewalModal } from "./RenewalModal";
import { RoutineStatusIndicator } from "./RoutineStatusIndicator";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ExpiringRoutinesDashboard() {
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);

  const { 
    data: expiringRoutines, 
    isLoading: loadingRoutines, 
    error: routinesError,
    refetch: refetchRoutines 
  } = useExpiringRoutines();

  const { 
    data: stats, 
    isLoading: loadingStats, 
    error: statsError,
    refetch: refetchStats 
  } = useExpirationStats();

  const handleRenewClick = (routine: any) => {
    setSelectedRoutine(routine);
    setIsRenewalModalOpen(true);
  };

  const handleRenewalClose = () => {
    setIsRenewalModalOpen(false);
    setSelectedRoutine(null);
  };

  const handleRefresh = () => {
    refetchRoutines();
    refetchStats();
  };

  if (loadingRoutines || loadingStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (routinesError || statsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Erro ao carregar dados: {(routinesError || statsError)?.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rotinas Expirando</h2>
          <p className="text-muted-foreground">
            Gerencie rotinas que estão próximas do vencimento ou já expiraram
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Rotinas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirando</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.expiring || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(stats?.expired || 0) + (stats?.inactive || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Routines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Rotinas Requerendo Atenção
          </CardTitle>
          <CardDescription>
            Rotinas que estão expirando ou já expiraram e precisam de renovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!expiringRoutines || expiringRoutines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              🎉 Ótimas notícias! Nenhuma rotina precisa de atenção no momento.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rotina</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Expiração</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringRoutines.map((routine: any) => {
                  const expirationStatus = calculateExpirationStatus(routine);
                  const alunoNome = typeof routine.alunoId === 'object' && routine.alunoId?.nome 
                    ? routine.alunoId.nome 
                    : 'N/A';

                  return (
                    <TableRow key={routine._id}>
                      <TableCell className="font-medium">
                        {routine.titulo}
                      </TableCell>
                      <TableCell>{alunoNome}</TableCell>
                      <TableCell>
                        <RoutineStatusIndicator routine={routine} size="sm" />
                      </TableCell>
                      <TableCell>
                        {routine.dataValidade 
                          ? format(parseISO(routine.dataValidade), "d/MM/yyyy", { locale: ptBR })
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        {expirationStatus.daysUntilExpiration !== Infinity ? (
                          <Badge variant={expirationStatus.daysUntilExpiration >= 0 ? "secondary" : "destructive"}>
                            {expirationStatus.daysUntilExpiration >= 0 
                              ? `${expirationStatus.daysUntilExpiration} dias`
                              : `+${Math.abs(expirationStatus.daysUntilExpiration)} dias`
                            }
                          </Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleRenewClick(routine)}
                          className="flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Renovar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Renewal Modal */}
      <RenewalModal
        routine={selectedRoutine}
        isOpen={isRenewalModalOpen}
        onClose={handleRenewalClose}
      />
    </div>
  );
}