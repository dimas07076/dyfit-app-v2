// client/src/components/DebugPanel.tsx
import React, { useState, useEffect } from 'react';
import { logger, LogLevel } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bug, Download, Trash2, Eye, EyeOff, Settings } from 'lucide-react';

interface DebugPanelProps {
  isVisible?: boolean;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  isVisible = false, 
  position = 'bottom-right' 
}) => {
  const [isOpen, setIsOpen] = useState(isVisible);
  const [logs, setLogs] = useState(logger.getAllLogs());
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh logs periodically if auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(logger.getAllLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Manual refresh
  const handleRefresh = () => {
    setLogs(logger.getAllLogs());
  };

  // Filter logs by level
  const filteredLogs = selectedLevel !== null 
    ? logs.filter(log => log.level === selectedLevel)
    : logs;

  // Get position classes
  const getPositionClasses = (): string => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-left':
        return 'top-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  // Get level badge color
  const getLevelBadgeVariant = (level: LogLevel): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case LogLevel.DEBUG: return 'secondary';
      case LogLevel.INFO: return 'default';
      case LogLevel.WARN: return 'outline';
      case LogLevel.ERROR: return 'destructive';
      default: return 'default';
    }
  };

  // Get level name
  const getLevelName = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  };

  // Export logs
  const handleExportLogs = () => {
    const logsData = logger.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dyfit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear logs
  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  // Count logs by level
  const logCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-md w-full`}>
      {/* Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          title="Open Debug Panel"
        >
          <Bug className="h-4 w-4" />
        </Button>
      )}

      {/* Debug Panel */}
      {isOpen && (
        <Card className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border shadow-xl max-h-96">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bug className="h-4 w-4 text-purple-600" />
                Debug Panel
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="h-6 w-6"
                  title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
                >
                  {autoRefresh ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Tabs defaultValue="logs" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-7">
                <TabsTrigger value="logs" className="text-xs">Logs ({logs.length})</TabsTrigger>
                <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="logs" className="space-y-2">
                {/* Log Level Filters */}
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant={selectedLevel === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLevel(null)}
                    className="h-6 text-xs"
                  >
                    All ({logs.length})
                  </Button>
                  {Object.entries(logCounts).map(([level, count]) => (
                    <Button
                      key={level}
                      variant={selectedLevel === Number(level) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedLevel(Number(level) as LogLevel)}
                      className="h-6 text-xs"
                    >
                      {getLevelName(Number(level) as LogLevel)} ({count})
                    </Button>
                  ))}
                </div>

                {/* Log List */}
                <ScrollArea className="h-48 w-full border rounded p-2">
                  {filteredLogs.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center">No logs available</p>
                  ) : (
                    <div className="space-y-1">
                      {filteredLogs.slice(-50).reverse().map((log, index) => (
                        <div
                          key={index}
                          className="text-xs p-1 rounded border-l-2"
                          style={{ borderLeftColor: 
                            log.level === LogLevel.ERROR ? '#EF4444' :
                            log.level === LogLevel.WARN ? '#F59E0B' :
                            log.level === LogLevel.INFO ? '#3B82F6' : '#6B7280'
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant={getLevelBadgeVariant(log.level)} className="h-4 text-xs">
                              {getLevelName(log.level)}
                            </Badge>
                            <span className="font-mono text-gray-500">
                              [{log.component}]
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="font-mono text-gray-700 dark:text-gray-300">
                            {log.message}
                          </div>
                          {log.error && (
                            <div className="text-red-600 font-mono text-xs mt-1">
                              {log.error.message}
                            </div>
                          )}
                          {log.data && (
                            <details className="mt-1">
                              <summary className="text-gray-500 cursor-pointer text-xs">Data</summary>
                              <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="h-6 text-xs"
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportLogs}
                    className="h-6 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearLogs}
                    className="h-6 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-2">
                <div className="text-xs space-y-2">
                  <div>
                    <strong>Environment:</strong> {import.meta.env.MODE}
                  </div>
                  <div>
                    <strong>Total Logs:</strong> {logs.length}
                  </div>
                  <div>
                    <strong>Performance:</strong>
                    <div className="ml-2">
                      Memory: {(performance as any).memory ? 
                        `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                        'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <strong>React Query:</strong>
                    <div className="ml-2">
                      Cache available: {typeof window !== 'undefined' && (window as any).ReactQuery ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <strong>Global Logger:</strong>
                    <div className="ml-2">
                      Available at: window.DyfitLogger
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DebugPanel;