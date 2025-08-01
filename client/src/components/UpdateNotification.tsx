import { useUpdateNotification } from '@/hooks/useUpdateNotification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, RefreshCw, Download, Sparkles } from 'lucide-react';

export function UpdateNotification() {
  const { showUpdatePrompt, isUpdating, offlineReady, handleUpdate, handleDismiss } = useUpdateNotification();

  if (!showUpdatePrompt && !offlineReady) return null;

  return (
    <>
      {/* Modal de Atualização */}
      {showUpdatePrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto shadow-2xl border-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Nova Atualização</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      DyFit v2.0 • Novidades incríveis
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="mb-4 text-sm leading-relaxed">
                🚀 Melhorias de performance<br/>
                🎨 Interface aprimorada<br/>
                🐛 Correções importantes<br/>
                📱 Melhor experiência offline
              </CardDescription>
              <div className="flex space-x-3">
                <Button 
                  onClick={handleUpdate} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Atualizar Agora
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="px-4"
                >
                  Mais tarde
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}