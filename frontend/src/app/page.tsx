'use client';

import React, { useState, useEffect } from 'react';
import { MainScreen } from '@/screens/HomeScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { OneCardScreen } from '@/screens/OneCardScreen';
import { ThreeCardsScreen } from '@/screens/ThreeCardsScreen';
import { YesNoScreen } from '@/screens/YesNoScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { initPerformanceMonitoring } from '@/utils/performance';
import { bootstrapSubscriptionStatus, getSubscriptionSnapshot, refreshSubscriptionStatus } from '@/state/subscriptionStore';

// Стартуем запрос статуса подписки максимально рано (до рендера главного экрана).
// Shared Promise гарантирует отсутствие дублей.
bootstrapSubscriptionStatus().catch(() => {});

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<'main' | 'oneCard' | 'threeCards' | 'yesNo'>('main');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Инициализируем Telegram WebApp
    if (typeof window !== 'undefined') {
      try {
        // Динамический импорт для избежания ошибок SSR
                import('@twa-dev/sdk').then((TWA) => {
                  const WebApp = (TWA as any).WebApp || (TWA as any).default?.WebApp;
                  if (WebApp) {
                    WebApp.ready();
                    WebApp.expand();
                  }

                  // ВАЖНО: повторно триггерим bootstrap сразу после ready(),
                  // чтобы запрос статуса подписки стартовал как только Telegram initData/токен доступны.
                  // Shared Promise гарантирует отсутствие дублей.
                  bootstrapSubscriptionStatus().catch(() => {});
                }).catch(() => {
          // Игнорируем ошибки если SDK недоступен
          console.log('Telegram WebApp SDK not available');
        });
      } catch (error) {
        console.log('Telegram WebApp SDK not available:', error);
      }
    }

    // Отключаем мониторинг производительности - он вызывает проблемы
    // initPerformanceMonitoring();
  }, []);

  const handleStart = () => {
    setShowWelcome(false);
  };

  const handleTabChange = (tab: 'home' | 'history') => {
    // Если пользователь пытается перейти на историю, проверяем подписку
    if (tab === 'history') {
      // Проверяем подписку через API (не блокируем переключение)
      checkSubscriptionForHistory();
    } else {
      setActiveTab(tab);
    }
  };

  const checkSubscriptionForHistory = async () => {
    try {
      // Источник истины: глобальный стор (один запрос + shared promise)
      await bootstrapSubscriptionStatus();
      const snap = getSubscriptionSnapshot();
      if (snap.subscriptionInfo?.hasSubscription) {
        setActiveTab('history');
      } else {
        showSubscriptionModal();
      }
    } catch (error) {
      // При любой ошибке показываем модальное окно о подписке
      showSubscriptionModal();
    }
  };

  const showSubscriptionModal = () => {
    // Убеждаемся, что мы остаемся на главной странице
    setActiveTab('home');
    
    // Предотвращаем показ модального окна, если оно уже открыто
    if (isModalOpen) {
      return;
    }
    
    setIsModalOpen(true);
    
    // У пользователя нет подписки, показываем модальное окно
    // Создаем временное состояние для модального окна
    const modal = document.createElement('div');
    modal.id = 'subscription-modal-history';
    
    const closeModal = (e?: Event) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Удаляем модальное окно из DOM
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      
      // Очищаем функцию из window
      delete (window as any).closeModal;
      
      // Сбрасываем флаг модального окна
      setIsModalOpen(false);
      
      // Остаемся на главной странице (не переключаемся на history)
      setActiveTab('home');
      
      // Предотвращаем дальнейшие события
      return false;
    };
    
    // Привязываем функцию закрытия к window для доступа из onclick
    (window as any).closeModal = closeModal;
        
        modal.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;" id="modal-backdrop">
            <div style="background: #1e293b; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; border: 1px solid #475569; position: relative;" id="modal-content">
              <h3 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 12px;">Требуется подписка</h3>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.</p>
              <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="modal-close-button" style="padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#64748b'" onmouseout="this.style.background='#475569'">Закрыть</button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
        
        // Добавляем обработчики событий после добавления в DOM
        const closeButton = modal.querySelector('#modal-close-button');
        const backdrop = modal.querySelector('#modal-backdrop');
        
        if (closeButton) {
          closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal(e);
          });
        }
        
        // Закрытие при клике на фон
        if (backdrop) {
          backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
              e.preventDefault();
              e.stopPropagation();
              closeModal(e);
            }
          });
        }
        
        // Предотвращаем закрытие через Escape, чтобы не было конфликтов
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && document.body.contains(modal)) {
            e.preventDefault();
            e.stopPropagation();
            closeModal(e);
            document.removeEventListener('keydown', handleEscape);
          }
        };
        document.addEventListener('keydown', handleEscape);
  };

  const renderScreen = () => {
    if (showWelcome) {
      return <WelcomeScreen onStart={handleStart} />;
    }

    switch (currentScreen) {
      case 'oneCard':
        return <OneCardScreen onBack={() => {
          setCurrentScreen('main');
          // Обновляем статус подписки после использования Daily Advice
          refreshSubscriptionStatus();
        }} />;
      case 'threeCards':
        return <ThreeCardsScreen onBack={() => {
          setCurrentScreen('main');
          // Обновляем статус подписки после возврата с экрана Three Cards
          refreshSubscriptionStatus();
        }} />;
      case 'yesNo':
        return <YesNoScreen onBack={() => {
          setCurrentScreen('main');
          // Обновляем статус подписки после возврата с экрана Yes/No
          refreshSubscriptionStatus();
        }} />;
      case 'main':
      default:
        switch (activeTab) {
          case 'home':
            return (
              <MainScreen 
                activeTab={activeTab} 
                onTabChange={handleTabChange}
                onOneCard={() => setCurrentScreen('oneCard')}
                onYesNo={() => setCurrentScreen('yesNo')}
                onThreeCards={() => setCurrentScreen('threeCards')}
              />
            );
          case 'history':
            return (
              <HistoryScreen 
                onBack={() => setActiveTab('home')}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            );
          default:
            return (
              <MainScreen 
                activeTab={activeTab} 
                onTabChange={handleTabChange}
                onOneCard={() => setCurrentScreen('oneCard')}
                onYesNo={() => setCurrentScreen('yesNo')}
                onThreeCards={() => setCurrentScreen('threeCards')}
              />
            );
        }
    }
  };

  return (
    <div className="min-h-screen">
      {renderScreen()}
    </div>
  );
}
