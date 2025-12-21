'use client';

import React, { useState, useEffect } from 'react';
import { MainScreen } from '@/screens/HomeScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { OneCardScreen } from '@/screens/OneCardScreen';
import { ThreeCardsScreen } from '@/screens/ThreeCardsScreen';
import { YesNoScreen } from '@/screens/YesNoScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { initPerformanceMonitoring } from '@/utils/performance';
import { getApiEndpoint } from '@/utils/config';

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
      // Проверяем подписку через API
      checkSubscriptionForHistory();
    } else {
      setActiveTab(tab);
    }
  };

  const checkSubscriptionForHistory = async () => {
    try {
      // Получаем токен динамически через Telegram WebApp
      const getAuthToken = async () => {
        try {
          // Сначала проверяем, есть ли токен в localStorage
          let token = localStorage.getItem('authToken');
          
          if (!token && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
            // Если токена нет, получаем его через Telegram WebApp
            const initData = (window as any).Telegram.WebApp.initData;
            
            const authResponse = await fetch(getApiEndpoint('/auth/telegram'), {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ initData })
            });
            
            if (authResponse.ok) {
              const authData = await authResponse.json();
              token = authData.token;
              if (token) {
                localStorage.setItem('authToken', token);
              }
            }
          }
          
          return token;
        } catch (error) {
          console.error('Error getting auth token:', error);
          return null;
        }
      };

      const token = await getAuthToken();
      
      // Если токен не получен, не показываем поп-ап, просто остаемся на главной
      if (!token) {
        console.warn('No auth token available, staying on home page');
        return;
      }
      
      const response = await fetch(getApiEndpoint('/tarot/subscription-status'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Failed to check subscription status:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data.subscriptionInfo?.hasSubscription) {
        // У пользователя есть подписка, переключаемся на историю
        setActiveTab('history');
      } else {
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
              <button id="modal-close-btn" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #9ca3af; cursor: pointer; padding: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='rgba(156,163,175,0.2)'" onmouseout="this.style.background='transparent'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h3 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 12px; padding-right: 32px;">Требуется подписка</h3>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.</p>
              <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="modal-close-button" style="padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#64748b'" onmouseout="this.style.background='#475569'">Закрыть</button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(modal);
        
        // Добавляем обработчики событий после добавления в DOM
        const closeBtn = modal.querySelector('#modal-close-btn');
        const closeButton = modal.querySelector('#modal-close-button');
        const backdrop = modal.querySelector('#modal-backdrop');
        
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal(e);
          });
        }
        
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
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // В случае ошибки все равно переключаемся на историю
      setActiveTab('history');
    }
  };

  const renderScreen = () => {
    if (showWelcome) {
      return <WelcomeScreen onStart={handleStart} />;
    }

    switch (currentScreen) {
      case 'oneCard':
        return <OneCardScreen onBack={() => setCurrentScreen('main')} />;
      case 'threeCards':
        return <ThreeCardsScreen onBack={() => setCurrentScreen('main')} />;
      case 'yesNo':
        return <YesNoScreen onBack={() => setCurrentScreen('main')} />;
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
