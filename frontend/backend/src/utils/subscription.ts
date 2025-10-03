import { IUser } from '../models/User';

export interface SubscriptionInfo {
  hasSubscription: boolean;
  isExpired: boolean;
  canUseYesNo: boolean;
  canUseThreeCards: boolean;
  canUseDailyAdvice: boolean;
  historyLimit: number;
  // Счетчики для бесплатных пользователей
  freeDailyAdviceUsed: boolean;
  freeYesNoUsed: boolean;
  freeThreeCardsUsed: boolean;
  // Количество оставшихся бесплатных раскладов
  remainingDailyAdvice: number;
  remainingYesNo: number;
  remainingThreeCards: number;
}

/**
 * Проверяет статус подписки пользователя
 */
export const checkSubscriptionStatus = (user: IUser): SubscriptionInfo => {
  const now = new Date();
  const hasActiveSubscription = user.subscriptionStatus === 1 && 
    user.subscriptionExpiry && 
    user.subscriptionExpiry > now;

  console.log(`checkSubscriptionStatus called for user: ${user._id}`);
  console.log(`User subscription status: ${user.subscriptionStatus}`);
  console.log(`User subscription expiry: ${user.subscriptionExpiry}`);
  console.log(`Current time: ${now}`);
  console.log(`Has active subscription: ${hasActiveSubscription}`);

  // Для подписчиков все доступно, кроме "Совет дня" (раз в день)
  if (hasActiveSubscription) {
    console.log('Returning subscription info for active subscriber');
    
    // Проверяем, можно ли использовать "Совет дня" (раз в день для всех)
    const canUseDailyAdvice = !user.lastDailyAdviceDate || 
      user.lastDailyAdviceDate.toDateString() !== now.toDateString();
    
    return {
      hasSubscription: true,
      isExpired: false,
      canUseYesNo: true,
      canUseThreeCards: true,
      canUseDailyAdvice: canUseDailyAdvice,
      historyLimit: 30,
      freeDailyAdviceUsed: false,
      freeYesNoUsed: false,
      freeThreeCardsUsed: false,
      remainingDailyAdvice: canUseDailyAdvice ? -1 : 0, // -1 означает неограниченно, 0 - заблокировано
      remainingYesNo: -1,
      remainingThreeCards: -1
    };
  }

  // Для бесплатных пользователей
  const canUseDailyAdvice = !user.freeDailyAdviceUsed;
  const canUseYesNo = !user.freeYesNoUsed;
  const canUseThreeCards = !user.freeThreeCardsUsed;

  return {
    hasSubscription: false,
    isExpired: false,
    canUseYesNo,
    canUseThreeCards,
    canUseDailyAdvice,
    historyLimit: 0, // История недоступна для бесплатных пользователей
    freeDailyAdviceUsed: user.freeDailyAdviceUsed,
    freeYesNoUsed: user.freeYesNoUsed,
    freeThreeCardsUsed: user.freeThreeCardsUsed,
    remainingDailyAdvice: canUseDailyAdvice ? 1 : 0,
    remainingYesNo: canUseYesNo ? 1 : 0,
    remainingThreeCards: canUseThreeCards ? 1 : 0
  };
};

/**
 * Проверяет, являются ли две даты разными днями
 */
const isDifferentDay = (date1: Date, date2: Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() !== d2.getFullYear() ||
         d1.getMonth() !== d2.getMonth() ||
         d1.getDate() !== d2.getDate();
};

/**
 * Обновляет статус пользователя после использования функции
 */
export const updateUserAfterUsage = async (user: IUser, action: 'yesno' | 'daily' | 'three_cards'): Promise<void> => {
  const now = new Date();
  
  console.log(`updateUserAfterUsage called for action: ${action}`);
  console.log(`User subscription status: ${user.subscriptionStatus}`);
  console.log(`User subscription expiry: ${user.subscriptionExpiry}`);
  
  switch (action) {
    case 'yesno':
      if (user.subscriptionStatus !== 1) {
        user.freeYesNoUsed = true;
        console.log('Updated freeYesNoUsed for non-subscriber');
      }
      break;
    case 'daily':
      // Для "Совет дня" всегда обновляем дату, независимо от подписки
      user.lastDailyAdviceDate = now;
      if (user.subscriptionStatus !== 1) {
        user.freeDailyAdviceUsed = true;
        console.log('Updated freeDailyAdviceUsed for non-subscriber');
      } else {
        console.log('Updated lastDailyAdviceDate for subscriber');
      }
      break;
    case 'three_cards':
      if (user.subscriptionStatus !== 1) {
        user.freeThreeCardsUsed = true;
        console.log('Updated freeThreeCardsUsed for non-subscriber');
      }
      break;
  }
  
  console.log('User before save:', {
    _id: user._id,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiry: user.subscriptionExpiry,
    freeDailyAdviceUsed: user.freeDailyAdviceUsed,
    freeYesNoUsed: user.freeYesNoUsed,
    freeThreeCardsUsed: user.freeThreeCardsUsed
  });
  
  await user.save();
  
  console.log('User after save:', {
    _id: user._id,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiry: user.subscriptionExpiry,
    freeDailyAdviceUsed: user.freeDailyAdviceUsed,
    freeYesNoUsed: user.freeYesNoUsed,
    freeThreeCardsUsed: user.freeThreeCardsUsed
  });
  
  console.log('User counters updated successfully');
};

/**
 * Получает сообщение об ограничении для пользователя
 */
export const getRestrictionMessage = (action: 'yesno' | 'daily' | 'three_cards', subscriptionInfo: SubscriptionInfo): string => {
  if (subscriptionInfo.hasSubscription) {
    return '';
  }

  switch (action) {
    case 'yesno':
      return 'Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.';
    case 'daily':
      return 'Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.';
    case 'three_cards':
      return 'Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.';
    default:
      return 'Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.';
  }
};
