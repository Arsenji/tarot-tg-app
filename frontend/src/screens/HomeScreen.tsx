'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { FloatingCard } from '@/components/FloatingCard';
import { TarotLogo } from '@/components/TarotLogo';
import BottomNavigation from '@/components/BottomNavigation';
import { SparklesIcon, Calendar, HelpCircle, Crown, Lock } from 'lucide-react';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useSubscriptionStatus } from '@/state/subscriptionStore';

const sparklesData = [
  { left: 10, top: 20, delay: 0, duration: 2.5 },
  { left: 85, top: 15, delay: 0.5, duration: 3 },
  { left: 25, top: 80, delay: 1, duration: 2.8 },
  { left: 70, top: 60, delay: 1.5, duration: 3.2 },
  { left: 45, top: 30, delay: 2, duration: 2.7 },
  { left: 90, top: 40, delay: 2.5, duration: 3.1 },
  { left: 15, top: 50, delay: 3, duration: 2.9 },
  { left: 60, top: 85, delay: 3.5, duration: 2.6 },
  { left: 35, top: 10, delay: 4, duration: 3.3 },
  { left: 80, top: 75, delay: 4.5, duration: 2.4 },
  { left: 5, top: 65, delay: 0.2, duration: 2.8 },
  { left: 95, top: 25, delay: 0.7, duration: 3.1 },
  { left: 20, top: 35, delay: 1.2, duration: 2.9 },
  { left: 75, top: 50, delay: 1.7, duration: 2.7 },
  { left: 50, top: 70, delay: 2.2, duration: 3.2 },
];

const SparklesBackground = () => (
  <div className="absolute inset-0">
    {sparklesData.map((sparkle, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-amber-300 rounded-full"
        style={{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
        }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1, 0],
        }}
        transition={{
          duration: sparkle.duration,
          repeat: Infinity,
          delay: sparkle.delay,
        }}
      />
    ))}
  </div>
);

interface HomeScreenProps {
  activeTab: 'home' | 'history';
  onTabChange: (tab: 'home' | 'history') => void;
  onOneCard: () => void;
  onYesNo: () => void;
  onThreeCards: () => void;
}

