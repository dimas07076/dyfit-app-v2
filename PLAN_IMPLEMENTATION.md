# Sistema de Planos e Tokens DyFit - Documentação da Implementação

## 📋 Visão Geral

Este documento descreve a implementação completa do sistema de planos e tokens para personal trainers no DyFit, conforme especificado no problema inicial.

## 🏗️ Arquitetura Implementada

### 1. Modelos de Dados (MongoDB/Mongoose)

#### `Aluno` (Atualizado)
```typescript
interface IAluno {
  // ... campos existentes ...
  // Novos campos para controle de consumo
  consumoFonte?: 'plano' | 'token';
  consumidoDoPlanoId?: ObjectId;
  consumidoDoTokenId?: ObjectId;
  validadeAcesso?: Date;
  dataAssociacao?: Date;
}
```

#### `PersonalPlano` (Reformulado)
```typescript
interface IPersonalPlano {
  personalId: ObjectId;
  planoTipo: 'Free' | 'Start' | 'Pro' | 'Elite' | 'Master';
  limiteAlunos: number;
  dataInicio: Date;
  dataFim: Date;
  status: 'ativo' | 'inativo' | 'expirado';
  preco?: number;
}
```

#### `TokenAvulso` (Reformulado)
```typescript
interface ITokenAvulso {
  personalId: ObjectId;
  alunoId?: ObjectId; // Associado quando utilizado
  status: 'disponivel' | 'utilizado' | 'expirado';
  dataEmissao: Date;
  dataExpiracao: Date;
  preco?: number;
  adicionadoPorAdmin: ObjectId;
  motivoAdicao?: string;
}
```

### 2. Services Implementados

#### `SlotManagementService`
- **`verificarSlotDisponivel(personalId)`**: Verifica disponibilidade de slots
- **`associarAlunoASlot(alunoId, slotInfo)`**: Associa aluno ao slot (plano/token)
- **`liberarSlotPorExclusao(alunoId)`**: Libera slot quando aluno é excluído
- **`podeReativarAluno(alunoId)`**: Verifica se aluno pode ser reativado
- **`desativarAlunosComAssociacaoExpirada()`**: Job para desativar alunos expirados

#### `TokenManagementService`
- **`criarTokensParaPersonal(data)`**: Cria tokens individuais
- **`utilizarToken(tokenId, alunoId)`**: Marca token como utilizado
- **`liberarToken(tokenId)`**: Libera token para reutilização
- **`listarTokensPersonal(personalId)`**: Lista tokens com status
- **`expirarTokensVencidos()`**: Job para expirar tokens

#### `PlanMaintenanceService`
- **`executarManutencaoCompleta()`**: Executa manutenção completa
- **`verificarPlanosProximosVencimento(dias)`**: Alertas de expiração
- **`gerarRelatorioUso()`**: Relatórios para administração

### 3. Endpoints da API

#### Admin Routes (`/api/admin`)
- `GET /planos/status` - Status dos planos
- `GET /planos` - Listar todos os planos
- `POST /planos` - Criar/atualizar plano
- `GET /personal/:id/status` - Status do personal trainer
- `POST /personal/:id/assign-plan` - Atribuir plano
- `POST /personal/:id/add-tokens` - Adicionar tokens
- `GET /personal/:id/tokens` - Listar tokens detalhados
- `PUT /tokens/:tokenId/status` - Alterar status do token
- `GET /personal-trainers` - Listar todos os personals com status
- `POST /cleanup-expired` - Limpeza automática
- `POST /maintenance/run` - Executar manutenção completa
- `GET /maintenance/report` - Gerar relatório
- `GET /maintenance/warnings` - Avisos de expiração

#### Personal Routes (`/api/personal`)
- `GET /meu-plano` - Status do próprio plano
- `GET /can-activate/:quantidade?` - Verificar capacidade de ativação
- `GET /tokens-ativos` - Tokens ativos próprios
- `GET /planos-disponiveis` - Planos disponíveis para upgrade

#### Aluno Routes (Atualizadas)
- `POST /api/aluno/gerenciar` - Criar aluno (com verificação de slots)
- `PUT /api/aluno/gerenciar/:id` - Atualizar aluno (com lógica de reativação)
- `DELETE /api/aluno/gerenciar/:id` - Excluir aluno (com liberação de slots)

### 4. Lógica Central de Associação

#### Criação de Aluno
1. **Verificar slots disponíveis** no plano vigente
2. **Se plano tem slots**: associar ao plano (herda ID e validade)
3. **Se plano lotado**: tentar usar token avulso disponível
4. **Se token disponível**: associar ao token (herda ID e validade)
5. **Se sem slots/tokens**: bloquear criação e sugerir upgrade

#### Inativação/Reativação
- **Inativação**: NÃO libera slot/token (associação permanece)
- **Reativação**: mantém associação se ainda válida
- **Se expirada**: exige nova associação (slot/token disponível)

#### Exclusão
- **Exclusão de aluno**: libera token se estava consumindo (configurável)
- **Slots de plano**: liberados automaticamente pela exclusão

### 5. Middlewares e Validações

#### `checkLimiteAlunos`
- Verifica slots disponíveis antes da criação
- Integrado com novo sistema de slot management
- Retorna informações detalhadas sobre limitações

#### `checkCanActivateStudent`
- Valida reativação de alunos inativos
- Verifica se associação ainda é válida
- Solicita nova associação se necessário

#### Validações Adicionais
- `validateTokenRequest`: Valida requisições de tokens (1-100 tokens)
- `validatePlanAssignment`: Valida atribuição de planos
- Validação de duração customizada (1-365 dias)

