import { User } from '../models/User';
import logger from './logger';

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isExpired: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 часа

function getCooldownMsRemaining(lastDate: Date | null | undefined, now: Date): number {
  if (!lastDate) return 0;
  const lastTime = lastDate.getTime();
  const nowTime = now.getTime();

  // Если дата в будущем (кривые данные/часы) — не блокируем
  if (lastTime > nowTime) return 0;

  const elapsed = nowTime - lastTime;
  if (elapsed >= COOLDOWN_MS) return 0;
  return COOLDOWN_MS - elapsed;
}

function getCooldownHoursRemaining(msRemaining: number): number {
  if (msRemaining <= 0) return 0;
  return Math.ceil(msRemaining / (60 * 60 * 1000));
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
    if (!user) {
      logger.info('hasUsedFreeYesNo: user not found', { telegramId });
      return false;
    }
    
    if (!user.lastYesNoDate) {
      logger.info('hasUsedFreeYesNo: no lastYesNoDate', { 
        telegramId, 
        hasUser: true,
        lastYesNoDate: null
      });
      return false;
    }
    
    const now = new Date();
    const lastDate = new Date(user.lastYesNoDate);
    const msRemaining = getCooldownMsRemaining(lastDate, now);
    const willReturn = msRemaining > 0;
    
    logger.info('hasUsedFreeYesNo check', { 
      telegramId,
      now: now.toISOString(),
      lastYesNoDateRaw: user.lastYesNoDate?.toISOString(),
      msRemaining,
      hoursRemaining: getCooldownHoursRemaining(msRemaining),
      willReturn
    });
    
    return willReturn;
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
    const now = new Date();
    const result = await User.findOneAndUpdate(
      { telegramId },
      { lastYesNoDate: now },
      { upsert: true, new: true }
    );

    logger.info('Free Yes/No marked as used today', { 
      telegramId, 
      lastYesNoDate: now.toISOString(),
      userExists: !!result,
      updatedLastYesNoDate: result?.lastYesNoDate?.toISOString()
    });
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
    if (!user) {
      logger.info('hasUsedDailyAdviceToday: user not found', { telegramId });
      return false;
    }
    
    if (!user.lastDailyAdviceDate) {
      logger.info('hasUsedDailyAdviceToday: no lastDailyAdviceDate', { 
        telegramId, 
        hasUser: true,
        lastDailyAdviceDate: null
      });
      return false;
    }
    
    const now = new Date();
    const lastDate = new Date(user.lastDailyAdviceDate);
    const msRemaining = getCooldownMsRemaining(lastDate, now);
    const willReturn = msRemaining > 0;
    
    logger.info('hasUsedDailyAdviceToday check', { 
      telegramId,
      now: now.toISOString(),
      lastDailyAdviceDateRaw: user.lastDailyAdviceDate?.toISOString(),
      msRemaining,
      hoursRemaining: getCooldownHoursRemaining(msRemaining),
      willReturn
    });
    
    return willReturn;
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
    if (!user) {
      logger.info('hasUsedThreeCardsToday: user not found', { telegramId });
      return false;
    }
    
    if (!user.lastThreeCardsDate) {
      logger.info('hasUsedThreeCardsToday: no lastThreeCardsDate', { 
        telegramId, 
        hasUser: true,
        lastThreeCardsDate: null
      });
      return false;
    }
    
    const now = new Date();
    const lastDate = new Date(user.lastThreeCardsDate);
    const msRemaining = getCooldownMsRemaining(lastDate, now);
    const willReturn = msRemaining > 0;
    
    logger.info('hasUsedThreeCardsToday check', { 
      telegramId,
      now: now.toISOString(),
      lastThreeCardsDateRaw: user.lastThreeCardsDate?.toISOString(),
      msRemaining,
      hoursRemaining: getCooldownHoursRemaining(msRemaining),
      willReturn
    });
    
    return willReturn;
  } catch (error) {
    logger.error('Error checking three cards usage', { error, telegramId });
    return false;
  }
}

/**
 * Возвращает статус отката (cooldown) по всем бесплатным раскладам для пользователя.
 * Используется в /subscription-status, чтобы фронт мог показать "осталось X часов".
 */
export async function getFreeUsageCooldowns(telegramId: number): Promise<{
  dailyAdviceMsRemaining: number;
  yesNoMsRemaining: number;
  threeCardsMsRemaining: number;
  dailyAdviceHoursRemaining: number;
  yesNoHoursRemaining: number;
  threeCardsHoursRemaining: number;
}> {
  const now = new Date();
  try {
    const user = await User.findOne({ telegramId });
    const dailyAdviceMsRemaining = getCooldownMsRemaining(user?.lastDailyAdviceDate, now);
    const yesNoMsRemaining = getCooldownMsRemaining(user?.lastYesNoDate, now);
    const threeCardsMsRemaining = getCooldownMsRemaining(user?.lastThreeCardsDate, now);

    return {
      dailyAdviceMsRemaining,
      yesNoMsRemaining,
      threeCardsMsRemaining,
      dailyAdviceHoursRemaining: getCooldownHoursRemaining(dailyAdviceMsRemaining),
      yesNoHoursRemaining: getCooldownHoursRemaining(yesNoMsRemaining),
      threeCardsHoursRemaining: getCooldownHoursRemaining(threeCardsMsRemaining),
    };
  } catch (error) {
    logger.error('Error getting free usage cooldowns', { error, telegramId });
    return {
      dailyAdviceMsRemaining: 0,
      yesNoMsRemaining: 0,
      threeCardsMsRemaining: 0,
      dailyAdviceHoursRemaining: 0,
      yesNoHoursRemaining: 0,
      threeCardsHoursRemaining: 0,
    };
  }
}

/**
 * Отмечает, что пользователь использовал Three Cards сегодня
 */
export async function markThreeCardsUsed(telegramId: number): Promise<boolean> {
  try {
    const now = new Date();
    const result = await User.findOneAndUpdate(
      { telegramId },
      { lastThreeCardsDate: now },
      { upsert: true, new: true }
    );

    logger.info('Three Cards marked as used today', { 
      telegramId, 
      lastThreeCardsDate: now.toISOString(),
      userExists: !!result,
      updatedLastThreeCardsDate: result?.lastThreeCardsDate?.toISOString()
    });
    return true;
  } catch (error) {
    logger.error('Error marking three cards as used', { error, telegramId });
    return false;
  }
}
