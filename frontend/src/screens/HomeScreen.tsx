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
  refreshSubscription?: number; // Флаг для принудительного обновления статуса
}

export const MainScreen = ({ activeTab, onTabChange, onOneCard, onYesNo, onThreeCards, refreshSubscription }: HomeScreenProps) => {
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  // Устанавливаем дефолтные значения сразу, чтобы кнопки всегда отображались корректно
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>({
    hasSubscription: false,
    // ВАЖНО: по умолчанию блокируем всё до получения статуса с backend (устраняем race condition)
    canUseDailyAdvice: false,
    canUseYesNo: false,
    canUseThreeCards: false,
    remainingDailyAdvice: 0,
    remainingYesNo: 0,
    remainingThreeCards: 0,
    // cooldowns появится из backend (/tarot/subscription-status) — оставляем опционально
  });
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);

  useEffect(() => {
    // Пробуем быстро показать прошлый статус (для UX), но клики всё равно блокируем
    try {
      const cached = localStorage.getItem('subscriptionStatusCache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.subscriptionInfo) {
          setSubscriptionInfo(parsed.subscriptionInfo);
        }
      }
    } catch {
      // ignore cache errors
    }

    fetchSubscriptionStatus();
  }, []);

  // Обновляем статус подписки при возврате на главный экран или при изменении флага обновления
  useEffect(() => {
    if (activeTab === 'home') {
      fetchSubscriptionStatus();
    }
  }, [activeTab, refreshSubscription]);

  const fetchSubscriptionStatus = async () => {
    setIsSubscriptionLoading(true);
    try {
      // Используем endpoint для получения статуса подписки
      const getAuthToken = async () => {
        try {
          let token = localStorage.getItem('authToken');
          
          if (!token && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
            const initData = (window as any).Telegram.WebApp.initData;
            
            const authResponse = await fetch(getApiEndpoint('/auth/telegram'), {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData })
            });
            
            if (authResponse.ok) {
              const authData = await authResponse.json();
              // Токен может быть в authData.token или authData.data.token
              token = authData.data?.token || authData.token;
              if (token) {
                localStorage.setItem('authToken', token);
              } else {
                console.error('Token not found in auth response:', authData);
              }
            }
          }
          
          return token;
        } catch (error) {
          console.error('Error getting auth token:', error);
          return null;
        }
      };

      let token = await getAuthToken();
      
      // Если токена нет, пытаемся получить его через Telegram WebApp
      if (!token && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        const initData = (window as any).Telegram.WebApp.initData;
        try {
          const authResponse = await fetch(getApiEndpoint('/auth/telegram'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
          });
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            token = authData.data?.token || authData.token;
            if (token) {
              localStorage.setItem('authToken', token);
              console.log('✅ Token obtained before subscription check');
            }
          }
        } catch (error) {
          // Тихая обработка ошибки получения токена
        }
      }
      
      // Если токена все еще нет, не делаем запрос, чтобы избежать ошибок в консоли
      if (!token) {
        console.warn('⚠️ No token available, skipping subscription status check');
        setSubscriptionInfo({
          hasSubscription: false,
          canUseDailyAdvice: false,
          canUseYesNo: false,
          canUseThreeCards: false,
          remainingDailyAdvice: 0,
          remainingYesNo: 0,
          remainingThreeCards: 0,
        });
        setIsSubscriptionLoading(false);
        return;
      }
      
      const headers: any = {
        'Authorization': `Bearer ${token}`,
      };

      // Используем AbortController для возможности отмены запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
      
      let response: Response | null = null;
      try {
        response = await fetch(getApiEndpoint('/tarot/subscription-status'), {
          method: 'GET',
          credentials: 'include',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Подавляем ошибки сети - не выводим в консоль
        if (error.name !== 'AbortError') {
          // Тихая обработка ошибки
        }
        setSubscriptionInfo({
          hasSubscription: false,
          canUseDailyAdvice: false,
          canUseYesNo: false,
          canUseThreeCards: false,
          remainingDailyAdvice: 0,
          remainingYesNo: 0,
          remainingThreeCards: 0,
        });
        setIsSubscriptionLoading(false);
        return;
      }
      
      if (!response || !response.ok) {
        if (response && response.status === 401) {
          // Токен невалиден или отсутствует, пытаемся получить новый
          const initData = (window as any).Telegram?.WebApp?.initData;
          if (initData) {
            try {
              const authController = new AbortController();
              const authTimeoutId = setTimeout(() => authController.abort(), 10000);
              
              let authResponse: Response | null = null;
              try {
                authResponse = await fetch(getApiEndpoint('/auth/telegram'), {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ initData }),
                  signal: authController.signal,
                });
                clearTimeout(authTimeoutId);
              } catch (authError: any) {
                clearTimeout(authTimeoutId);
                if (authError.name !== 'AbortError') {
                  // Тихая обработка ошибки
                }
                setSubscriptionInfo({
                  hasSubscription: false,
                  canUseDailyAdvice: false,
                  canUseYesNo: false,
                  canUseThreeCards: false,
                  remainingDailyAdvice: 0,
                  remainingYesNo: 0,
                  remainingThreeCards: 0,
                });
                setIsSubscriptionLoading(false);
                return;
              }
              
              if (authResponse && authResponse.ok) {
                const authData = await authResponse.json();
                // Токен может быть в authData.token или authData.data.token
                const newToken = authData.data?.token || authData.token;
                if (newToken) {
                  localStorage.setItem('authToken', newToken);
                  console.log('✅ Token saved after retry:', newToken.substring(0, 20) + '...');
                  
                  // Повторяем запрос с новым токеном
                  const retryController = new AbortController();
                  const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
                  
                  let retryResponse: Response | null = null;
                  try {
                    retryResponse = await fetch(getApiEndpoint('/tarot/subscription-status'), {
                      method: 'GET',
                      credentials: 'include',
                      headers: {
                        'Authorization': `Bearer ${newToken}`,
                      },
                      signal: retryController.signal,
                    });
                    clearTimeout(retryTimeoutId);
                  } catch (retryError: any) {
                    clearTimeout(retryTimeoutId);
                    if (retryError.name !== 'AbortError') {
                      // Тихая обработка ошибки
                    }
                    setSubscriptionInfo({
                      hasSubscription: false,
                      canUseDailyAdvice: false,
                      canUseYesNo: false,
                      canUseThreeCards: false,
                      remainingDailyAdvice: 0,
                      remainingYesNo: 0,
                      remainingThreeCards: 0,
                    });
                    setIsLoading(false);
                    return;
                  }
                  
                  if (retryResponse && retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData.subscriptionInfo) {
                      setSubscriptionInfo(retryData.subscriptionInfo);
                      setIsSubscriptionLoading(false);
                      return;
                    }
                  } else {
                    // Ошибка при повторной попытке
                    setSubscriptionInfo({
                      hasSubscription: false,
                      canUseDailyAdvice: false,
                      canUseYesNo: false,
                      canUseThreeCards: false,
                      remainingDailyAdvice: 0,
                      remainingYesNo: 0,
                      remainingThreeCards: 0,
                    });
                    setIsSubscriptionLoading(false);
                    return;
                  }
                } else {
                  console.error('❌ Token not found in auth response after retry:', authData);
                  setSubscriptionInfo({
                    hasSubscription: false,
                    canUseDailyAdvice: false,
                    canUseYesNo: false,
                    canUseThreeCards: false,
                    remainingDailyAdvice: 0,
                    remainingYesNo: 0,
                    remainingThreeCards: 0,
                  });
                  setIsSubscriptionLoading(false);
                  return;
                }
              } else {
                // Не удалось получить новый токен
                setSubscriptionInfo({
                  hasSubscription: false,
                  canUseDailyAdvice: false,
                  canUseYesNo: false,
                  canUseThreeCards: false,
                  remainingDailyAdvice: 0,
                  remainingYesNo: 0,
                  remainingThreeCards: 0,
                });
                setIsSubscriptionLoading(false);
                return;
              }
            } catch (err) {
              // Тихая обработка ошибки авторизации
            }
          }
        }
        // При ошибке блокируем доступ (безопасный режим)
        setSubscriptionInfo({
          hasSubscription: false,
          canUseDailyAdvice: false,
          canUseYesNo: false,
          canUseThreeCards: false,
          remainingDailyAdvice: 0,
          remainingYesNo: 0,
          remainingThreeCards: 0,
        });
        setIsSubscriptionLoading(false);
        return;
      }
      
      if (!response) {
        // Если запрос не выполнился, блокируем доступ (безопасный режим)
        setSubscriptionInfo({
          hasSubscription: false,
          canUseDailyAdvice: false,
          canUseYesNo: false,
          canUseThreeCards: false,
          remainingDailyAdvice: 0,
          remainingYesNo: 0,
          remainingThreeCards: 0,
        });
        setIsSubscriptionLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Логируем для отладки
      console.log('📊 Subscription status response:', {
        success: data.success,
        subscriptionInfo: data.subscriptionInfo,
        fullResponse: data
      });
      
      if (data.subscriptionInfo) {
        console.log('✅ Setting subscription info:', data.subscriptionInfo);
        setSubscriptionInfo(data.subscriptionInfo);
        try {
          localStorage.setItem('subscriptionStatusCache', JSON.stringify({
            ts: Date.now(),
            subscriptionInfo: data.subscriptionInfo
          }));
        } catch {
          // ignore cache errors
        }
      } else {
        console.warn('⚠️ No subscriptionInfo in response:', data);
        // Если данных нет, блокируем доступ (безопасный режим)
        setSubscriptionInfo({
          hasSubscription: false,
          canUseDailyAdvice: false,
          canUseYesNo: false,
          canUseThreeCards: false,
          remainingDailyAdvice: 0,
          remainingYesNo: 0,
          remainingThreeCards: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

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