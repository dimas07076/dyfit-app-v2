# Sistema de Validade para Rotinas de Treino

Este documento descreve o sistema completo de expiração de rotinas implementado no DyFit App v2.

## 📋 Visão Geral

O sistema de validade para rotinas de treino oferece controle automático sobre a vigência das rotinas individuais, incluindo notificações automáticas e controle de acesso baseado no status da rotina.

## 🎯 Funcionalidades Principais

### ✅ Para Personal Trainers
- **Validade automática**: Rotinas individuais recebem automaticamente 30 dias de validade
- **Dashboard de expiração**: Visualize todas as rotinas que estão expirando ou expiradas
- **Renovação rápida**: Renove rotinas com períodos customizáveis (15, 30, 60, 90 dias ou personalizado)
- **Edição manual de validade**: Defina uma data específica de expiração para qualquer rotina individual
- **Estatísticas**: Acompanhe quantas rotinas estão ativas, expirando, expiradas ou inativas
- **Indicadores visuais**: Badges coloridos mostram o status em tempo real
- **Notificações automáticas**: Receba alertas sobre rotinas que precisam de atenção

### 👤 Para Alunos
- **Avisos antecipados**: Receba notificação 5 dias antes da expiração
- **Período de tolerância**: 2 dias de acesso após a expiração
- **Bloqueio automático**: Rotinas ficam inacessíveis após o período de tolerância
- **Informações de contato**: Acesso fácil aos dados do personal trainer
- **Interface clara**: Entenda o status da sua rotina facilmente

## 🏗️ Arquitetura do Sistema

### Backend (Node.js + Express + MongoDB)

#### Modelos de Dados
```typescript
interface ITreino {
  // Campos existentes...
  dataValidade?: Date | null;
  statusExpiracao?: 'active' | 'expiring' | 'expired' | 'inactive';
  ultimaRenovacao?: Date | null;
  notificacoes?: {
    avisocincodias?: boolean;
    avisoexpiracao?: boolean;
  };
}
```

#### Serviços
- **ExpirationManager**: Gerencia lógica de expiração e cálculo de status
- **NotificationService**: Processa e envia notificações automáticas
- **ExpirationScheduler**: Executa tarefas de manutenção automaticamente

#### API Endpoints
- `POST /api/treinos/:id/renew` - Renova uma rotina
- `PATCH /api/treinos/:id/update-validity` - Atualiza a data de validade manualmente
- `GET /api/treinos/expiring` - Lista rotinas expirando
- `GET /api/treinos/expiration-stats` - Estatísticas de expiração
- `POST /api/treinos/:id/update-status` - Atualiza status manualmente
- `POST /api/treinos/process-notifications` - Processa notificações

### Frontend (React + TypeScript)

#### Componentes
- **RoutineStatusIndicator**: Badge visual com status da rotina
- **RenewalModal**: Modal para renovação de rotinas
- **EditRoutineValidityModal**: Modal para edição manual da data de validade
- **ExpirationNotice**: Avisos para alunos sobre expiração
- **ExpiringRoutinesDashboard**: Dashboard para personal trainers
- **ExpiredRoutineBlocker**: Bloqueia acesso a rotinas inativas

#### Hooks
- **useRoutineExpiration**: Hook principal para gerenciar expiração
- **useRoutineRenewal**: Hook para renovação de rotinas
- **useRoutineValidityUpdate**: Hook para edição manual da data de validade
- **useExpiringRoutines**: Hook para listar rotinas expirando
- **useExpirationStats**: Hook para estatísticas

## 🔧 Configuração e Uso

### Instalação
O sistema está integrado ao código existente. Não requer instalação adicional.

### Configuração Automática
- Rotinas individuais criadas recebem automaticamente 30 dias de validade
- Status é calculado em tempo real baseado na data de expiração
- Notificações são enviadas automaticamente (quando o scheduler estiver ativo)

