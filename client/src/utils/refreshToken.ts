// client/src/utils/refreshToken.ts

import type { TokenType } from './validateAndCleanStorage';
import { validateAndCleanStorage } from './validateAndCleanStorage';

interface RefreshTokenResponse {
  token: string;
  message?: string;
  // For aluno refresh response
  aluno?: {
    id: string;
    nome: string;
    email: string;
    role: 'aluno';
    personalId?: string;
  };
  // For personal refresh response  
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface RefreshConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const REFRESH_CONFIG: RefreshConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

/**
 * Calculate exponential backoff delay with jitter
 */
const calculateBackoffDelay = (attempt: number): number => {
  const delay = REFRESH_CONFIG.baseDelay * Math.pow(REFRESH_CONFIG.backoffFactor, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
  return Math.min(delay + jitter, REFRESH_CONFIG.maxDelay);
};

/**
 * Wait for a specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if we're in a public invite route where token refresh should be skipped
 */
const isPublicInviteRoute = (pathname?: string): boolean => {
  const currentPath = pathname || window.location.pathname;
  return currentPath.includes('/convite/aluno/') || 
         currentPath.includes('/cadastrar-aluno/convite/') ||
         currentPath.includes('/cadastrar-personal/convite/');
};

/**
 * Robust token refresh function with retry logic and proper error handling
 */
export const refreshToken = async (
  tokenType: TokenType, 
  retryAttempt: number = 0
): Promise<string | null> => {
  
  // Skip refresh on public invite routes
  if (isPublicInviteRoute()) {
    console.log(`[refreshToken] Skipping refresh on invite route: ${window.location.pathname}`);
    return null;
  }

  // Validate and clean storage before attempting refresh
  const validationResult = validateAndCleanStorage(tokenType);
  if (!validationResult.isValid && validationResult.tokensRemoved.length > 0) {
    console.warn(`[refreshToken] Storage validation failed for ${tokenType}, cannot refresh`);
    return null;
  }

  const refreshTokenKey = tokenType === 'aluno' ? 'alunoRefreshToken' : 'refreshToken';
  const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
  const dataKey = tokenType === 'aluno' ? 'alunoData' : 'userData';
  const refreshTokenValue = localStorage.getItem(refreshTokenKey);
  
  if (!refreshTokenValue) {
    console.warn(`[refreshToken] No refresh token found for ${tokenType}`);
    return null;
  }

  const endpoint = tokenType === 'aluno' 
    ? '/api/auth/aluno/refresh' 
    : '/api/auth/refresh';
  
  console.log(`[refreshToken] Attempting to refresh ${tokenType} token (attempt ${retryAttempt + 1}/${REFRESH_CONFIG.maxRetries + 1})`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      let errorData: any;
      const responseText = await response.text();
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText || `HTTP ${response.status}` };
      }
      
      console.warn(`[refreshToken] Server responded with ${response.status} for ${tokenType}:`, errorData.message);
      
      // Handle different error statuses
      if (response.status === 401 || response.status === 403) {
        // Invalid refresh token - remove all related data
        console.warn(`[refreshToken] Refresh token invalid for ${tokenType}, clearing all related data`);
        localStorage.removeItem(refreshTokenKey);
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(dataKey);
        return null;
      }
      
      // For 5xx errors, retry with backoff if we have attempts left
      if (response.status >= 500 && retryAttempt < REFRESH_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(retryAttempt);
        console.log(`[refreshToken] Server error ${response.status}, retrying in ${delay}ms (attempt ${retryAttempt + 1}/${REFRESH_CONFIG.maxRetries})`);
        await sleep(delay);
        return refreshToken(tokenType, retryAttempt + 1);
      }
      
      // For 4xx errors (except 401/403) or max retries reached
      console.error(`[refreshToken] Failed to refresh ${tokenType} token: ${errorData.message}`);
      return null;
    }

    // Parse successful response
    const data: RefreshTokenResponse = await response.json();
    const newToken = data.token;
    
