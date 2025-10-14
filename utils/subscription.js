"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRestrictionMessage = exports.updateUserAfterUsage = exports.checkSubscriptionStatus = void 0;
/**
 * Проверяет статус подписки пользователя
 */
const checkSubscriptionStatus = (user) => {
    const now = new Date();
    const hasActiveSubscription = user.subscriptionStatus === 1 &&
        user.subscriptionExpiry &&
        user.subscriptionExpiry > now;
    console.log(`checkSubscriptionStatus called for user: ${user._id}`);
    console.log(`User subscription status: ${user.subscriptionStatus}`);
    console.log(`User subscription expiry: ${user.subscriptionExpiry}`);
    console.log(`Current time: ${now}`);
    console.log(`Has active subscription: ${hasActiveSubscription}`);
    // Для подписчиков ВСЕ доступно безлимитно (включая "Совет дня")
    if (hasActiveSubscription) {
        console.log('Returning subscription info for active subscriber');
        // Подписчики могут использовать "Совет дня" безлимитно
        return {
            hasSubscription: true,
            isExpired: false,
            canUseYesNo: true,
            canUseThreeCards: true,
            canUseDailyAdvice: true, // Всегда true для подписчиков
            historyLimit: 30,
            freeDailyAdviceUsed: false,
            freeYesNoUsed: false,
            freeThreeCardsUsed: false,
            remainingDailyAdvice: -1, // -1 = безлимитно
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
exports.checkSubscriptionStatus = checkSubscriptionStatus;
/**
 * Проверяет, являются ли две даты разными днями
 */
const isDifferentDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() !== d2.getFullYear() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getDate() !== d2.getDate();
};
/**
 * Обновляет статус пользователя после использования функции
 */
const updateUserAfterUsage = async (user, action) => {
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
            // Для бесплатных пользователей отмечаем использование
            if (user.subscriptionStatus !== 1) {
                user.freeDailyAdviceUsed = true;
                console.log('Updated freeDailyAdviceUsed for non-subscriber');
            }
            else {
                // Для подписчиков НЕ обновляем ничего - безлимитно
                console.log('Daily advice used by subscriber - no limits');
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
exports.updateUserAfterUsage = updateUserAfterUsage;
/**
 * Получает сообщение об ограничении для пользователя
 */
const getRestrictionMessage = (action, subscriptionInfo) => {
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
exports.getRestrictionMessage = getRestrictionMessage;
//# sourceMappingURL=subscription.js.map