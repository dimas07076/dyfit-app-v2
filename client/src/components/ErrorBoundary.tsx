// client/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { createComponentLogger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string; // For better logging context
  onError?: (error: Error, errorInfo: ErrorInfo) => void; // Custom error handler
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  private logger = createComponentLogger(`ErrorBoundary${this.props.componentName ? `[${this.props.componentName}]` : ''}`);
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    errorId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Enhanced logging with full context
    this.logger.error(
      'Component error caught by ErrorBoundary',
      error,
      {
        errorInfo,
        componentName: this.props.componentName,
        retryCount: this.retryCount,
        errorId: this.state.errorId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        componentStack: errorInfo.componentStack,
        errorBoundaryStack: errorInfo.errorBoundary,
      }
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        this.logger.error('Error in custom error handler', handlerError as Error);
      }
    }
  }

  private handleRetry = () => {
    this.retryCount++;
    
    this.logger.info(
      `Attempting retry ${this.retryCount}/${this.maxRetries}`,
      {
        errorId: this.state.errorId,
        previousError: this.state.error?.message,
      }
    );

    if (this.retryCount <= this.maxRetries) {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        errorId: '',
      });
    } else {
      this.logger.warn('Maximum retry attempts reached', {
        maxRetries: this.maxRetries,
        errorId: this.state.errorId,
      });
    }
  };

  private handleReload = () => {
    this.logger.info('User triggered page reload due to error', {
      errorId: this.state.errorId,
      retryCount: this.retryCount,
    });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Log render of error state
      this.logger.debug('Rendering error boundary fallback UI', {
        hasCustomFallback: !!this.props.fallback,
        errorId: this.state.errorId,
      });

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.retryCount < this.maxRetries;

      return (
        <Card className="max-w-md mx-auto mt-8 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Oops! Algo deu errado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600 dark:text-red-300">
              Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte se o problema persistir.
            </p>
            
            {/* Error ID for support */}
            <div className="text-xs text-red-500 bg-red-100 dark:bg-red-900/40 p-2 rounded">
              <strong>ID do Erro:</strong> {this.state.errorId}
              <br />
              <strong>Tentativas:</strong> {this.retryCount}/{this.maxRetries}
            </div>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs text-red-500 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                <summary className="cursor-pointer font-medium">Detalhes do erro (dev)</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>Erro:</strong>
                    <pre className="whitespace-pre-wrap break-words">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap break-words text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap break-words text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente ({this.maxRetries - this.retryCount} restantes)
                </Button>
              )}
              <Button 
                onClick={this.handleReload}
                variant={canRetry ? "outline" : "default"}
                size="sm"
                className={!canRetry ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              >
                Recarregar Página
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;