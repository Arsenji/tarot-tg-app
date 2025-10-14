import { IUser } from '../models/User';
export interface SubscriptionInfo {
    hasSubscription: boolean;
    isExpired: boolean;
    canUseYesNo: boolean;
    canUseThreeCards: boolean;
    canUseDailyAdvice: boolean;
    historyLimit: number;
    freeDailyAdviceUsed: boolean;
    freeYesNoUsed: boolean;
    freeThreeCardsUsed: boolean;
    remainingDailyAdvice: number;
    remainingYesNo: number;
    remainingThreeCards: number;
}
/**
 * Проверяет статус подписки пользователя
 */
export declare const checkSubscriptionStatus: (user: IUser) => SubscriptionInfo;
/**
 * Обновляет статус пользователя после использования функции
 */
export declare const updateUserAfterUsage: (user: IUser, action: "yesno" | "daily" | "three_cards") => Promise<void>;
/**
 * Получает сообщение об ограничении для пользователя
 */
export declare const getRestrictionMessage: (action: "yesno" | "daily" | "three_cards", subscriptionInfo: SubscriptionInfo) => string;
//# sourceMappingURL=subscription.d.ts.map