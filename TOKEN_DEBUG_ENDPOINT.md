# Token Debug Endpoint Documentation

## Overview

The Token Debug endpoint (`GET /api/tokens/debug/:studentId`) is designed to help developers and administrators troubleshoot token assignment issues for students. This endpoint provides comprehensive information about a student's tokens from both the new Token model and legacy TokenAvulso model, plus normalized data.

## Endpoint Details

**URL:** `GET /api/tokens/debug/:studentId`

**Authentication:** Required (Bearer token)

**Authorization:** 
- Development environment: Any authenticated user with 'personal' or 'admin' role
- Production environment: Only users with 'admin' role

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| studentId | string (path) | MongoDB ObjectId of the student to debug |

## Response Format

```json
{
  "success": true,
  "data": {
    "studentId": "string",
    "env": "development|production",
    "raw": {
      "token": [
        {
          "_id": "ObjectId",
          "id": "string",
          "tipo": "plano|avulso",
          "personalTrainerId": "ObjectId",
          "alunoId": "ObjectId",
          "planoId": "ObjectId|null",
          "dataExpiracao": "Date",
          "ativo": "boolean",
          "quantidade": "number",
          "dateAssigned": "Date|null",
          "renovado": "boolean",
          "dataUltimaRenovacao": "Date|null",
          "adicionadoPorAdmin": "ObjectId",
          "motivoAdicao": "string|null",
          "createdAt": "Date",
          "updatedAt": "Date",
          "alunoId": { "nome": "string" },
          "planoId": { "nome": "string" }
        }
      ],
      "tokenAvulso": [
        {
          "_id": "ObjectId",
          "personalTrainerId": "ObjectId",
          "quantidade": "number",
          "dataVencimento": "Date",
          "ativo": "boolean",
          "motivoAdicao": "string|null",
          "adicionadoPorAdmin": "ObjectId",
          "assignedToStudentId": "ObjectId|null",
          "dateAssigned": "Date|null",
          "createdAt": "Date",
          "updatedAt": "Date",
          "assignedToStudentId": { "nome": "string" },
          "alunoId": { "nome": "string" }
        }
      ]
    },
    "normalized": {
      "id": "string",
      "tipo": "plano|avulso",
      "dataExpiracao": "Date|null",
      "status": "string",
      "alunoId": "string",
      "alunoNome": "string|undefined",
      "planoId": "string|undefined",
      "planoNome": "string|undefined",
      "quantidade": "number"
    }
  }
}
```

## Usage Examples

### cURL Example

```bash
# Development environment
curl -X GET "http://localhost:5000/api/tokens/debug/60f7b3b4e1b4c123456789ab" \
  -H "Authorization: Bearer your_jwt_token_here"

# Production environment (admin only)
curl -X GET "https://your-app.vercel.app/api/tokens/debug/60f7b3b4e1b4c123456789ab" \
  -H "Authorization: Bearer admin_jwt_token_here"
```

### JavaScript/Fetch Example

```javascript
const studentId = '60f7b3b4e1b4c123456789ab';
const token = localStorage.getItem('authToken');

fetch(`/api/tokens/debug/${studentId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('Debug data:', data.data);
    console.log('Raw Token data:', data.data.raw.token);
    console.log('Raw TokenAvulso data:', data.data.raw.tokenAvulso);
    console.log('Normalized data:', data.data.normalized);
  } else {
    console.error('Debug failed:', data.message);
  }
})
.catch(error => console.error('Error:', error));
```

## Common Use Cases

### 1. Student Token Not Appearing in UI

When a student reports their token is not showing in the UI:

1. Call the debug endpoint with the student's ID
2. Check `data.raw.token` for records in the new Token model
3. Check `data.raw.tokenAvulso` for records in the legacy TokenAvulso model
4. Compare with `data.normalized` to see what the TokenService returns
5. Look for discrepancies in data or null values

### 2. Token Assignment Issues

When tokens are not being properly assigned:

1. Verify the `alunoId` field is correctly set in raw data
2. Check `dateAssigned` fields for assignment timing
3. Verify `ativo` status is true
4. Check `dataExpiracao` vs current date for expiry issues

### 3. Migration Verification

After token migration from legacy to new model:

1. Compare counts between `raw.token` and `raw.tokenAvulso`
2. Verify data consistency between models
3. Ensure `normalized` data reflects the expected merged view

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "StudentId inválido ou não fornecido"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Acesso não autorizado. Token não fornecido.",
  "code": "TOKEN_NOT_PROVIDED"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Operação não permitida em produção para usuários não-admin"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Erro interno no endpoint de debug",
  "error": "Error details (development only)"
}
```

## Security Considerations

1. **Production Access**: In production, only admin users can access this endpoint
2. **Data Exposure**: This endpoint exposes raw database records; use with caution
3. **Rate Limiting**: Consider implementing rate limiting for this endpoint
4. **Logging**: All debug endpoint calls are logged for audit purposes

## Constraints and Limitations

1. **ObjectId Validation**: The studentId must be a valid MongoDB ObjectId format
2. **Performance**: Large datasets may cause slower response times
3. **Data Sensitivity**: Contains PII (student names, dates) - handle appropriately
4. **Model Dependencies**: Requires both Token and TokenAvulso models to be available
5. **Environment Dependent**: Behavior differs between development and production

## Related Documentation

- [Token Model Documentation](./TOKEN_MODEL.md)
- [TokenAvulso Model Documentation](./TOKEN_AVULSO_MODEL.md)
- [TokenService Documentation](./TOKEN_SERVICE.md)
- [Authentication Middleware Documentation](./AUTH_MIDDLEWARE.md)

## Support

For issues or questions about this endpoint:
1. Check server logs for detailed error messages
2. Verify proper authentication and authorization
3. Ensure studentId is a valid ObjectId format
4. Contact the development team with debug output if issues persist