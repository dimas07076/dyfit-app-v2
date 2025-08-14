// server/jobs/planExpiryNotifier.ts
import PersonalPlano from '../models/PersonalPlano.js';
import { sendNotification } from '../services/NotificationService.js';

/**
 * Agenda uma verificação diária para notificar os personais
 * quando seus planos estiverem a X dias de vencer.
 * Sem necessidade de node-cron.
 */
export function startPlanExpiryNotifier() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  async function checkExpiringPlans() {
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * ONE_DAY_MS);

    // Planos que vencem entre agora e os próximos 3 dias
    const expiringPlans = await PersonalPlano.find({
      dataVencimento: { $lte: inThreeDays, $gt: now },
      ativo: true,
    });

    for (const plan of expiringPlans) {
      const userId = plan.personalTrainerId.toString();
      await sendNotification(
        userId,
        'Seu plano vence em breve. Solicite a renovação ou fale com o administrador.'
      );
    }
  }

  // Executa imediatamente e agenda para rodar a cada 24h
  checkExpiringPlans();
  setInterval(checkExpiringPlans, ONE_DAY_MS);
}
