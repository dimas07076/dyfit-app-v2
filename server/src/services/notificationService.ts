// server/src/services/notificationService.ts
import { ITreino } from '../../models/Treino.js';
import { ExpirationManager } from './expirationManager.js';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'expiration' | 'info';
  routineId: string;
  recipientType: 'student' | 'personal';
  recipientId: string;
  recipientEmail?: string;
  action?: {
    type: 'contact' | 'renew' | 'view';
    label: string;
    url?: string;
  };
}

export class NotificationService {
  /**
   * Creates notification data for a 5-day warning
   */
  static createWarningNotification(routine: ITreino): NotificationData | null {
    try {
      if (!routine.dataValidade || !routine.alunoId) {
        return null;
      }

      const daysUntilExpiration = differenceInDays(routine.dataValidade, new Date());
      const expirationDate = format(routine.dataValidade, "d 'de' MMMM", { locale: ptBR });

      const alunoId = routine.alunoId as any;
      const studentId = typeof alunoId === 'object' && alunoId?.nome 
        ? alunoId._id.toString()
        : alunoId.toString();

      const studentEmail = typeof alunoId === 'object' && alunoId?.email 
        ? alunoId.email 
        : undefined;

      return {
        id: `warning_${routine._id}_${Date.now()}`,
        title: `Sua rotina expira em ${Math.abs(daysUntilExpiration)} dias! 🏋️‍♂️`,
        message: `Sua rotina "${routine.titulo}" expira em ${expirationDate}. Entre em contato com seu personal para renovar.`,
        type: 'warning',
        routineId: String(routine._id),
        recipientType: 'student',
        recipientId: studentId,
        recipientEmail: studentEmail,
        action: {
          type: 'contact',
          label: 'Contatar Personal',
          url: `/contact/${routine.criadorId}`
        }
      };
    } catch (error) {
      console.error('Error creating warning notification:', error);
      return null;
    }
  }

  /**
   * Creates notification data for routine expiration
   */
  static createExpirationNotification(routine: ITreino): NotificationData | null {
    try {
      if (!routine.dataValidade || !routine.alunoId) {
        return null;
      }

      const expirationDate = format(routine.dataValidade, "d 'de' MMMM", { locale: ptBR });

      const alunoId = routine.alunoId as any;
      const studentId = typeof alunoId === 'object' && alunoId?.nome 
        ? alunoId._id.toString()
        : alunoId.toString();

      const studentEmail = typeof alunoId === 'object' && alunoId?.email 
        ? alunoId.email 
        : undefined;

      return {
        id: `expiration_${routine._id}_${Date.now()}`,
        title: 'Rotina expirada hoje! ⏰',
        message: `Sua rotina "${routine.titulo}" expirou em ${expirationDate}. Sua rotina precisa ser renovada para continuar.`,
        type: 'expiration',
        routineId: String(routine._id),
        recipientType: 'student',
        recipientId: studentId,
        recipientEmail: studentEmail,
        action: {
          type: 'contact',
          label: 'Contatar Personal',
          url: `/contact/${routine.criadorId}`
        }
      };
    } catch (error) {
      console.error('Error creating expiration notification:', error);
      return null;
    }
  }

  /**
   * Creates notification data for personal trainer about expiring routines
   */
  static createPersonalExpirationNotification(routines: ITreino[]): NotificationData | null {
    try {
      if (routines.length === 0) {
        return null;
      }

      const personalId = routines[0].criadorId.toString();
      const count = routines.length;
      
      const title = count === 1 
        ? 'Rotina de aluno prestes a expirar! 📋'
        : `${count} rotinas de alunos prestes a expirar! 📋`;

      const firstRoutine = routines[0];
      const alunoId = firstRoutine.alunoId as any;
      const alunoNome = typeof alunoId === 'object' && alunoId?.nome 
        ? alunoId.nome 
        : 'N/A';

      const message = count === 1
        ? `A rotina "${firstRoutine.titulo}" do aluno ${alunoNome} está prestes a expirar.`
        : `Você tem ${count} rotinas de alunos que estão prestes a expirar ou já expiraram.`;

      return {
        id: `personal_expiration_${personalId}_${Date.now()}`,
        title,
        message,
        type: 'warning',
        routineId: String(firstRoutine._id),
        recipientType: 'personal',
        recipientId: personalId,
        action: {
          type: 'view',
          label: 'Ver Rotinas',
          url: '/dashboard/expiring-routines'
        }
      };
    } catch (error) {
      console.error('Error creating personal expiration notification:', error);
      return null;
    }
  }

