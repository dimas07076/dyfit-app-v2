// server/src/services/expirationManager.ts
import { addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import Treino, { ITreino, StatusExpiracaoRotina } from '../../models/Treino.js';
import { Types } from 'mongoose';

export class ExpirationManager {
  private static readonly DEFAULT_VALIDITY_DAYS = 30;
  private static readonly WARNING_DAYS = 5;
  private static readonly GRACE_PERIOD_DAYS = 2;

  /**
   * Calculates the status of a routine based on its expiration date
   */
  static calculateStatus(expirationDate: Date | null, currentDate: Date = new Date()): StatusExpiracaoRotina {
    if (!expirationDate) {
      return 'active';
    }

    const daysUntilExpiration = differenceInDays(expirationDate, currentDate);

    if (daysUntilExpiration > this.WARNING_DAYS) {
      return 'active';
    } else if (daysUntilExpiration <= this.WARNING_DAYS && daysUntilExpiration >= 0) {
      return 'expiring';
    } else if (daysUntilExpiration < 0 && Math.abs(daysUntilExpiration) <= this.GRACE_PERIOD_DAYS) {
      return 'expired';
    } else {
      return 'inactive';
    }
  }

  /**
   * Updates the status of a single routine
   */
  static async updateRoutineStatus(routineId: string | Types.ObjectId): Promise<ITreino | null> {
    try {
      const routine = await Treino.findById(routineId);
      if (!routine) {
        return null;
      }

      const newStatus = this.calculateStatus(routine.dataValidade || null);
      
      if (routine.statusExpiracao !== newStatus) {
        routine.statusExpiracao = newStatus;
        await routine.save();
      }

      return routine;
    } catch (error) {
      console.error('Error updating routine status:', error);
      return null;
    }
  }

  /**
   * Updates status for all routines of a specific personal trainer
   */
  static async updateRoutinesForPersonal(personalId: string | Types.ObjectId): Promise<number> {
    try {
      const routines = await Treino.find({ 
        criadorId: personalId,
        tipo: 'individual',
        dataValidade: { $ne: null }
      });

      let updatedCount = 0;

      for (const routine of routines) {
        const newStatus = this.calculateStatus(routine.dataValidade || null);
        
        if (routine.statusExpiracao !== newStatus) {
          routine.statusExpiracao = newStatus;
          await routine.save();
          updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating routines for personal:', error);
      return 0;
    }
  }

  /**
   * Updates status for all individual routines in the system
   */
  static async updateAllRoutineStatuses(): Promise<number> {
    try {
      const routines = await Treino.find({ 
        tipo: 'individual',
        dataValidade: { $ne: null }
      });

      let updatedCount = 0;

      for (const routine of routines) {
        const newStatus = this.calculateStatus(routine.dataValidade || null);
        
        if (routine.statusExpiracao !== newStatus) {
          routine.statusExpiracao = newStatus;
          await routine.save();
          updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating all routine statuses:', error);
      return 0;
    }
  }

  /**
   * Sets default expiration date for a routine (30 days from creation)
   */
  static setDefaultExpirationDate(routine: ITreino): Date {
    const expirationDate = addDays(routine.criadoEm || new Date(), this.DEFAULT_VALIDITY_DAYS);
    routine.dataValidade = expirationDate;
    routine.statusExpiracao = 'active';
    return expirationDate;
  }

  /**
   * Renews a routine for another validity period
   */
  static async renewRoutine(
    routineId: string | Types.ObjectId, 
    validityDays: number = this.DEFAULT_VALIDITY_DAYS
  ): Promise<ITreino | null> {
    try {
      const routine = await Treino.findById(routineId);
      if (!routine) {
        return null;
      }

      const today = new Date();
      const newExpirationDate = addDays(today, validityDays);
      
      routine.dataValidade = newExpirationDate;
      routine.ultimaRenovacao = today;
      routine.statusExpiracao = 'active';
      
      // Reset notification flags
      if (routine.notificacoes) {
        routine.notificacoes.avisocincodias = false;
        routine.notificacoes.avisoexpiracao = false;
      } else {
        routine.notificacoes = {
          avisocincodias: false,
          avisoexpiracao: false
        };
      }

      await routine.save();
      return routine;
    } catch (error) {
      console.error('Error renewing routine:', error);
      return null;
    }
  }

  /**
   * Gets routines that need 5-day warning notification
   */
  static async getRoutinesNeedingWarning(): Promise<ITreino[]> {
    try {
      const fiveDaysFromNow = addDays(new Date(), this.WARNING_DAYS);
      
      return await Treino.find({
        tipo: 'individual',
        dataValidade: { $ne: null, $lte: fiveDaysFromNow },
        statusExpiracao: 'expiring',
        $or: [
          { 'notificacoes.avisocincodias': false },
          { 'notificacoes.avisocincodias': { $exists: false } }
        ]
      }).populate('alunoId', 'nome email')
        .populate('criadorId', 'nome email');
    } catch (error) {
      console.error('Error getting routines needing warning:', error);
      return [];
    }
  }

  /**
   * Gets routines that need expiration notification
   */
  static async getRoutinesNeedingExpirationNotice(): Promise<ITreino[]> {
    try {
      const today = new Date();
      
      return await Treino.find({
        tipo: 'individual',
        dataValidade: { $ne: null, $lt: today },
        statusExpiracao: 'expired',
        $or: [
          { 'notificacoes.avisoexpiracao': false },
          { 'notificacoes.avisoexpiracao': { $exists: false } }
        ]
      }).populate('alunoId', 'nome email')
        .populate('criadorId', 'nome email');
    } catch (error) {
      console.error('Error getting routines needing expiration notice:', error);
      return [];
    }
  }

  /**
   * Marks notification as sent for a routine
   */
  static async markNotificationSent(
    routineId: string | Types.ObjectId, 
    notificationType: 'avisocincodias' | 'avisoexpiracao'
  ): Promise<boolean> {
    try {
      const result = await Treino.updateOne(
        { _id: routineId },
        { $set: { [`notificacoes.${notificationType}`]: true } }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      return false;
    }
  }

  /**
   * Gets routines that are about to expire for a personal trainer dashboard
   */
  static async getExpiringRoutinesForPersonal(personalId: string | Types.ObjectId): Promise<ITreino[]> {
    try {
      return await Treino.find({
        criadorId: personalId,
        tipo: 'individual',
        statusExpiracao: { $in: ['expiring', 'expired'] }
      })
      .populate('alunoId', 'nome email')
      .sort({ dataValidade: 1 });
    } catch (error) {
      console.error('Error getting expiring routines for personal:', error);
      return [];
    }
  }

  /**
   * Gets statistics about routine expirations for a personal trainer
   */
  static async getExpirationStats(personalId: string | Types.ObjectId) {
    try {
      const stats = await Treino.aggregate([
        {
          $match: {
            criadorId: new Types.ObjectId(personalId.toString()),
            tipo: 'individual'
          }
        },
        {
          $group: {
            _id: '$statusExpiracao',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        active: 0,
        expiring: 0,
        expired: 0,
        inactive: 0,
        total: 0
      };

      stats.forEach(stat => {
        if (stat._id && stat._id in result) {
          result[stat._id as keyof typeof result] = stat.count;
        }
      });

      result.total = stats.reduce((sum, stat) => sum + stat.count, 0);

      return result;
    } catch (error) {
      console.error('Error getting expiration stats:', error);
      return { active: 0, expiring: 0, expired: 0, inactive: 0, total: 0 };
    }
  }
}