### 6. Jobs e Automação

#### Scripts de Cron (`server/scripts/cronJobs.ts`)
- **`executeDailyMaintenance()`**: Manutenção diária completa
- **`checkExpirationWarnings()`**: Verifica avisos de expiração
- **`generateWeeklyReport()`**: Relatório semanal de uso

#### Execução
```bash
# Manutenção diária
node server/scripts/cronJobs.js daily

# Verificar avisos
node server/scripts/cronJobs.js warnings

# Relatório semanal
node server/scripts/cronJobs.js report
```

### 7. Invariantes e Regras de Negócio

#### Regras Implementadas
- ✅ Exatamente um de `consumidoDoPlanoId` ou `consumidoDoTokenId` preenchido
- ✅ `validadeAcesso` sempre reflete a fonte de consumo
- ✅ Inativação não altera associação nem validade
- ✅ Tokens utilizados não podem ser reutilizados
- ✅ Planos podem ter slots liberados por exclusão (configurável)
- ✅ Tokens individuais (1 token = 1 aluno ativo)
- ✅ Status automático baseado em data de expiração

#### Tipos de Plano
- **Free**: 1 aluno, 7 dias de validade
- **Start**: 5 alunos ativos
- **Pro**: 10 alunos ativos
- **Elite**: 20 alunos ativos
- **Master**: 50 alunos ativos

### 8. Tipos TypeScript (Shared)

Novos tipos adicionados em `shared/types.ts`:
- `PersonalPlano`
- `TokenAvulso`
- `PlanoStatus`
- `SlotInfo`
- `SlotAvailabilityResult`
- `TokenStatusSummary`
- `MaintenanceResult`

### 9. Testes e Validação

#### Script de Teste (`server/scripts/testSlotSystem.ts`)
```bash
node server/scripts/testSlotSystem.js
```

Testa:
- Verificação de slots sem plano
- Criação de tokens
- Verificação de slots com tokens
- Associação de alunos
- Utilização de tokens
- Status e contagens
- Expiração automática

### 10. Segurança e Performance

#### Segurança
- ✅ Verificação de propriedade (personal só vê seus dados)
- ✅ Validação de limites em tempo real
- ✅ Prevenção de race conditions
- ✅ Middlewares de autenticação e autorização

#### Performance
- ✅ Índices otimizados nos modelos
- ✅ Queries eficientes com agregação
- ✅ Lazy loading de serviços
- ✅ Logs estruturados para monitoramento

## 🚀 Como Usar

### 1. Para Administradores

#### Atribuir Plano
```bash
POST /api/admin/personal/:personalId/assign-plan
{
  "planoId": "654...",
  "customDuration": 30,
  "motivo": "Upgrade para plano Pro"
}
```

#### Adicionar Tokens
```bash
POST /api/admin/personal/:personalId/add-tokens
{
  "quantidade": 5,
  "customDays": 30,
  "motivo": "Tokens promocionais"
}
```

#### Verificar Status
```bash
GET /api/admin/personal/:personalId/status
```

### 2. Para Personal Trainers

#### Verificar Meu Plano
```bash
GET /api/personal/meu-plano
```

#### Criar Aluno (Automático)
```bash
POST /api/aluno/gerenciar
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

### 3. Automação

#### Configurar Cron Jobs
```bash
# Crontab example
0 2 * * * /usr/bin/node /path/to/server/scripts/cronJobs.js daily
0 9 * * * /usr/bin/node /path/to/server/scripts/cronJobs.js warnings
0 9 * * 1 /usr/bin/node /path/to/server/scripts/cronJobs.js report
```

## ✅ Funcionalidades Implementadas

- [x] Modelos atualizados conforme especificação
- [x] Serviços de gerenciamento de slots e tokens
- [x] API completa para administração e uso
- [x] Lógica de associação aluno-slot
- [x] Reativação inteligente com verificação de validade
- [x] Sistema de expiração automática
- [x] Jobs de manutenção e relatórios
- [x] Validações e tratamento de erros
- [x] Tipos TypeScript compartilhados
- [x] Scripts de teste e automação

## 🔄 Próximos Passos

Para completar a implementação:

1. **Frontend**: Atualizar componentes para mostrar status de slots e tokens
2. **Notificações**: Implementar sistema de notificações para avisos
3. **Métricas**: Dashboard com analytics de uso
4. **Testes**: Testes unitários e de integração mais abrangentes
5. **Monitoramento**: Logs estruturados e alertas

## 📊 Estrutura de Arquivos

```
server/
├── models/
│   ├── Aluno.ts (atualizado)
│   ├── PersonalPlano.ts (reformulado)
│   └── TokenAvulso.ts (reformulado)
├── services/
│   ├── PlanoService.ts (atualizado)
│   ├── SlotManagementService.ts (novo)
│   ├── TokenManagementService.ts (novo)
│   └── PlanMaintenanceService.ts (novo)
├── middlewares/
│   └── checkLimiteAlunos.ts (atualizado)
├── src/routes/
│   ├── adminPlanosRoutes.ts (atualizado)
│   ├── personalPlanosRoutes.ts (existente)
│   └── alunoApiRoutes.ts (atualizado)
├── scripts/
│   ├── cronJobs.ts (novo)
│   └── testSlotSystem.ts (novo)
└── ...

shared/
└── types.ts (atualizado)
```

Este sistema fornece uma base sólida e escalável para o gerenciamento de planos e tokens no DyFit, atendendo a todos os requisitos especificados no problema inicial.