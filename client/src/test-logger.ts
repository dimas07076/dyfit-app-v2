// client/src/test-logger.ts
// Test script for the logging system - can be run in browser console
// Usage: In browser console, run: testLogger()

import { logger, createComponentLogger } from './lib/logger';

declare global {
  interface Window {
    testLogger: () => void;
    DyfitLogger: any;
  }
}

export function testLogger() {
  console.log('🧪 Testing DyFit Logger System...\n');

  try {
    // Test basic logger
    logger.info('TestScript', 'Basic logger test', { data: 'test', timestamp: Date.now() });
    logger.warn('TestScript', 'Warning test');
    logger.error('TestScript', 'Error test', new Error('Test error'));
    logger.debug('TestScript', 'Debug test');

    // Test component logger
    const componentLogger = createComponentLogger('TestComponent');
    componentLogger.info('Component logger test');
    componentLogger.error('Component error test', new Error('Component error'));

    // Test lifecycle methods
    componentLogger.mounted({ prop1: 'value1' });
    componentLogger.updated({ changed: 'prop2' });
    componentLogger.unmounted();

    // Test performance timing
    logger.time('TestComponent', 'performance-test');
    setTimeout(() => {
      logger.timeEnd('TestComponent', 'performance-test');
    }, 100);

    // Test query helpers
    componentLogger.queryStarted('test-query');
    setTimeout(() => {
      componentLogger.querySuccess('test-query', { data: 'test result', count: 5 });
    }, 50);
    
    setTimeout(() => {
      componentLogger.queryError('test-query-2', new Error('Query failed test'));
    }, 75);

    // Test user actions
    componentLogger.userAction('button-click', { buttonId: 'test-button', timestamp: Date.now() });
    componentLogger.userAction('navigation', { from: '/dashboard', to: '/alunos' });

    console.log('✅ Logger tests completed. Check console for colored output.');
    console.log('📊 Available commands:');
    console.log('  - window.DyfitLogger.getAllLogs() - Get all logs');
    console.log('  - window.DyfitLogger.clearLogs() - Clear all logs');
    console.log('  - window.DyfitLogger.exportLogs() - Export logs as JSON');

    // Show some stats
    const allLogs = logger.getAllLogs();
    console.log(`📈 Total logs generated: ${allLogs.length}`);
    
    return {
      success: true,
      logsGenerated: allLogs.length,
      lastLogs: allLogs.slice(-5),
    };
  } catch (error) {
    console.error('❌ Logger test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Make it available globally in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.testLogger = testLogger;
}