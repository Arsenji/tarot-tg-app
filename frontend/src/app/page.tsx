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
            
            const authResponse = await fetch('/api/auth/telegram', {
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
      
      const response = await fetch(getApiEndpoint('/tarot/subscription-status'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      const data = await response.json();
      
      if (data.subscriptionInfo?.hasSubscription) {
        // У пользователя есть подписка, переключаемся на историю
        setActiveTab('history');
      } else {
        // У пользователя нет подписки, показываем модальное окно
        // Создаем временное состояние для модального окна
        const modal = document.createElement('div');
        const closeModal = () => {
          modal.remove();
          // Остаемся на главной странице (не переключаемся на history)
          setActiveTab('home');
        };
        
        modal.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: #1e293b; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; border: 1px solid #475569; position: relative;">
              <button onclick="window.closeModal()" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #9ca3af; cursor: pointer; padding: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h3 style="color: white; font-size: 18px; font-weight: 600; margin-bottom: 12px; padding-right: 32px;">Требуется подписка</h3>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений.</p>
              <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="window.closeModal()" style="padding: 8px 16px; background: #475569; color: white; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#64748b'" onmouseout="this.style.background='#475569'">Закрыть</button>
              </div>
            </div>
          </div>
        `;
        
        // Привязываем функцию закрытия к window для доступа из onclick
        (window as any).closeModal = closeModal;
        
        // Закрытие при клике на фон
        modal.querySelector('div')?.addEventListener('click', (e) => {
          if (e.target === e.currentTarget) {
            closeModal();
          }
        });
        
        document.body.appendChild(modal);
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
