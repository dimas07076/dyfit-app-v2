// client/src/utils/fetchWithAuth.ts

import type { TokenType } from './validateAndCleanStorage';
import { validateAndCleanStorage } from './validateAndCleanStorage';
import { refreshTokenWithCooldown } from './refreshToken';

// Custom error class for authentication failures
export class AuthError extends Error {
  public code?: string;
  public status?: number;

  constructor(message = 'Authentication failed', code?: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

// Configuration for retry logic
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

// Token refresh state management to prevent concurrent refreshes
let isRefreshing = false;
let failedQueue: Array<{ 
  resolve: (token: string | null) => void; 
  reject: (error: Error) => void 
}> = [];

/**
 * Calculate exponential backoff delay with jitter
 */
const calculateBackoffDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay);
};

/**
 * Wait for a specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Process the queue of failed requests after token refresh
 */
const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Check if the current route is a public auth route that doesn't need authentication
 */
const isPublicAuthRoute = (url: string): boolean => {
  return url.startsWith('/api/auth/') && 
         (url.includes('/login') || url.includes('/register') || url.includes('/refresh'));
};

/**
 * Enhanced fetchWithAuth with better error handling and token refresh logic
 */
export const fetchWithAuth = async <T = any>(
  url: string,
  options: RequestInit = {},
  tokenType: TokenType = 'personalAdmin'
): Promise<T> => {
  
  // Validate storage before making request (only for protected routes)
  if (!isPublicAuthRoute(url)) {
    const validationResult = validateAndCleanStorage(tokenType);
    if (!validationResult.isValid && validationResult.tokensRemoved.length > 0) {
      console.warn(`[fetchWithAuth] Storage validation failed for ${tokenType}, request may fail`);
    }
  }

  let token: string | null = null;
  
  // Get token for authenticated requests
  if (!isPublicAuthRoute(url)) {
    const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
    token = localStorage.getItem(tokenKey);
    
    if (!token) {
      console.warn(`[fetchWithAuth] No token found for protected route '${url}' (expected type: ${tokenType})`);
    }
  }

  // Prepare headers
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data: any;
    const responseText = await response.text();

    if (responseText && isJson) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[fetchWithAuth] JSON parse error for '${url}':`, parseError);
        console.error(`[fetchWithAuth] Response text: ${responseText.substring(0, 200)}...`);
        throw new Error(`Error ${response.status}: Invalid JSON response from server`);
      }
    } else if (responseText) {
      data = { message: responseText };
    } else {
      data = null;
    }
    
    if (!response.ok) {
      const errorMessage = data?.message || data?.mensagem || data?.erro || 
                          `Error ${response.status}: ${response.statusText || 'Communication error'}`;
      const errorCode = data?.code;

      // Handle authentication errors (401/403)
      if (response.status === 401 && !isPublicAuthRoute(url)) {
        console.warn(`[fetchWithAuth] 401 Unauthorized for ${tokenType} on ${url}`);
        
        // If already refreshing, queue this request
        if (isRefreshing) {
          console.log(`[fetchWithAuth] Token refresh in progress, queueing request for ${url}`);
          return new Promise((resolve, reject) => {
            failedQueue.push({ 
              resolve: (newToken) => {
                if (newToken) {
                  // Retry with new token
                  const newHeaders = new Headers(options.headers || {});
                  newHeaders.set('Authorization', `Bearer ${newToken}`);
                  newHeaders.set('Accept', 'application/json');
                  
                  if (options.body && typeof options.body === 'string') {
                    newHeaders.set('Content-Type', 'application/json');
                  }
                  
                  fetchWithAuth<T>(url, { ...options, headers: newHeaders }, tokenType)
                    .then(resolve)
                    .catch(reject);
                } else {
                  reject(new AuthError('Token refresh failed', 'REFRESH_FAILED', 401));
                }
              }, 
              reject 
            });
          });
        }

        // Start token refresh
        isRefreshing = true;
        
        try {
          console.log(`[fetchWithAuth] Attempting token refresh for ${tokenType}`);
          const newToken = await refreshTokenWithCooldown(tokenType);
          
          if (newToken) {
            // Process queue with success
            processQueue(null, newToken);
            isRefreshing = false;
            
            // Retry original request with new token
            const newHeaders = new Headers(options.headers || {});
            newHeaders.set('Authorization', `Bearer ${newToken}`);
            newHeaders.set('Accept', 'application/json');
            
            if (options.body && typeof options.body === 'string') {
              newHeaders.set('Content-Type', 'application/json');
            }
            
            console.log(`[fetchWithAuth] Retrying ${url} with refreshed token`);
            return fetchWithAuth<T>(url, { ...options, headers: newHeaders }, tokenType);
            
          } else {
            // Refresh failed
            const refreshError = new AuthError('Token refresh failed', 'REFRESH_FAILED', 401);
            processQueue(refreshError);
            isRefreshing = false;
            
            // Emit auth failed event
            window.dispatchEvent(new CustomEvent('auth-failed', { 
              detail: { 
                status: 401,
                forAluno: tokenType === 'aluno', 
                forPersonalAdmin: tokenType === 'personalAdmin',
                code: 'REFRESH_FAILED',
                url
              } 
            }));
            
            throw refreshError;
          }
        } catch (refreshError) {
          // Process queue with error
          processQueue(refreshError instanceof Error ? refreshError : new Error('Refresh failed'));
          isRefreshing = false;
          
          // Emit auth failed event if not already an AuthError
          if (!(refreshError instanceof AuthError)) {
            window.dispatchEvent(new CustomEvent('auth-failed', { 
              detail: { 
                status: 401,
                forAluno: tokenType === 'aluno', 
                forPersonalAdmin: tokenType === 'personalAdmin',
                code: errorCode || 'TOKEN_REFRESH_ERROR',
                url
              } 
            }));
          }
          
          throw refreshError;
        }
      } else if (response.status === 403) {
        // Forbidden - insufficient permissions, don't try to refresh
        console.warn(`[fetchWithAuth] 403 Forbidden for ${tokenType} on ${url}`);
        
        window.dispatchEvent(new CustomEvent('auth-failed', { 
          detail: { 
            status: 403,
            forAluno: tokenType === 'aluno', 
            forPersonalAdmin: tokenType === 'personalAdmin',
            code: errorCode || 'INSUFFICIENT_PERMISSIONS',
            url
          } 
        }));
        
        throw new AuthError(errorMessage, errorCode || 'INSUFFICIENT_PERMISSIONS', 403);
      }
      
      // For server errors (5xx), handle separately for potential retry
      if (response.status >= 500) {
        const serverError = new Error(errorMessage);
        (serverError as any).status = response.status;
        (serverError as any).isServerError = true;
        throw serverError;
      }
      
      // For other client errors (4xx), don't retry
      throw new Error(errorMessage);
    }

    return data as T;

  } catch (error) {
    // Handle network errors
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      // Re-throw other errors as-is
      throw error;
    } else {
      throw new Error('Unknown error during request.');
    }
  }
};

/**
 * Enhanced fetchWithAuth with retry logic for server errors
 */
export const fetchWithAuthAndRetry = async <T = any>(
  url: string,
  options: RequestInit = {},
  tokenType: TokenType = 'personalAdmin'
): Promise<T> => {
  
  try {
    return await fetchWithAuth<T>(url, options, tokenType);
  } catch (error: any) {
    // Only retry for server errors (5xx)
    if (error?.isServerError && error?.status >= 500) {
      console.log(`[fetchWithAuthAndRetry] Server error ${error.status} for ${url}, implementing retry with backoff`);
      
      for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
        try {
          const delay = calculateBackoffDelay(attempt);
          console.log(`[fetchWithAuthAndRetry] Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} in ${delay}ms for ${url}`);
          await sleep(delay);
          
          return await fetchWithAuth<T>(url, options, tokenType);
        } catch (retryError: any) {
          // If this is the last attempt, throw the original error
          if (attempt === RETRY_CONFIG.maxRetries - 1) {
            console.error(`[fetchWithAuthAndRetry] All retry attempts failed for ${url}`);
            throw error;
          }
          
          // If the retry error is not a server error, don't continue retrying
          if (!retryError?.isServerError || retryError?.status < 500) {
            throw retryError;
          }
        }
      }
    }
    
    // For non-server errors, throw immediately
    throw error;
  }
};

/**
 * Convenience function for making API requests with authentication
 */
export const apiRequest = async <T = any>(
  method: string,
  url: string,
  body?: any,
  tokenType: TokenType = 'personalAdmin'
): Promise<T> => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetchWithAuthAndRetry<T>(url, options, tokenType);
};

/**
 * Clear authentication state for a specific token type
 */
export const clearAuthState = (tokenType: TokenType): void => {
  console.log(`[clearAuthState] Clearing authentication state for ${tokenType}`);
  
  if (tokenType === 'aluno') {
    localStorage.removeItem('alunoAuthToken');
    localStorage.removeItem('alunoRefreshToken');
    localStorage.removeItem('alunoData');
    localStorage.removeItem('alunoLastRefreshAttempt');
  } else {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('personalAdminLastRefreshAttempt');
  }
  
  // Clear any route restoration flags
  localStorage.removeItem('restaurandoRota');
};

/**
 * Check if user is authenticated for a specific token type
 */
export const isAuthenticated = (tokenType: TokenType): boolean => {
  const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
  const refreshTokenKey = tokenType === 'aluno' ? 'alunoRefreshToken' : 'refreshToken';
  
  const token = localStorage.getItem(tokenKey);
  const refreshToken = localStorage.getItem(refreshTokenKey);
  
  return !!(token && refreshToken);
};