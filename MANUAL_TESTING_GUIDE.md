# Manual Testing Guide for Etapa 2 Implementation

## 🎯 Overview
This guide provides step-by-step instructions for manually testing the unified resource validation logic for plans and tokens.

## 🔧 Pre-Testing Setup

### Required Test Data
1. **Personal Trainers with different configurations:**
   - Personal with active FREE plan (1 student limit)
   - Personal with active START plan (5 students limit)
   - Personal with expired plan
   - Personal with no plan but tokens
   - Personal with plan + tokens

2. **Test Students:**
   - Active students assigned to different personals
   - Inactive students (to test permanent consumption)
   - Students with assigned tokens

### Setup Commands (Admin Panel)
```bash
# 1. Create test personal trainers
# 2. Assign different plans to personals
# 3. Add tokens to specific personals
# 4. Create test students in various states
```

## 📝 Test Scenarios

### Scenario 1: Personal with Active Plan

#### Test 1.1: Plan with Available Slots
**Personal:** Has START plan (5 students), currently 2 active students

**Test Steps:**
1. Login as the personal trainer
2. Navigate to "Add Student" or "Send Invite"
3. Try to create/invite a new student

**Expected Results:**
- ✅ Action should be allowed
- ✅ Should see "3 slots available" message
- ✅ Student should be created using plan slot (not token)

#### Test 1.2: Plan at Full Capacity with Tokens
**Personal:** Has START plan (5 students), currently 5 active students, has 2 tokens

**Test Steps:**
1. Try to create/invite a new student

**Expected Results:**
- ✅ Action should be allowed
- ✅ Should see token usage message
- ✅ Student should be created using token (not plan slot)
- ✅ Available tokens should decrease by 1

#### Test 1.3: Plan at Full Capacity without Tokens
**Personal:** Has START plan (5 students), currently 5 active students, has 0 tokens

**Test Steps:**
1. Try to create/invite a new student

**Expected Results:**
- ❌ Action should be blocked
- ✅ Should see clear error message about limits
- ✅ Should see upgrade recommendations

### Scenario 2: Personal without Active Plan

#### Test 2.1: No Plan but with Tokens
**Personal:** No active plan, has 3 tokens

**Test Steps:**
1. Try to create/invite a new student

**Expected Results:**
- ✅ Action should be allowed
- ✅ Should see token usage message
- ✅ Student should be created using token
- ✅ Available tokens should decrease by 1

#### Test 2.2: No Plan and No Tokens
**Personal:** No active plan, has 0 tokens

**Test Steps:**
1. Try to create/invite a new student

**Expected Results:**
- ❌ Action should be blocked
- ✅ Should see message about needing plan or tokens
- ✅ Should see recommendations to purchase plan

### Scenario 3: Permanent Resource Consumption

#### Test 3.1: Plan Slot Permanent Consumption
**Personal:** Has START plan (5 students), currently 4 active students

**Test Steps:**
1. Create a new student (should use plan slot)
2. Verify plan slots: should show 5/5 used
3. Inactivate the newly created student
4. Check plan slots: should still show 5/5 used
5. Try to create another student

**Expected Results:**
- ✅ Step 1: Student created successfully
- ✅ Step 2: Plan slots should show as full
- ✅ Step 3: Student should be inactivated but slot remains consumed
- ✅ Step 4: Plan slots still show as full (permanent consumption)
- ❌ Step 5: Should be blocked unless tokens are available

#### Test 3.2: Token Permanent Consumption
**Personal:** No plan, has 1 token

**Test Steps:**
1. Create a new student (should use token)
2. Verify tokens: should show 0 available
3. Inactivate the student
4. Check tokens: should still show 0 available
5. Try to create another student

**Expected Results:**
- ✅ Step 1: Student created using token
- ✅ Step 2: Should show 0 available tokens
- ✅ Step 3: Student inactivated but token remains consumed
- ✅ Step 4: Still 0 available tokens (permanent consumption)
- ❌ Step 5: Should be blocked

