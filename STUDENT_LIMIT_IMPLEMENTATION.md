# 📌 Student Limit Management - Implementation Guide

## Overview
This implementation provides comprehensive student limit management for personal trainers in the Dyfit app, enforcing business rules around plan-based student quotas and token-based access.

## 🛠️ Architecture

### Backend Components

#### 1. StudentLimitService (`server/services/StudentLimitService.ts`)
Central service for all student limit operations:

```typescript
// Get comprehensive limit status
const status = await StudentLimitService.getStudentLimitStatus(personalTrainerId);

// Validate if can activate N students
const validation = await StudentLimitService.validateStudentActivation(personalTrainerId, 2);

// Validate if can send invites
const inviteValidation = await StudentLimitService.validateSendInvite(personalTrainerId);
```

#### 2. API Routes (`server/src/routes/studentLimitRoutes.ts`)
RESTful endpoints for student limit queries:

- `GET /api/student-limit/status` - Current limit status
- `POST /api/student-limit/validate-activation` - Pre-validate activation
- `POST /api/student-limit/validate-invite` - Pre-validate invite
- `GET /api/student-limit/detailed-breakdown` - Admin/debug breakdown

#### 3. Middleware Protection
Applied to critical routes for automatic validation:

- `checkLimiteAlunos` - For student creation
- `checkCanSendInvite` - For invite generation  
- `checkStudentStatusChange` - For status updates (inactive → active)

### Frontend Components

#### 1. useStudentLimit Hook (`client/src/hooks/useStudentLimit.ts`)
React hook for limit management:

```typescript
const {
  status,                    // Current limit status
  isAtLimit,                // Boolean: at limit
  canActivateStudents,      // Function: check if can activate N students
  canSendInvites,           // Function: check if can send invites
  validateActivation,       // Async validation
  refreshStatus            // Manual refresh
} = useStudentLimit();
```

#### 2. StudentLimitIndicator (`client/src/components/StudentLimitIndicator.tsx`)
Visual component with 3 variants:

```typescript
// Compact card with progress bar
<StudentLimitIndicator variant="compact" showProgress={true} />

// Detailed view with recommendations
<StudentLimitIndicator 
  variant="detailed" 
  showRecommendations={true}
  showProgress={true} 
/>

// Minimal inline display
<StudentLimitIndicator variant="minimal" />
```

## 🔧 Business Rules Implementation

### Plan-Based Limits
- **Free Plan**: 1 active student, 7 days
- **Start Plan**: 5 active students, monthly
- **Pro Plan**: 10 active students, monthly  
- **Elite Plan**: 20 active students, monthly
- **Master Plan**: 50 active students, monthly

### Token System
- Each token = 1 additional active student slot
- Tokens have expiration dates
- Tokens stack with plan limits
- Tokens work independently if no active plan

### Validation Matrix
| Scenario | Plan Status | Tokens | Result |
|----------|-------------|--------|--------|
| Active Plan + Space | ✅ Active | Any | ✅ Allow activation |
| Active Plan + No Space | ✅ Active | 0 | ❌ Block activation |
| Active Plan + No Space | ✅ Active | >0 | ✅ Allow (use token) |
| No Plan | ❌ None | >0 | ✅ Allow (use token) |
| No Plan | ❌ None | 0 | ❌ Block activation |
| Expired Plan | ⏰ Expired | >0 | ✅ Allow (use token) |
| Expired Plan | ⏰ Expired | 0 | ❌ Block activation |

## 🎯 Integration Points

### Student Management Pages
- **Student List** (`/alunos`): Shows limit indicator in header
- **New Student** (`/alunos/novo`): Form disabled when at limit
- **Invite Modal**: Disabled when cannot send invites
- **Student Edit**: Activation blocked when changing status to active

### Automatic Protections
1. **API Level**: All relevant endpoints protected with middleware
2. **UI Level**: Forms and buttons disabled based on limits
3. **Real-time**: Status updates automatically after operations

## 🔍 Error Handling

### API Error Responses
```json
{
  "success": false,
  "message": "Limite de alunos ativos excedido",
  "code": "STUDENT_LIMIT_EXCEEDED",
  "data": {
    "currentLimit": 5,
    "activeStudents": 5,
    "availableSlots": 0,
    "recommendations": [
      "Desative alunos inativos para liberar espaço",
      "Faça upgrade do seu plano para mais slots"
    ]
  }
}
```

### Client-side Handling
The `useStudentLimit` hook automatically handles errors and provides fallback states for network issues.

## 🧪 Testing Scenarios

### Manual Testing Checklist
1. ✅ Create personal with Free plan → verify 1 student limit
2. ✅ Add 1 active student → verify form disabled for 2nd student
3. ✅ Add tokens to personal → verify increased limit
4. ✅ Try to activate student at limit → verify blocking
5. ✅ Try to send invite at limit → verify blocking
6. ✅ Deactivate student → verify limit freed up
7. ✅ Test with expired plan + tokens → verify token-only mode

### API Testing
```bash
# Test status endpoint (requires auth token)
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/student-limit/status

# Test activation validation
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"quantidade": 2}' \
     http://localhost:5000/api/student-limit/validate-activation
```

## 🔄 Maintenance

### Monitoring
- Check `PlanoService.getPersonalCurrentPlan()` for plan status accuracy
- Monitor token expiration cleanup
- Verify middleware performance on high-traffic routes

### Future Enhancements
- **Analytics**: Track limit violations and upgrade triggers
- **Notifications**: Alert when approaching limits
- **Bulk Operations**: Handle batch student activations
- **Grace Period**: Allow temporary overages

## 📋 Deployment Notes

1. **Database**: No schema changes required (uses existing models)
2. **Environment**: No new environment variables needed
3. **Backward Compatibility**: 100% preserved - existing functionality unchanged
4. **Performance**: Minimal overhead - leverages existing `PlanoService` caching

The implementation is production-ready and maintains full backward compatibility while adding comprehensive student limit enforcement.