'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { FloatingCard } from '@/components/FloatingCard';
import { TarotLogo } from '@/components/TarotLogo';
import BottomNavigation from '@/components/BottomNavigation';
import { SparklesIcon, Calendar, HelpCircle, Crown, Lock } from 'lucide-react';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { BlockedTarotModal } from '@/components/BlockedTarotModal';
import { getTarotAvailability, TarotType, useSubscriptionStatus } from '@/state/subscriptionStore';

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
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedType, setBlockedType] = useState<TarotType>('daily');
  const [blockedNextAvailableAt, setBlockedNextAvailableAt] = useState<Date | undefined>(undefined);
  // Глобальное состояние подписки (shared promise + pessimistic lock)
  const { loaded, loading, subscriptionInfo } = useSubscriptionStatus();

  const handleOpenSubscriptionModal = () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleCloseSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
  };

  const openBlockedModal = (type: TarotType) => {
    const availability = getTarotAvailability(type);
    setBlockedType(type);
    setBlockedNextAvailableAt(availability.nextAvailableAt);
    setBlockedModalOpen(true);
  };

  const closeBlockedModal = () => {
    setBlockedModalOpen(false);
  };

  const getStatusText = (type: TarotType) => {
    if (subscriptionInfo?.hasSubscription) return '';
    const availability = getTarotAvailability(type);
    if (availability.allowed) return 'Доступно';
    if (availability.nextAvailableAt) {
      const ms = availability.nextAvailableAt.getTime() - Date.now();
      const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
      return `Использовано (осталось ${hours} ч)`;
    }
    return 'Использовано';
  };

  const onTarotClick = (type: TarotType, start: () => void) => {
    // AppBootstrap не рендерит экран до loaded=true, но оставляем защиту.
    if (!loaded || loading) return;

    const availability = getTarotAvailability(type);
    if (!availability.allowed) {
      openBlockedModal(type);
      return;
    }

    start();
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
            whileHover={{ scale: (getTarotAvailability('daily').allowed) ? 1.02 : 1 }} 
            whileTap={{ scale: (getTarotAvailability('daily').allowed) ? 0.98 : 1 }}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => onTarotClick('daily', onOneCard)}
              className={`w-full h-20 text-white border-2 rounded-3xl shadow-xl transition-all duration-300 backdrop-blur-sm ${
                getTarotAvailability('daily').allowed
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-amber-400/30 hover:border-amber-400/50 hover:shadow-2xl cursor-pointer'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-6 w-full pl-2">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  getTarotAvailability('daily').allowed
                    ? 'bg-amber-600/20 border-amber-400/30'
                    : 'bg-slate-600/20 border-slate-500/30'
                }`}>
                  {getTarotAvailability('daily').allowed ? (
                    <SparklesIcon className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className={`text-lg font-semibold ${
                    getTarotAvailability('daily').allowed ? 'text-white' : 'text-slate-400'
                  }`}>Одна карта</div>
                  <div className={`text-sm ${
                    getTarotAvailability('daily').allowed ? 'text-gray-300' : 'text-slate-500'
                  }`}>Совет дня</div>
                  {!subscriptionInfo?.hasSubscription && (
                    <div className="text-xs text-amber-400 mt-1">
                      {getStatusText('daily')}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          </motion.div>

          {/* Yes/No Button */}
          <motion.div 
            whileHover={{ scale: (getTarotAvailability('yesNo').allowed) ? 1.02 : 1 }} 
            whileTap={{ scale: (getTarotAvailability('yesNo').allowed) ? 0.98 : 1 }}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => onTarotClick('yesNo', onYesNo)}
              className={`w-full h-20 text-white border-2 rounded-3xl shadow-xl transition-all duration-300 backdrop-blur-sm ${
                getTarotAvailability('yesNo').allowed
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-emerald-400/30 hover:border-emerald-400/50 hover:shadow-2xl'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-6 w-full pl-2">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  getTarotAvailability('yesNo').allowed
                    ? 'bg-emerald-600/20 border-emerald-400/30'
                    : 'bg-slate-600/20 border-slate-500/30'
                }`}>
                  {getTarotAvailability('yesNo').allowed ? (
                    <HelpCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className={`text-lg font-semibold ${
                    getTarotAvailability('yesNo').allowed ? 'text-white' : 'text-slate-400'
                  }`}>Да/Нет</div>
                  <div className={`text-sm ${
                    getTarotAvailability('yesNo').allowed ? 'text-gray-300' : 'text-slate-500'
                  }`}>Быстрый ответ</div>
                  {!subscriptionInfo?.hasSubscription && (
                    <div className="text-xs text-emerald-400 mt-1">
                      {getStatusText('yesNo')}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          </motion.div>

          {/* Three Cards Button */}
          <motion.div 
            whileHover={{ scale: (getTarotAvailability('threeCards').allowed) ? 1.02 : 1 }} 
            whileTap={{ scale: (getTarotAvailability('threeCards').allowed) ? 0.98 : 1 }}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => onTarotClick('threeCards', onThreeCards)}
              className={`w-full h-20 text-white border-2 rounded-3xl shadow-xl transition-all duration-300 backdrop-blur-sm ${
                getTarotAvailability('threeCards').allowed
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-purple-400/30 hover:border-purple-400/50 hover:shadow-2xl'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-6 w-full pl-2">
                <div className={`p-3 rounded-2xl border flex-shrink-0 ${
                  getTarotAvailability('threeCards').allowed
                    ? 'bg-purple-600/20 border-purple-400/30'
                    : 'bg-slate-600/20 border-slate-500/30'
                }`}>
                  {getTarotAvailability('threeCards').allowed ? (
                    <Calendar className="w-6 h-6 text-purple-400" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className={`text-lg font-semibold ${
                    getTarotAvailability('threeCards').allowed ? 'text-white' : 'text-slate-400'
                  }`}>Три карты</div>
                  <div className={`text-sm ${
                    getTarotAvailability('threeCards').allowed ? 'text-gray-300' : 'text-slate-500'
                  }`}>Прошлое–Настоящее–Будущее</div>
                  {!subscriptionInfo?.hasSubscription && (
                    <div className="text-xs text-purple-400 mt-1">
                      {getStatusText('threeCards')}
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
      <BlockedTarotModal
        isOpen={blockedModalOpen}
        onClose={closeBlockedModal}
        onSubscribe={() => {
          closeBlockedModal();
          handleOpenSubscriptionModal();
        }}
        tarotType={blockedType}
        nextAvailableAt={blockedNextAvailableAt}
      />
    </div>
  );
};

export default MainScreen;