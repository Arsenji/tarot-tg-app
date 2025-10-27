'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { FloatingCard } from '@/components/FloatingCard';
import { TarotLogo } from '@/components/TarotLogo';
import BottomNavigation from '@/components/BottomNavigation';
import { SparklesIcon, Calendar, HelpCircle, Crown, Lock } from 'lucide-react';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { apiService } from '@/services/api';
import { getApiEndpoint } from '@/utils/config';

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
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    setIsLoading(true);
    try {
      // Используем endpoint для получения статуса подписки
      const getAuthToken = async () => {
        try {
          let token = localStorage.getItem('authToken');
          
          if (!token && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
            const initData = (window as any).Telegram.WebApp.initData;
            
            const authResponse = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData })
            });
            
            if (authResponse.ok) {
              const authData = await authResponse.json();
              token = authData.token;
              localStorage.setItem('authToken', token);
            }
          }
          
          return token;
        } catch (error) {
          console.error('Error getting auth token:', error);
          return null;
        }
      };

      const token = await getAuthToken();
      
      const response = await fetch(getApiEndpoint('/tarot/subscription-status'), {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      const data = await response.json();
      
      if (data.subscriptionInfo) {
        setSubscriptionInfo(data.subscriptionInfo);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSubscriptionModal = () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleCloseSubscriptionModal = () => {
    setIsSubscriptionModalOpen(false);
  };

  const handleOneCardClick = () => {
    if (subscriptionInfo?.canUseDailyAdvice || subscriptionInfo?.hasSubscription) {
      onOneCard();
    } else {
      handleOpenSubscriptionModal();
    }
  };

  const handleYesNoClick = () => {
    if (subscriptionInfo?.canUseYesNo || subscriptionInfo?.hasSubscription) {
      onYesNo();
    } else {
      handleOpenSubscriptionModal();
    }
  };

  const handleThreeCardsClick = () => {
    if (subscriptionInfo?.canUseThreeCards || subscriptionInfo?.hasSubscription) {
      onThreeCards();
    } else {
      handleOpenSubscriptionModal();
    }
  };

  const getRemainingText = (count: number) => {
    if (count === -1) return 'Безлимитно';
    if (count === 0) return 'Использовано';
    return `Осталось: ${count}`;
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-between pt-20 pb-16">
      <SparklesBackground />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
        <TarotLogo />
        <h1 className="text-3xl font-bold mt-4 mb-2 text-center">Таро-бот</h1>
        <p className="text-gray-300 text-center mb-8">Ваш личный проводник в мир Таро</p>

        <SubscriptionStatus 
          hasSubscription={subscriptionInfo?.hasSubscription} 
          isExpired={subscriptionInfo?.isExpired}
          onOpenModal={handleOpenSubscriptionModal}
          isLoading={isLoading}
        />

        <div className="w-full space-y-4 mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              className="w-full h-auto py-4 px-6 bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-lg flex items-center justify-between text-lg font-semibold"
              onClick={handleOneCardClick}
              disabled={!subscriptionInfo?.canUseDailyAdvice && !subscriptionInfo?.hasSubscription && !isLoading}
            >
              <div className="flex items-center">
                <Calendar className="mr-3 h-6 w-6" />
                <span>Совет дня</span>
              </div>
              <div className="text-sm text-gray-200">
                {isLoading ? 'Загрузка...' : getRemainingText(subscriptionInfo?.remainingDailyAdvice)}
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button 
              className="w-full h-auto py-4 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-xl shadow-lg flex items-center justify-between text-lg font-semibold"
              onClick={handleYesNoClick}
              disabled={!subscriptionInfo?.canUseYesNo && !subscriptionInfo?.hasSubscription && !isLoading}
            >
              <div className="flex items-center">
                <SparklesIcon className="mr-3 h-6 w-6" />
                <span>Одна карта "Да/Нет"</span>
              </div>
              <div className="text-sm text-gray-200">
                {isLoading ? 'Загрузка...' : getRemainingText(subscriptionInfo?.remainingYesNo)}
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              className="w-full h-auto py-4 px-6 bg-green-700 hover:bg-green-800 text-white rounded-xl shadow-lg flex items-center justify-between text-lg font-semibold"
              onClick={handleThreeCardsClick}
              disabled={!subscriptionInfo?.canUseThreeCards && !subscriptionInfo?.hasSubscription && !isLoading}
            >
              <div className="flex items-center">
                <Crown className="mr-3 h-6 w-6" />
                <span>Расклад на 3 карты</span>
              </div>
              <div className="text-sm text-gray-200">
                {isLoading ? 'Загрузка...' : getRemainingText(subscriptionInfo?.remainingThreeCards)}
              </div>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              className="w-full h-auto py-4 px-6 bg-gray-700 hover:bg-gray-800 text-white rounded-xl shadow-lg flex items-center justify-between text-lg font-semibold"
              onClick={handleOpenSubscriptionModal}
            >
              <div className="flex items-center">
                <Lock className="mr-3 h-6 w-6" />
                <span>Купить подписку</span>
              </div>
              <div className="text-sm text-gray-200">
                {subscriptionInfo?.hasSubscription ? 'Активна' : 'Не активна'}
              </div>
            </Button>
          </motion.div>
        </div>
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
      <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={handleCloseSubscriptionModal} />
    </div>
  );
};

export default MainScreen;