  /**
   * Processes and sends all pending notifications
   */
  static async processNotifications(): Promise<{
    warningsSent: number;
    expirationsSent: number;
    personalNotificationsSent: number;
    errors: string[];
  }> {
    const result = {
      warningsSent: 0,
      expirationsSent: 0,
      personalNotificationsSent: 0,
      errors: [] as string[]
    };

    try {
      // Update all routine statuses first
      await ExpirationManager.updateAllRoutineStatuses();

      // Process 5-day warnings
      const routinesNeedingWarning = await ExpirationManager.getRoutinesNeedingWarning();
      for (const routine of routinesNeedingWarning) {
        try {
          const notification = this.createWarningNotification(routine);
          if (notification) {
            await this.sendNotification(notification);
            await ExpirationManager.markNotificationSent(String(routine._id), 'avisocincodias');
            result.warningsSent++;
          }
        } catch (error) {
          result.errors.push(`Warning notification error for routine ${routine._id}: ${String(error)}`);
        }
      }

      // Process expiration notifications
      const routinesNeedingExpiration = await ExpirationManager.getRoutinesNeedingExpirationNotice();
      for (const routine of routinesNeedingExpiration) {
        try {
          const notification = this.createExpirationNotification(routine);
          if (notification) {
            await this.sendNotification(notification);
            await ExpirationManager.markNotificationSent(String(routine._id), 'avisoexpiracao');
            result.expirationsSent++;
          }
        } catch (error) {
          result.errors.push(`Expiration notification error for routine ${routine._id}: ${String(error)}`);
        }
      }

      // Group routines by personal trainer for personal notifications
      const personalRoutinesMap = new Map<string, ITreino[]>();
      [...routinesNeedingWarning, ...routinesNeedingExpiration].forEach(routine => {
        const personalId = routine.criadorId.toString();
        if (!personalRoutinesMap.has(personalId)) {
          personalRoutinesMap.set(personalId, []);
        }
        personalRoutinesMap.get(personalId)!.push(routine);
      });

      // Send notifications to personal trainers
      for (const [personalId, routines] of personalRoutinesMap) {
        try {
          const notification = this.createPersonalExpirationNotification(routines);
          if (notification) {
            await this.sendNotification(notification);
            result.personalNotificationsSent++;
          }
        } catch (error) {
          result.errors.push(`Personal notification error for personal ${personalId}: ${String(error)}`);
        }
      }

    } catch (error) {
      result.errors.push(`General notification processing error: ${String(error)}`);
    }

    return result;
  }

  /**
   * Sends a notification (placeholder for actual implementation)
   * In a real app, this would integrate with push notification services,
   * email services, etc.
   */
  private static async sendNotification(notification: NotificationData): Promise<void> {
    try {
      // Log the notification for now
      console.log('📧 Notification sent:', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        recipient: `${notification.recipientType}:${notification.recipientId}`,
        action: notification.action
      });

      // Here you would integrate with:
      // - Push notification services (Web Push API, Firebase, etc.)
      // - Email services (SendGrid, Nodemailer, etc.)
      // - In-app notification system
      // - SMS services (Twilio, etc.)

      // For now, we'll just simulate a successful send
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Gets notification history for a user (placeholder)
   */
  static async getNotificationHistory(
    userId: string,
    userType: 'student' | 'personal'
  ): Promise<NotificationData[]> {
    // In a real implementation, this would fetch from a notifications database
    // For now, return empty array
    return [];
  }

  /**
   * Creates a renewal success notification
   */
  static createRenewalSuccessNotification(routine: ITreino): NotificationData | null {
    try {
      if (!routine.dataValidade || !routine.alunoId) {
        return null;
      }

      const newExpirationDate = format(routine.dataValidade, "d 'de' MMMM", { locale: ptBR });

      const alunoId = routine.alunoId as any;
      const studentId = typeof alunoId === 'object' && alunoId?.nome 
        ? alunoId._id.toString()
        : alunoId.toString();

      const studentEmail = typeof alunoId === 'object' && alunoId?.email 
        ? alunoId.email 
        : undefined;

      return {
        id: `renewal_${routine._id}_${Date.now()}`,
        title: 'Rotina renovada com sucesso! ✅',
        message: `Sua rotina "${routine.titulo}" foi renovada até ${newExpirationDate}.`,
        type: 'info',
        routineId: String(routine._id),
        recipientType: 'student',
        recipientId: studentId,
        recipientEmail: studentEmail,
        action: {
          type: 'view',
          label: 'Ver Rotina',
          url: `/routines/${routine._id}`
        }
      };
    } catch (error) {
      console.error('Error creating renewal success notification:', error);
      return null;
    }
  }
}