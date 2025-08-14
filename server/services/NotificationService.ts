// server/services/NotificationService.ts
import Notification from '../models/Notification.js';

export async function sendNotification(userId: string, message: string) {
  try {
    const notification = new Notification({ userId, message });
    await notification.save();
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
}