### Uso Manual
```bash
# Executar processamento de notificações manualmente
npm run schedule:expiration

# Ou via API
curl -X POST http://localhost:3000/api/treinos/process-notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Scheduler Automático
```javascript
import { ExpirationScheduler } from './services/scheduler';

// Iniciar scheduler (executa a cada hora)
ExpirationScheduler.start();

// Executar manualmente
await ExpirationScheduler.runScheduledTasks();

// Parar scheduler
ExpirationScheduler.stop();
```

## 🎨 Interface Visual

### Estados de Status
- **🟢 Ativa** (Verde): Mais de 5 dias restantes
- **🟡 Expirando** (Amarelo): 5 dias ou menos restantes  
- **🟠 Expirada** (Laranja): Expirou há até 2 dias (período de tolerância)
- **🔴 Inativa** (Vermelho): Expirou há mais de 2 dias

### Exemplos de Uso

#### Para Personal Trainers
```tsx
import { ExpiringRoutinesDashboard } from '@/components/expiration';

// Dashboard completo com todas as funcionalidades
<ExpiringRoutinesDashboard />
```

#### Para Cards de Rotina
```tsx
import { FullStatusIndicator } from '@/components/expiration';

// Indicador de status em cartões
<FullStatusIndicator routine={routine} />
```

#### Para Renovação de Rotinas
```tsx
import { RenewalModal } from '@/components/expiration';

// Modal para renovar rotinas (adiciona dias a partir de hoje)
<RenewalModal 
  routine={routine} 
  isOpen={isRenewalModalOpen} 
  onClose={() => setIsRenewalModalOpen(false)} 
/>
```

#### Para Edição Manual de Validade
```tsx
import { EditRoutineValidityModal } from '@/components/expiration';

// Modal para definir data específica de validade
<EditRoutineValidityModal 
  routine={routine} 
  isOpen={isEditValidityModalOpen} 
  onClose={() => setIsEditValidityModalOpen(false)} 
/>
```

#### Para Bloqueio de Acesso
```tsx
import { ExpiredRoutineBlocker } from '@/components/expiration';

// Bloqueia automaticamente rotinas inativas
<ExpiredRoutineBlocker routine={routine} personalContact={personal}>
  <WorkoutContent />
