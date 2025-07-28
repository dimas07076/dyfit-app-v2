// client/src/lib/errorHandling.ts

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  errorId: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Creates a standardized error object for consistent error handling
 */
export function createErrorDetails(
  error: Error, 
  context?: Record<string, any>
): ErrorDetails {
  return {
    message: error.message,
    stack: error.stack,
    errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    context
  };
}

/**
 * Logs error details in a structured format
 */
export function logError(errorDetails: ErrorDetails): void {
  console.group(`🚨 Error: ${errorDetails.errorId}`);
  console.error('Message:', errorDetails.message);
  console.error('Timestamp:', errorDetails.timestamp);
  console.error('URL:', errorDetails.url);
  
  if (errorDetails.context) {
    console.error('Context:', errorDetails.context);
  }
  
  if (errorDetails.stack) {
    console.error('Stack Trace:', errorDetails.stack);
  }
  
  if (errorDetails.componentStack) {
    console.error('Component Stack:', errorDetails.componentStack);
  }
  
  console.groupEnd();
}

/**
 * Handles API errors with proper type checking and user-friendly messages
 */
export function handleApiError(error: any): ApiError {
  // Handle network errors
  if (error.name === 'NetworkError' || !navigator.onLine) {
    return {
      message: 'Erro de conexão. Verifique sua internet.',
      status: 0,
      code: 'NETWORK_ERROR'
    };
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Erro de conexão com o servidor.',
      status: 0,
      code: 'CONNECTION_ERROR'
    };
  }

  // Handle API response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    const errorMessages: Record<number, string> = {
      400: 'Dados inválidos fornecidos.',
      401: 'Você não está autorizado. Faça login novamente.',
      403: 'Você não tem permissão para realizar esta ação.',
      404: 'Recurso não encontrado.',
      409: 'Conflito: os dados já existem.',
      422: 'Dados fornecidos são inválidos.',
      429: 'Muitas tentativas. Tente novamente em alguns momentos.',
      500: 'Erro interno do servidor. Tente novamente.',
      502: 'Servidor temporariamente indisponível.',
      503: 'Serviço temporariamente indisponível.'
    };

    return {
      message: data?.message || errorMessages[status] || 'Erro desconhecido.',
      status,
      code: data?.code,
      details: data
    };
  }

  // Handle generic errors
  return {
    message: error.message || 'Erro inesperado ocorreu.',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Safely executes an async function with error handling
 */
export async function safeAsyncCall<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: ApiError }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const apiError = handleApiError(error);
    const errorDetails = createErrorDetails(
      error instanceof Error ? error : new Error(apiError.message),
      { context, apiError }
    );
    logError(errorDetails);
    return { error: apiError };
  }
}

/**
 * Creates a user-friendly error message based on the error type
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  return 'Ocorreu um erro inesperado.';
}

/**
 * Checks if an error is a specific type of API error
 */
export function isApiError(error: any, code?: string): boolean {
  if (code) {
    return error?.code === code || error?.response?.data?.code === code;
  }
  return !!(error?.response || error?.status);
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}