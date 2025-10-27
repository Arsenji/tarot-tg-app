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
 * Проверяет, использовал ли пользователь бесплатный Yes/No расклад
 */
export async function hasUsedFreeYesNo(telegramId: number): Promise<boolean> {
  try {
    const user = await User.findOne({ telegramId });
    return user?.freeYesNoUsed || false;
  } catch (error) {
    logger.error('Error checking free Yes/No usage', { error, telegramId });
    return false;
  }
}

/**
 * Отмечает, что пользователь использовал бесплатный Yes/No расклад
 */
export async function markFreeYesNoUsed(telegramId: number): Promise<boolean> {
  try {
    await User.findOneAndUpdate(
      { telegramId },
      { freeYesNoUsed: true },
      { upsert: true, new: true }
    );

    logger.info('Free Yes/No marked as used', { telegramId });
    return true;
  } catch (error) {
    logger.error('Error marking free Yes/No as used', { error, telegramId });
    return false;
  }
}