</ExpiredRoutineBlocker>
```

## 📊 Regras de Negócio

### Validade Padrão
- **30 dias** para rotinas individuais
- **Sem validade** para rotinas modelo
- Data de expiração baseada na data de criação

### Notificações
- **5 dias antes**: Aviso de expiração iminente
- **No vencimento**: Notificação de expiração
- **Apenas uma vez**: Cada tipo de notificação é enviado apenas uma vez

### Controle de Acesso
- **Ativa/Expirando**: Acesso total com avisos visuais
- **Expirada (0-2 dias)**: Acesso com aviso de urgência
- **Inativa (+2 dias)**: Acesso bloqueado completamente

### Renovação
- **Somente personal trainers** podem renovar rotinas
- **Períodos flexíveis**: 15, 30, 60, 90 dias ou personalizado
- **Reset de notificações**: Renovação limpa flags de notificação

### Edição Manual de Validade
- **Somente personal trainers** podem editar a data de validade
- **Data específica**: Define uma data exata de expiração (diferente da renovação que adiciona dias)
- **Validação**: Nova data deve ser maior que a data atual
- **Reset de notificações**: Edição limpa flags de notificação
- **Recálculo automático**: Status da rotina é recalculado com base na nova data

## 🔔 Sistema de Notificações

### Tipos de Notificação
1. **Aviso de 5 dias** (Para alunos)
2. **Notificação de expiração** (Para alunos)
3. **Resumo para personal** (Para personal trainers)

### Formato das Notificações
```typescript
interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'expiration' | 'info';
  routineId: string;
  recipientType: 'student' | 'personal';
  recipientId: string;
  action?: {
    type: 'contact' | 'renew' | 'view';
    label: string;
    url?: string;
  };
}
```

## 🧪 Testes e Demonstração

### Página de Demonstração
Acesse `/expiration-demo` para ver todos os componentes em ação:
- Indicadores de status para diferentes cenários
- Avisos de expiração para alunos
- Bloqueio de acesso a rotinas inativas
- Modal de renovação
- Resumo completo de funcionalidades

### Dados de Teste
```javascript
// Criar rotina que expira em 3 dias
const routine = {
  _id: 'test-routine',
  titulo: 'Teste de Expiração',
  tipo: 'individual',
  dataValidade: addDays(new Date(), 3).toISOString(),
  alunoId: { nome: 'João Silva', email: 'joao@test.com' }
};
```

## 📈 Monitoramento e Analytics

### Métricas Disponíveis
- Total de rotinas por personal trainer
- Rotinas ativas vs. expiradas
- Taxa de renovação
- Eficácia das notificações

### Logs do Sistema
```
🔄 Running scheduled expiration tasks...
✅ Updated 15 routine statuses
📧 Notification results: { warnings: 3, expirations: 1, personalNotifications: 2, errors: 0 }
⏱️ Scheduled tasks completed in 247ms
```

## 🚀 Próximos Passos

### Melhorias Futuras
- [ ] Integração com e-mail para notificações
- [ ] Push notifications para PWA
- [ ] Relatórios detalhados de expiração
- [ ] Configurações personalizáveis por personal
- [ ] Histórico de renovações
- [ ] Templates de notificação customizáveis

### Configurações Avançadas
- [ ] Período de validade por tipo de treino
- [ ] Múltiplos lembretes antes da expiração
- [ ] Grace period configurável
- [ ] Renovação automática baseada em planos

## 🔗 Arquivos Principais

### Backend
```
server/
├── models/Treino.ts                      # Modelo estendido com campos de expiração
├── src/services/
│   ├── expirationManager.ts              # Lógica principal de expiração
│   ├── notificationService.ts            # Sistema de notificações
│   └── scheduler.ts                      # Agendador automático
└── src/routes/treinos.ts                 # Endpoints da API estendidos
```

### Frontend
```
client/src/
├── hooks/useRoutineExpiration.ts         # Hook principal
├── components/expiration/
│   ├── RoutineStatusIndicator.tsx        # Indicador visual de status
│   ├── RenewalModal.tsx                  # Modal de renovação
│   ├── EditRoutineValidityModal.tsx      # Modal de edição de validade
│   ├── ExpirationNotice.tsx              # Avisos para alunos
│   ├── ExpiringRoutinesDashboard.tsx     # Dashboard para personals
│   └── ExpiredRoutineBlocker.tsx         # Bloqueador de acesso
└── pages/expiration-demo.tsx             # Página de demonstração
```

## 💡 Dicas de Implementação

### Integrando em Páginas Existentes
```tsx
// Em componentes de rotina existentes
import { FullStatusIndicator, EditRoutineValidityModal, RenewalModal } from '@/components/expiration';

// Adicionar indicador de status
{routine.tipo === 'individual' && (
  <FullStatusIndicator routine={routine} />
)}

// Botões para gerenciar validade (exemplo em card de rotina)
{routine.tipo === 'individual' && (
  <>
    <Button onClick={() => setRenewalModalOpen(true)}>
      Renovar Rotina
    </Button>
    <Button onClick={() => setEditValidityModalOpen(true)}>
      Editar Validade
    </Button>
  </>
)}
```

### Verificação de Acesso
```tsx
// Proteger conteúdo sensível
import { ExpiredRoutineBlocker } from '@/components/expiration';

<ExpiredRoutineBlocker routine={routine}>
  <SensitiveWorkoutContent />
</ExpiredRoutineBlocker>
```

### Dashboard de Personal
```tsx
// Página dedicada ou seção no dashboard existente
import { ExpiringRoutinesDashboard } from '@/components/expiration';

<ExpiringRoutinesDashboard />
```

---

## 📞 Suporte

Para dúvidas sobre implementação ou uso do sistema de expiração, consulte este documento ou examine o código de demonstração em `/expiration-demo`.