export const MainScreen = ({ activeTab, onTabChange, onOneCard, onYesNo, onThreeCards }: HomeScreenProps) => {
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  // Глобальное состояние подписки (shared promise + pessimistic lock)
  const { loaded, loading, subscriptionInfo } = useSubscriptionStatus();
  const isSubscriptionLoading = !loaded || loading;

  const handleOpenSubscriptionModal = () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleCloseSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
  };

  const getRemainingCount = (type: 'daily' | 'three_cards' | 'yesno') => {
    if (!subscriptionInfo) return -1;
    switch (type) {
      case 'daily':
        return subscriptionInfo.remainingDailyAdvice ?? -1;
      case 'three_cards':
        return subscriptionInfo.remainingThreeCards ?? -1;
      case 'yesno':
        return subscriptionInfo.remainingYesNo ?? -1;
      default:
        return -1;
    }
  };

  const getCooldownHoursRemaining = (type: 'daily' | 'three_cards' | 'yesno') => {
    const cooldowns = subscriptionInfo?.cooldowns;
    if (!cooldowns) return 0;
    switch (type) {
      case 'daily':
        return cooldowns.dailyAdviceHoursRemaining ?? 0;
      case 'three_cards':
        return cooldowns.threeCardsHoursRemaining ?? 0;
      case 'yesno':
        return cooldowns.yesNoHoursRemaining ?? 0;
      default:
        return 0;
    }
  };

  const canUseType = (type: 'daily' | 'three_cards' | 'yesno') => {
    if (!subscriptionInfo) return false;
    switch (type) {
      case 'daily':
        return !!subscriptionInfo.canUseDailyAdvice;
      case 'three_cards':
        return !!subscriptionInfo.canUseThreeCards;
      case 'yesno':
        return !!subscriptionInfo.canUseYesNo;
      default:
        return false;
    }
  };

  const isTypeDisabled = (type: 'daily' | 'three_cards' | 'yesno') => {
    // Пока не получили статус с backend — ВСЁ блокируем и игнорируем клики (устраняем race condition)
    if (isSubscriptionLoading) return true;
    if (subscriptionInfo?.hasSubscription) return false;
    const remaining = getRemainingCount(type);
    const canUse = canUseType(type);
    // Если remaining не пришёл — не показываем "использовано" по умолчанию, но уважаем canUse
    if (remaining === -1) return !canUse;
    return remaining === 0 || !canUse;
  };

  const handleOneCardClick = () => {
    if (isSubscriptionLoading) return;
    if (isTypeDisabled('daily')) {
      // Если кнопка заблокирована, открываем модальное окно подписки
      handleOpenSubscriptionModal();
      return;
    }
    
    // Для подписчиков - всегда разрешено
    if (subscriptionInfo?.hasSubscription) {
      onOneCard();
      return;
    }
    
    // Для бесплатных пользователей проверяем remainingDailyAdvice
    const remaining = subscriptionInfo?.remainingDailyAdvice ?? 0;
    if (remaining > 0 && subscriptionInfo?.canUseDailyAdvice) {
      onOneCard();
    } else {
      handleOpenSubscriptionModal();
    }
  };

  const handleYesNoClick = () => {
    if (isSubscriptionLoading) return;
    if (isTypeDisabled('yesno')) {
      handleOpenSubscriptionModal();
      return;
    }
    if (subscriptionInfo?.canUseYesNo || subscriptionInfo?.hasSubscription) {
      onYesNo();
    } else {
      handleOpenSubscriptionModal();
    }
  };

  const handleThreeCardsClick = () => {
    if (isSubscriptionLoading) return;
    if (isTypeDisabled('three_cards')) {
      handleOpenSubscriptionModal();
      return;
    }
    if (subscriptionInfo?.canUseThreeCards || subscriptionInfo?.hasSubscription) {
      onThreeCards();
    } else {
      handleOpenSubscriptionModal();
    }
  };

  const getRemainingText = (type: 'daily' | 'three_cards' | 'yesno') => {
    const remaining = getRemainingCount(type);
    if (subscriptionInfo?.hasSubscription) return '';
    if (remaining === -1) return '';
    if (isSubscriptionLoading) return 'Проверяем доступ...';
    if (remaining === 0) {
      const hours = getCooldownHoursRemaining(type);
      return hours > 0 ? `Использовано (осталось ${hours} ч)` : 'Использовано';
    }
    return 'Доступно';
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-between pt-20 pb-16">
      <SparklesBackground />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
        <TarotLogo />
        <h1 className="text-3xl font-bold mt-4 mb-2 text-center">AI-Таролог</h1>
        <p className="text-gray-300 text-center mb-8">Ваш личный проводник в мир Таро</p>


        <div className="w-full max-w-sm space-y-4 mt-8">
          {/* One Card Button */}
          <motion.div 
            whileHover={{ scale: (!isTypeDisabled('daily')) ? 1.02 : 1 }} 
            whileTap={{ scale: (!isTypeDisabled('daily')) ? 0.98 : 1 }}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleOneCardClick}
              disabled={isTypeDisabled('daily')}
              className={`w-full h-20 text-white border-2 rounded-3xl shadow-xl transition-all duration-300 backdrop-blur-sm ${
                !isTypeDisabled('daily')
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-amber-400/30 hover:border-amber-400/50 hover:shadow-2xl cursor-pointer'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-60 cursor-not-allowed pointer-events-none'
              }`}
              style={{ pointerEvents: (!isTypeDisabled('daily')) ? 'auto' : 'none' }}
            >
              <div className="flex items-center space-x-6 w-full pl-2">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  !isTypeDisabled('daily')
                    ? 'bg-amber-600/20 border-amber-400/30'
                    : 'bg-slate-600/20 border-slate-500/30'
                }`}>
                  {!isTypeDisabled('daily') ? (
                    <SparklesIcon className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className={`text-lg font-semibold ${
                    !isTypeDisabled('daily') ? 'text-white' : 'text-slate-400'
                  }`}>Одна карта</div>
                  <div className={`text-sm ${
                    !isTypeDisabled('daily') ? 'text-gray-300' : 'text-slate-500'
                  }`}>Совет дня</div>
                  {!subscriptionInfo?.hasSubscription && (
                    <div className="text-xs text-amber-400 mt-1">
                      {getRemainingText('daily')}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          </motion.div>

          {/* Yes/No Button */}
          <motion.div 
            whileHover={{ scale: (!isTypeDisabled('yesno')) ? 1.02 : 1 }} 
            whileTap={{ scale: (!isTypeDisabled('yesno')) ? 0.98 : 1 }}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleYesNoClick}
              disabled={isTypeDisabled('yesno')}
              className={`w-full h-20 text-white border-2 rounded-3xl shadow-xl transition-all duration-300 backdrop-blur-sm ${
                !isTypeDisabled('yesno')
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-emerald-400/30 hover:border-emerald-400/50 hover:shadow-2xl'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-6 w-full pl-2">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  !isTypeDisabled('yesno')
                    ? 'bg-emerald-600/20 border-emerald-400/30'
                    : 'bg-slate-600/20 border-slate-500/30'
                }`}>
                  {!isTypeDisabled('yesno') ? (
                    <HelpCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className={`text-lg font-semibold ${
                    !isTypeDisabled('yesno') ? 'text-white' : 'text-slate-400'
                  }`}>Да/Нет</div>
                  <div className={`text-sm ${
                    !isTypeDisabled('yesno') ? 'text-gray-300' : 'text-slate-500'
                  }`}>Быстрый ответ</div>
                  {!subscriptionInfo?.hasSubscription && (
                    <div className="text-xs text-emerald-400 mt-1">
                      {getRemainingText('yesno')}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          </motion.div>

          {/* Three Cards Button */}
          <motion.div 
            whileHover={{ scale: (!isTypeDisabled('three_cards')) ? 1.02 : 1 }} 
            whileTap={{ scale: (!isTypeDisabled('three_cards')) ? 0.98 : 1 }}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={handleThreeCardsClick}
              disabled={isTypeDisabled('three_cards')}
              className={`w-full h-20 text-white border-2 rounded-3xl shadow-xl transition-all duration-300 backdrop-blur-sm ${
                !isTypeDisabled('three_cards')
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-purple-400/30 hover:border-purple-400/50 hover:shadow-2xl'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-6 w-full pl-2">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  !isTypeDisabled('three_cards')
                    ? 'bg-purple-600/20 border-purple-400/30'
                    : 'bg-slate-600/20 border-slate-500/30'
                }`}>
                  {!isTypeDisabled('three_cards') ? (
                    <Calendar className="w-6 h-6 text-purple-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className={`text-lg font-semibold ${
                    !isTypeDisabled('three_cards') ? 'text-white' : 'text-slate-400'
                  }`}>Три карты</div>
                  <div className={`text-sm ${
                    !isTypeDisabled('three_cards') ? 'text-gray-300' : 'text-slate-500'
                  }`}>Прошлое–Настоящее–Будущее</div>
                  {!subscriptionInfo?.hasSubscription && (
                    <div className="text-xs text-purple-400 mt-1">
                      {getRemainingText('three_cards')}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          </motion.div>

        </div>
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={handleCloseSubscriptionModal}
        title="Требуется подписка"
        message="Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений."
      />
    </div>
  );
};

export default MainScreen;