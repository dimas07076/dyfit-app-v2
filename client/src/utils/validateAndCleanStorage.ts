// client/src/utils/validateAndCleanStorage.ts

export type TokenType = 'personalAdmin' | 'aluno';

interface StorageValidationResult {
  isValid: boolean;
  tokensRemoved: string[];
  errors: string[];
}

/**
 * Validates and cleans localStorage for a specific token type
 * This function is designed to be non-destructive - it only removes clearly corrupted data
 * and preserves valid tokens of other types
 */
export const validateAndCleanStorage = (tokenType: TokenType): StorageValidationResult => {
  const result: StorageValidationResult = {
    isValid: true,
    tokensRemoved: [],
    errors: []
  };

  try {
    // Skip validation if login is in progress to prevent interference
    if (localStorage.getItem('alunoLoginInProgress') === 'true' && tokenType === 'aluno') {
      console.log(`[validateAndCleanStorage] Skipping validation for ${tokenType} - login in progress`);
      return result;
    }
    
    const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
    const refreshTokenKey = tokenType === 'aluno' ? 'alunoRefreshToken' : 'refreshToken';
    const dataKey = tokenType === 'aluno' ? 'alunoData' : 'userData';
    
    const token = localStorage.getItem(tokenKey);
    const refreshToken = localStorage.getItem(refreshTokenKey);
    const userData = localStorage.getItem(dataKey);
    
    console.log(`[validateAndCleanStorage] Validating storage for ${tokenType}...`);
    console.log(`[validateAndCleanStorage] Token exists: ${!!token}, RefreshToken exists: ${!!refreshToken}, UserData exists: ${!!userData}`);
    
    // Check for obviously corrupted token values
    const corruptedValues = ['', 'null', 'undefined', null];
    
    // Validate main token
    if (token && corruptedValues.includes(token)) {
      console.warn(`[validateAndCleanStorage] Main token ${tokenType} is corrupted (${token}), removing...`);
      localStorage.removeItem(tokenKey);
      result.tokensRemoved.push(tokenKey);
      result.isValid = false;
    }
    
    // Validate refresh token
    if (refreshToken && corruptedValues.includes(refreshToken)) {
      console.warn(`[validateAndCleanStorage] Refresh token ${tokenType} is corrupted (${refreshToken}), removing...`);
      localStorage.removeItem(refreshTokenKey);
      result.tokensRemoved.push(refreshTokenKey);
    }
    
    // Validate user data
    if (userData && corruptedValues.includes(userData)) {
      console.warn(`[validateAndCleanStorage] User data ${tokenType} is corrupted (${userData}), removing...`);
      localStorage.removeItem(dataKey);
      result.tokensRemoved.push(dataKey);
    }
    
    // Validate JWT format for main token (basic structural validation)
    if (token && !corruptedValues.includes(token)) {
      if (!token.includes('.') || token.split('.').length !== 3) {
        console.warn(`[validateAndCleanStorage] Token ${tokenType} does not have valid JWT format, removing...`);
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(refreshTokenKey); // Also remove refresh token if main token is invalid
        result.tokensRemoved.push(tokenKey, refreshTokenKey);
        result.isValid = false;
      } else {
        // Try to parse the token to check if it's valid JSON
        try {
          const tokenParts = token.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          
          // Basic payload validation
          if (!payload.exp || !payload.iat) {
            console.warn(`[validateAndCleanStorage] Token ${tokenType} missing required fields (exp, iat), removing...`);
            localStorage.removeItem(tokenKey);
            result.tokensRemoved.push(tokenKey);
            result.isValid = false;
          } else {
            console.log(`[validateAndCleanStorage] Token ${tokenType} structure is valid`);
          }
        } catch (error) {
          console.warn(`[validateAndCleanStorage] Token ${tokenType} payload is not valid JSON, removing...`);
          localStorage.removeItem(tokenKey);
          result.tokensRemoved.push(tokenKey);
          result.isValid = false;
        }
      }
    }
    
    // Validate user data JSON format
    if (userData && !corruptedValues.includes(userData)) {
      try {
        const parsedData = JSON.parse(userData);
        // Basic validation - should have id and role for both types
        if (!parsedData.id || !parsedData.role) {
          console.warn(`[validateAndCleanStorage] User data ${tokenType} missing required fields (id, role), removing...`);
          localStorage.removeItem(dataKey);
          result.tokensRemoved.push(dataKey);
        } else {
          console.log(`[validateAndCleanStorage] User data ${tokenType} structure is valid`);
        }
      } catch (error) {
        console.warn(`[validateAndCleanStorage] User data ${tokenType} is not valid JSON, removing...`);
        localStorage.removeItem(dataKey);
        result.tokensRemoved.push(dataKey);
      }
    }
    
    // If main token was removed but refresh token exists, also remove refresh token
    if (result.tokensRemoved.includes(tokenKey) && refreshToken && !result.tokensRemoved.includes(refreshTokenKey)) {
      console.warn(`[validateAndCleanStorage] Main token was removed, also removing orphaned refresh token for ${tokenType}`);
      localStorage.removeItem(refreshTokenKey);
      result.tokensRemoved.push(refreshTokenKey);
    }
    
    // If main token was removed but user data exists, also remove user data
    if (result.tokensRemoved.includes(tokenKey) && userData && !result.tokensRemoved.push(dataKey)) {
      console.warn(`[validateAndCleanStorage] Main token was removed, also removing orphaned user data for ${tokenType}`);
      localStorage.removeItem(dataKey);
      result.tokensRemoved.push(dataKey);
    }
    
    if (result.tokensRemoved.length > 0) {
      console.log(`[validateAndCleanStorage] Cleaned ${result.tokensRemoved.length} corrupted items for ${tokenType}:`, result.tokensRemoved);
    } else {
      console.log(`[validateAndCleanStorage] Storage for ${tokenType} is clean and valid`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`[validateAndCleanStorage] Error validating storage for ${tokenType}:`, error);
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
    return result;
  }
};

/**
 * Validates tokens for all types without cleaning them
 * Used for diagnostic purposes
 */
export const validateAllTokens = (): Record<TokenType, StorageValidationResult> => {
  const results: Record<TokenType, StorageValidationResult> = {
    aluno: { isValid: true, tokensRemoved: [], errors: [] },
    personalAdmin: { isValid: true, tokensRemoved: [], errors: [] }
  };
  
  try {
    // Check aluno tokens
    const alunoToken = localStorage.getItem('alunoAuthToken');
    const alunoRefresh = localStorage.getItem('alunoRefreshToken');
    const alunoData = localStorage.getItem('alunoData');
    
    results.aluno.isValid = !!(alunoToken && alunoRefresh && alunoData);
    
    // Check personal/admin tokens
    const personalToken = localStorage.getItem('authToken');
    const personalRefresh = localStorage.getItem('refreshToken');
    const personalData = localStorage.getItem('userData');
    
    results.personalAdmin.isValid = !!(personalToken && personalRefresh && personalData);
    
    console.log('[validateAllTokens] Token validation summary:', {
      aluno: { 
        hasToken: !!alunoToken, 
        hasRefresh: !!alunoRefresh, 
        hasData: !!alunoData,
        isValid: results.aluno.isValid 
      },
      personalAdmin: { 
        hasToken: !!personalToken, 
        hasRefresh: !!personalRefresh, 
        hasData: !!personalData,
        isValid: results.personalAdmin.isValid 
      }
    });
    
  } catch (error) {
    console.error('[validateAllTokens] Error during validation:', error);
  }
  
  return results;
};

/**
 * Emergency cleanup function - removes all authentication data
 * Should only be used in extreme cases
 */
export const emergencyCleanup = (): void => {
  console.warn('[emergencyCleanup] Performing emergency cleanup of all authentication data');
  
  const keysToRemove = [
    'alunoAuthToken',
    'alunoRefreshToken', 
    'alunoData',
    'authToken',
    'refreshToken',
    'userData',
    'alunoLastRefreshAttempt',
    'restaurandoRota'
  ];
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`[emergencyCleanup] Removed ${key}`);
    }
  });
  
  console.log('[emergencyCleanup] Emergency cleanup completed');
};