    if (!newToken) {
      console.error(`[refreshToken] Server response missing token for ${tokenType}:`, data);
      return null;
    }

    // Store the new token
    localStorage.setItem(tokenKey, newToken);
    
    // Update user data if provided in response
    if (tokenType === 'aluno' && data.aluno) {
      localStorage.setItem(dataKey, JSON.stringify(data.aluno));
      console.log(`[refreshToken] Updated ${tokenType} user data`);
    } else if (tokenType === 'personalAdmin' && data.user) {
      localStorage.setItem(dataKey, JSON.stringify(data.user));
      console.log(`[refreshToken] Updated ${tokenType} user data`);
    }
    
    // Clear any refresh attempt tracking
    localStorage.removeItem(`${tokenType}LastRefreshAttempt`);
    
    console.log(`[refreshToken] Successfully refreshed ${tokenType} token`);
    return newToken;
    
  } catch (error) {
    console.error(`[refreshToken] Network/parsing error for ${tokenType}:`, error);
    
    // For network errors, retry with backoff if we have attempts left
    if (retryAttempt < REFRESH_CONFIG.maxRetries) {
      const delay = calculateBackoffDelay(retryAttempt);
      console.log(`[refreshToken] Network error, retrying in ${delay}ms (attempt ${retryAttempt + 1}/${REFRESH_CONFIG.maxRetries})`);
      await sleep(delay);
      return refreshToken(tokenType, retryAttempt + 1);
    }
    
    console.error(`[refreshToken] All retry attempts exhausted for ${tokenType}`);
    return null;
  }
};

/**
 * Get the time until token expires (in milliseconds)
 * Returns 0 if token is already expired or invalid
 */
export const getTokenExpirationTime = (tokenType: TokenType): number => {
  try {
    const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
    const token = localStorage.getItem(tokenKey);
    
    if (!token) {
      return 0;
    }
    
    // Parse JWT token to get expiration
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return 0;
    }
    
    const payload = JSON.parse(atob(tokenParts[1]));
    if (!payload.exp) {
      return 0;
    }
    
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeRemaining = expirationTime - currentTime;
    
    return Math.max(0, timeRemaining);
  } catch (error) {
    console.error(`[getTokenExpirationTime] Error parsing token for ${tokenType}:`, error);
    return 0;
  }
};

/**
 * Check if token needs refresh (expires within threshold)
 */
export const shouldRefreshToken = (tokenType: TokenType, thresholdMinutes: number = 2): boolean => {
  const timeRemaining = getTokenExpirationTime(tokenType);
  const thresholdMs = thresholdMinutes * 60 * 1000;
  
  return timeRemaining > 0 && timeRemaining <= thresholdMs;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (tokenType: TokenType): boolean => {
  return getTokenExpirationTime(tokenType) === 0;
};

/**
 * Enhanced refresh function that checks cooldown periods to prevent spam
 */
export const refreshTokenWithCooldown = async (
  tokenType: TokenType,
  cooldownMs: number = 60000 // 1 minute default cooldown
): Promise<string | null> => {
  const lastAttemptKey = `${tokenType}LastRefreshAttempt`;
  const lastAttempt = localStorage.getItem(lastAttemptKey);
  
  if (lastAttempt) {
    const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
    if (timeSinceLastAttempt < cooldownMs) {
      console.log(`[refreshTokenWithCooldown] Cooldown active for ${tokenType}, skipping refresh`);
      return null;
    }
  }
  
  // Store attempt timestamp
  localStorage.setItem(lastAttemptKey, Date.now().toString());
  
  try {
    const result = await refreshToken(tokenType);
    
    // Clear attempt timestamp on success
    if (result) {
      localStorage.removeItem(lastAttemptKey);
    }
    
    return result;
  } catch (error) {
    // Keep attempt timestamp on failure for cooldown
    console.error(`[refreshTokenWithCooldown] Refresh failed for ${tokenType}:`, error);
    return null;
  }
};