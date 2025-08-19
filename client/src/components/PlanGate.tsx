// client/src/components/PlanGate.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'wouter';
import { useUser } from '@/context/UserContext';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { PersonalPlanStatus } from '../../../shared/types/planos';

interface PlanGateProps {
  children: React.ReactNode;
  requireActivePlan?: boolean;
  redirectTo?: string;
}

/**
 * PlanGate component that controls access to routes based on plan status
 * 
 * @param children - Component to render if access is allowed
 * @param requireActivePlan - If true, requires an active plan to access the route
 * @param redirectTo - Where to redirect if access is denied (default: '/solicitar-renovacao')
 */
export function PlanGate({ 
  children, 
  requireActivePlan = false, 
  redirectTo = '/solicitar-renovacao' 
}: PlanGateProps) {
  const { user } = useUser();
  const trainerId = user?.id;

  const { data: planStatus, isLoading, error } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["personalPlanStatus", trainerId],
    queryFn: () => apiRequest("GET", "/api/personal/meu-plano"),
    enabled: !!trainerId && requireActivePlan,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Se o erro for 404 (plano não encontrado), não tenta novamente.
      if (error.message.includes("404") || error.message.includes("Nenhum plano ativo ou expirado encontrado")) return false;
      return failureCount < 3;
    },
  });

  // If plan is not required for this route, allow access
  if (!requireActivePlan) {
    return <>{children}</>;
  }

  // Show loading while checking plan status
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If there's an error getting plan status (including 404), redirect
  if (error || !planStatus || !planStatus.plano) {
    console.log('[PlanGate] No active plan found, redirecting to:', redirectTo);
    return <Redirect to={redirectTo} />;
  }

  // If we have an active plan, allow access
  return <>{children}</>;
}

export default PlanGate;