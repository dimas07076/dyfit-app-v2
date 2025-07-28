// client/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('ErrorBoundary caught an error:', errorDetails);
    
    // Store error details for potential reporting
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Optional: Send error to monitoring service
    // Example: sendErrorToMonitoring(errorDetails);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
          <Card className="max-w-lg w-full border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Oops! Algo deu errado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-600 dark:text-red-300">
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada e está trabalhando para resolver o problema.
              </p>
              
              {this.state.errorId && (
                <div className="text-xs text-red-500 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                  <strong>ID do Erro:</strong> {this.state.errorId}
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs text-red-500 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                  <summary className="cursor-pointer font-medium mb-2">Detalhes do erro (dev)</summary>
                  <div className="space-y-2">
                    <div>
                      <strong>Erro:</strong>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 whitespace-pre-wrap break-words text-xs max-h-32 overflow-y-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap break-words text-xs max-h-32 overflow-y-auto">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleRetry}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Ir para Início
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;