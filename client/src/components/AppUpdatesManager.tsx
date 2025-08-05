import { useEffect, useRef } from 'react';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Wifi } from 'lucide-react';

/**
 * AppUpdatesManager - Unified component for handling all PWA update notifications
 * 
 * This component replaces the conflicting ReloadPrompt.tsx and UpdateNotification.tsx
 * components to eliminate rendering loops and duplicate notifications.
 * 
 * Features:
 * - Shows update notifications only once when needed
 * - Shows offline ready notifications only when appropriate
 * - Prevents notification conflicts and loops
 * - Non-intrusive, professional notifications via toast
 */
export function AppUpdatesManager() {
  const {
    needRefresh,
    offlineReady,
    isUpdating,
    notificationShown,
    handleUpdate,
    handleOfflineReady,
    markUpdateNotificationShown,
    markOfflineNotificationShown,
  } = useAppUpdates();

  const { toast, dismiss } = useToast();
  const toastIds = useRef<{ update?: string; offline?: string }>({});

  // Show update notification (only once)
  useEffect(() => {
    if (needRefresh && !notificationShown.update) {
      markUpdateNotificationShown();
      
      // Dismiss any existing offline toast first
      if (toastIds.current.offline) {
        dismiss(toastIds.current.offline);
        toastIds.current.offline = undefined;
      }

      const { id } = toast({
        title: '🚀 Nova versão disponível!',
        description: 'DyFit foi atualizado com melhorias e correções.',
        action: (
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            {isUpdating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isUpdating ? 'Atualizando...' : 'Atualizar'}
          </Button>
        ),
        duration: 0, // Don't auto-dismiss
        className: "border-blue-200 bg-blue-50 text-blue-900",
      });
      
      toastIds.current.update = id;
    }
  }, [needRefresh, isUpdating, notificationShown.update, toast, dismiss, handleUpdate, markUpdateNotificationShown]);

  // Show offline ready notification (only once, and only if no update is shown)
  useEffect(() => {
    if (offlineReady && !notificationShown.offline && !needRefresh) {
      markOfflineNotificationShown();
      
      const { id } = toast({
        title: '📱 App pronto para offline!',
        description: 'DyFit já pode ser usado sem internet.',
        action: (
          <Button
            onClick={handleOfflineReady}
            variant="outline"
            size="sm"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <Wifi className="mr-2 h-4 w-4" />
            OK
          </Button>
        ),
        duration: 5000, // Auto-dismiss after 5 seconds
        className: "border-green-200 bg-green-50 text-green-900",
      });
      
      toastIds.current.offline = id;
    }
  }, [offlineReady, needRefresh, notificationShown.offline, toast, handleOfflineReady, markOfflineNotificationShown]);

  // This component renders nothing visible - all notifications are handled via toasts
  return null;
}