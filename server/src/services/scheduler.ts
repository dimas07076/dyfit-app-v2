// server/src/services/scheduler.ts
import { NotificationService } from './notificationService.js';
import { ExpirationManager } from './expirationManager.js';

export class ExpirationScheduler {
  private static interval: NodeJS.Timeout | null = null;
  private static readonly DEFAULT_INTERVAL = 1000 * 60 * 60; // 1 hour

  /**
   * Starts the automatic expiration checking scheduler
   */
  static start(intervalMs: number = this.DEFAULT_INTERVAL): void {
    if (this.interval) {
      console.log('Expiration scheduler is already running');
      return;
    }

    console.log(`Starting expiration scheduler with ${intervalMs / 1000 / 60} minute interval`);
    
    // Run immediately
    this.runScheduledTasks();
    
    // Then run on interval
    this.interval = setInterval(() => {
      this.runScheduledTasks();
    }, intervalMs);
  }

  /**
   * Stops the scheduler
   */
  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Expiration scheduler stopped');
    }
  }

  /**
   * Runs the scheduled tasks manually
   */
  static async runScheduledTasks(): Promise<void> {
    try {
      console.log('🔄 Running scheduled expiration tasks...');
      
      const startTime = Date.now();
      
      // Update all routine statuses
      const updatedCount = await ExpirationManager.updateAllRoutineStatuses();
      console.log(`✅ Updated ${updatedCount} routine statuses`);
      
      // Process notifications
      const notificationResults = await NotificationService.processNotifications();
      console.log('📧 Notification results:', {
        warnings: notificationResults.warningsSent,
        expirations: notificationResults.expirationsSent,
        personalNotifications: notificationResults.personalNotificationsSent,
        errors: notificationResults.errors.length
      });
      
      if (notificationResults.errors.length > 0) {
        console.error('❌ Notification errors:', notificationResults.errors);
      }
      
      const endTime = Date.now();
      console.log(`⏱️ Scheduled tasks completed in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.error('❌ Error running scheduled tasks:', error);
    }
  }

  /**
   * Gets the current scheduler status
   */
  static getStatus(): { isRunning: boolean; intervalMs?: number } {
    return {
      isRunning: this.interval !== null,
      intervalMs: this.DEFAULT_INTERVAL
    };
  }
}

// CLI script for manual execution
if (process.argv.includes('--run-now')) {
  console.log('Running expiration tasks manually...');
  ExpirationScheduler.runScheduledTasks()
    .then(() => {
      console.log('Manual execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Manual execution failed:', error);
      process.exit(1);
    });
}

export default ExpirationScheduler;