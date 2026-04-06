import { User } from '../models/User';
import logger from './logger';

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isExpired: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
}

const TIMEZONE = 'Europe/Moscow';

/**
 * Получить начало текущего дня в Moscow timezone (полночь).
 */
function getMoscowDayStart(date: Date): Date {
  const moscowStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD
  // Парсим как Moscow midnight → UTC
  const [year, month, day] = moscowStr.split('-').map(Number);
  // Создаём дату полуночи в Moscow через offset
  const moscowMidnight = new Date(Date.UTC(year, month - 1, day));
  // Moscow = UTC+3
  moscowMidnight.setUTCHours(moscowMidnight.getUTCHours() - 3);
  return moscowMidnight;
}

/**
 * Проверяет, был ли lastDate в тот же календарный день (Moscow TZ), что и now.
 * Если lastDate сегодня — расклад уже использован. Иначе — доступен.
 */
function isUsedToday(lastDate: Date | null | undefined, now: Date): boolean {
  if (!lastDate) return false;
  const lastTime = lastDate.getTime();
  if (lastTime > now.getTime()) return false; // данные из будущего — не блокируем
  const todayStart = getMoscowDayStart(now);
  return lastTime >= todayStart.getTime();
}

/**
 * Миллисекунды до начала следующего дня (Moscow TZ).
 */
function getMsUntilMoscowMidnight(now: Date): number {
  const todayStart = getMoscowDayStart(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return Math.max(0, tomorrowStart.getTime() - now.getTime());
}

function getCooldownMsRemaining(lastDate: Date | null | undefined, now: Date): number {
  if (!isUsedToday(lastDate, now)) return 0;
  return getMsUntilMoscowMidnight(now);
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
    if (!user) return false;
    
    const now = new Date();
    const used = isUsedToday(user.lastYesNoDate, now);
    
    logger.info('hasUsedFreeYesNo check', { 
      telegramId,
      now: now.toISOString(),
      lastYesNoDate: user.lastYesNoDate?.toISOString() || null,
      usedToday: used,
    });
    
    return used;
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
    if (!user) return false;
    
    const now = new Date();
    const used = isUsedToday(user.lastDailyAdviceDate, now);
    
    logger.info('hasUsedDailyAdviceToday check', { 
      telegramId,
      now: now.toISOString(),
      lastDailyAdviceDate: user.lastDailyAdviceDate?.toISOString() || null,
      usedToday: used,
    });
    
    return used;
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
    if (!user) return false;
    
    const now = new Date();
    const used = isUsedToday(user.lastThreeCardsDate, now);
    
    logger.info('hasUsedThreeCardsToday check', { 
      telegramId,
      now: now.toISOString(),
      lastThreeCardsDate: user.lastThreeCardsDate?.toISOString() || null,
      usedToday: used,
    });
    
    return used;
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
// Re-export pure helpers for unit testing
export { getMoscowDayStart, isUsedToday, getMsUntilMoscowMidnight, getCooldownMsRemaining, getCooldownHoursRemaining };

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
