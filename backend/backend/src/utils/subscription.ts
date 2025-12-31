import { User } from '../models/User';
import logger from './logger';

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isExpired: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
}

/**
 * Проверяет статус подписки пользователя
 */
export async function checkSubscriptionStatus(telegramId: number): Promise<SubscriptionStatus> {
  try {
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      return {
        hasSubscription: false,
        isExpired: true
      };
    }

    const now = new Date();
    const hasActiveSubscription = user.subscriptionStatus === 1 && 
      user.subscriptionExpiresAt && 
      user.subscriptionExpiresAt > now;

    if (!hasActiveSubscription) {
      return {
        hasSubscription: false,
        isExpired: true
      };
    }

    const daysRemaining = Math.ceil(
      (user.subscriptionExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      hasSubscription: true,
      isExpired: false,
      expiresAt: user.subscriptionExpiresAt,
      daysRemaining
    };
  } catch (error) {
    logger.error('Error checking subscription status', { error, telegramId });
    return {
      hasSubscription: false,
      isExpired: true
    };
  }
}

/**
 * Активирует подписку для пользователя
 */
export async function activateSubscription(
  telegramId: number, 
  durationDays: number = 30
): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await User.findOneAndUpdate(
      { telegramId },
      {
        subscriptionStatus: 1,
        subscriptionExpiresAt: expiresAt
      },
      { upsert: true, new: true }
    );

    logger.info('Subscription activated', { telegramId, durationDays, expiresAt });
    return true;
  } catch (error) {
    logger.error('Error activating subscription', { error, telegramId, durationDays });
    return false;
  }
}

/**
 * Деактивирует подписку пользователя
 */
export async function deactivateSubscription(telegramId: number): Promise<boolean> {
  try {
    await User.findOneAndUpdate(
      { telegramId },
      {
        subscriptionStatus: 0,
        subscriptionExpiresAt: null
      }
    );

    logger.info('Subscription deactivated', { telegramId });
    return true;
  } catch (error) {
    logger.error('Error deactivating subscription', { error, telegramId });
    return false;
  }
}

/**
 * Проверяет, использовал ли пользователь бесплатный Yes/No расклад сегодня
 */
export async function hasUsedFreeYesNo(telegramId: number): Promise<boolean> {
  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.lastYesNoDate) {
      logger.info('hasUsedFreeYesNo: user not found or no lastYesNoDate', { 
        telegramId, 
        hasUser: !!user, 
        hasLastYesNoDate: !!user?.lastYesNoDate 
      });
      return false;
    }
    
    const today = new Date();
    const lastDate = new Date(user.lastYesNoDate);
    
    // Нормализуем даты до UTC, чтобы избежать проблем с часовыми поясами
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const lastDateUTC = new Date(Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()));
    
    const isSameDay = todayUTC.getTime() === lastDateUTC.getTime();
    
    logger.info('hasUsedFreeYesNo check', { 
      telegramId, 
      today: todayUTC.toISOString(), 
      lastDate: lastDateUTC.toISOString(), 
      isSameDay 
    });
    
    return isSameDay;
  } catch (error) {
    logger.error('Error checking free Yes/No usage', { error, telegramId });
    return false;
  }
}

/**
 * Отмечает, что пользователь использовал бесплатный Yes/No расклад сегодня
 */
export async function markFreeYesNoUsed(telegramId: number): Promise<boolean> {
  try {
    await User.findOneAndUpdate(
      { telegramId },
      { lastYesNoDate: new Date() },
      { upsert: true, new: true }
    );

    logger.info('Free Yes/No marked as used today', { telegramId });
    return true;
  } catch (error) {
    logger.error('Error marking free Yes/No as used', { error, telegramId });
    return false;
  }
}

/**
 * Проверяет, использовал ли пользователь Daily Advice сегодня
 */
export async function hasUsedDailyAdviceToday(telegramId: number): Promise<boolean> {
  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.lastDailyAdviceDate) {
      logger.info('hasUsedDailyAdviceToday: user not found or no lastDailyAdviceDate', { 
        telegramId, 
        hasUser: !!user, 
        hasLastDailyAdviceDate: !!user?.lastDailyAdviceDate 
      });
      return false;
    }
    
    const today = new Date();
    const lastDate = new Date(user.lastDailyAdviceDate);
    
    // Нормализуем даты до UTC, чтобы избежать проблем с часовыми поясами
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const lastDateUTC = new Date(Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()));
    
    const isSameDay = todayUTC.getTime() === lastDateUTC.getTime();
    
    logger.info('hasUsedDailyAdviceToday check', { 
      telegramId, 
      today: todayUTC.toISOString(), 
      lastDate: lastDateUTC.toISOString(), 
      isSameDay 
    });
    
    return isSameDay;
  } catch (error) {
    logger.error('Error checking daily advice usage', { error, telegramId });
    return false;
  }
}

/**
 * Отмечает, что пользователь использовал Daily Advice сегодня
 */
export async function markDailyAdviceUsed(telegramId: number): Promise<boolean> {
  try {
    await User.findOneAndUpdate(
      { telegramId },
      { lastDailyAdviceDate: new Date() },
      { upsert: true, new: true }
    );

    logger.info('Daily Advice marked as used today', { telegramId });
    return true;
  } catch (error) {
    logger.error('Error marking daily advice as used', { error, telegramId });
    return false;
  }
}

/**
 * Проверяет, использовал ли пользователь Three Cards сегодня
 */
export async function hasUsedThreeCardsToday(telegramId: number): Promise<boolean> {
  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.lastThreeCardsDate) {
      logger.info('hasUsedThreeCardsToday: user not found or no lastThreeCardsDate', { 
        telegramId, 
        hasUser: !!user, 
        hasLastThreeCardsDate: !!user?.lastThreeCardsDate 
      });
      return false;
    }
    
    const today = new Date();
    const lastDate = new Date(user.lastThreeCardsDate);
    
    // Нормализуем даты до UTC, чтобы избежать проблем с часовыми поясами
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const lastDateUTC = new Date(Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()));
    
    const isSameDay = todayUTC.getTime() === lastDateUTC.getTime();
    
    logger.info('hasUsedThreeCardsToday check', { 
      telegramId, 
      today: todayUTC.toISOString(), 
      lastDate: lastDateUTC.toISOString(), 
      isSameDay 
    });
    
    return isSameDay;
  } catch (error) {
    logger.error('Error checking three cards usage', { error, telegramId });
    return false;
  }
}

/**
 * Отмечает, что пользователь использовал Three Cards сегодня
 */
export async function markThreeCardsUsed(telegramId: number): Promise<boolean> {
  try {
    await User.findOneAndUpdate(
      { telegramId },
      { lastThreeCardsDate: new Date() },
      { upsert: true, new: true }
    );

    logger.info('Three Cards marked as used today', { telegramId });
    return true;
  } catch (error) {
    logger.error('Error marking three cards as used', { error, telegramId });
    return false;
  }
}