#### Test 3.3: Student Reactivation
**Personal:** Has inactive student with assigned token

**Test Steps:**
1. Try to reactivate the inactive student

**Expected Results:**
- ✅ Should be allowed (reuses existing token)
- ✅ No new token should be consumed
- ✅ Student should become active

### Scenario 4: Convite (Invitation) Process

#### Test 4.1: Send Invite with Available Resources
**Personal:** Has available plan slots or tokens

**Test Steps:**
1. Navigate to "Send Invite"
2. Enter email and send invite

**Expected Results:**
- ✅ Invite should be sent successfully
- ✅ Should see success message

#### Test 4.2: Send Invite without Resources
**Personal:** No available plan slots or tokens

**Test Steps:**
1. Try to send invite

**Expected Results:**
- ❌ Should be blocked
- ✅ Should see clear error message
- ✅ Should see upgrade recommendations

#### Test 4.3: Complete Invite Registration
**Setup:** Personal has sent invite with available resources

**Test Steps:**
1. Open invite link
2. Complete registration form
3. Submit registration

**Expected Results:**
- ✅ Registration should complete successfully
- ✅ Student should be created and activated
- ✅ Appropriate resource (plan slot or token) should be consumed

### Scenario 5: Priority Logic Validation

#### Test 5.1: Plan Slots Used First
**Personal:** Has 2 available plan slots + 3 tokens

**Test Steps:**
1. Create first student
2. Check what resource was used
3. Create second student
4. Check what resource was used
5. Create third student
6. Check what resource was used

**Expected Results:**
- ✅ Step 1-2: First student should use plan slot
- ✅ Step 3-4: Second student should use plan slot
- ✅ Step 5-6: Third student should use token (plan slots exhausted)

## 🧪 Validation Checklist

### ✅ Core Functionality
- [ ] Plan slots are used before tokens
- [ ] Token assignment works when no plan slots available
- [ ] Resource consumption is permanent (survives inactivation)
- [ ] Student reactivation reuses existing resources
- [ ] Clear error messages when no resources available

### ✅ User Interface
- [ ] Status indicators show correct limits
- [ ] Clear feedback about available resources
- [ ] Appropriate recommendations for upgrades
- [ ] Consistent behavior across all entry points

### ✅ Edge Cases
- [ ] Plan expiration handling
- [ ] Token expiration handling
- [ ] Multiple simultaneous operations
- [ ] Database consistency

### ✅ Integration
- [ ] Works with existing Etapa 1 token logic
- [ ] Maintains backward compatibility
- [ ] Admin functions still work correctly
- [ ] Dashboard shows accurate information

## 🚨 Critical Test Points

### Must Verify:
1. **Permanent Consumption:** Resources are never freed by inactivation
2. **Priority Logic:** Plan slots always used before tokens
3. **Clear Messaging:** Users understand why actions are blocked
4. **No Regressions:** Existing token logic still works

### Red Flags to Watch For:
- ❌ Resources being freed when students are inactivated
- ❌ Tokens being used when plan slots are available
- ❌ Confusing or missing error messages
- ❌ Existing functionality breaking

## 📊 Testing Reports

Document results for each scenario:

```
Test: [Scenario Name]
Personal: [Configuration]
Action: [What was tested]
Expected: [Expected result]
Actual: [Actual result]
Status: ✅ PASS / ❌ FAIL
Notes: [Any observations]
```

## 🔍 Debugging Tips

If tests fail, check:
1. Browser console for errors
2. Server logs for validation messages
3. Database state for resource assignments
4. Middleware execution order
5. Service method calls and responses

## ⚡ Quick Test Commands

```bash
# Check personal's current status
GET /api/personal/:id/status

# Check student limit status
GET /api/student-limit/status

# View token assignments
GET /api/admin/personal/:id/tokens

# View plan assignments
GET /api/admin/personal/:id/plans
```