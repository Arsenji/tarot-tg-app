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
  const [refreshSubscription, setRefreshSubscription] = useState(0);

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
      // Проверяем подписку через API (не блокируем переключение)
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
            
            try {
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
                // Токен может быть в authData.token или authData.data.token
                token = authData.data?.token || authData.token;
                if (token) {
                  localStorage.setItem('authToken', token);
                } else {
                  console.error('Token not found in auth response:', authData);
                }
              }
            } catch (error) {
              // Тихая обработка ошибки получения токена
              return null;
            }
          }
          
          return token;
        } catch (error) {
          // Тихая обработка ошибки
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
            }
          }
        } catch (error) {
          // Тихая обработка ошибки получения токена
        }
      }
      
      // Если токен все еще не получен, показываем модальное окно о подписке
      if (!token) {
        // Не делаем запрос без токена, но показываем модальное окно
        showSubscriptionModal();
        return;
      }
      
      // Используем AbortController для возможности отмены запроса
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
      
      let response: Response | null = null;
      try {
        response = await fetch(getApiEndpoint('/tarot/subscription-status'), {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Подавляем ошибки сети - не выводим в консоль
        if (error.name !== 'AbortError') {
          // Тихая обработка ошибки
        }
        // При ошибке сети показываем модальное окно о подписке
        showSubscriptionModal();
        return;
      }
      
      if (!response || !response.ok) {
        if (response && response.status === 401) {
          // Тихо обрабатываем 401 - не логируем в консоль, так как это ожидаемо при первом запросе
          // Пытаемся получить новый токен
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
                    showSubscriptionModal();
                    return;
                  }
                  
                  if (retryResponse && retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData.subscriptionInfo?.hasSubscription) {
                      setActiveTab('history');
                      return;
                    } else {
                      // После повторной попытки подписки все еще нет - показываем модальное окно
                      showSubscriptionModal();
                      return;
                    }
                  } else {
                    // Ошибка при повторной попытке - показываем модальное окно
                    showSubscriptionModal();
                    return;
                  }
                } else {
                  console.error('❌ Token not found in auth response after retry:', authData);
                  // Не удалось получить новый токен - показываем модальное окно
                  showSubscriptionModal();
                  return;
                }
              } else {
                // Не удалось получить новый токен - показываем модальное окно
                showSubscriptionModal();
                return;
              }
            } catch (err) {
              // Тихая обработка ошибки, но показываем модальное окно
              showSubscriptionModal();
              return;
            }
          } else {
            // Нет initData для получения токена - показываем модальное окно
            showSubscriptionModal();
            return;
          }
        } else {
          // Другая ошибка (не 401) - показываем модальное окно
          showSubscriptionModal();
          return;
        }
      }
      
      const data = await response.json();
      
      if (data.subscriptionInfo?.hasSubscription) {
        // У пользователя есть подписка, переключаемся на историю
        setActiveTab('history');
      } else {
        // У пользователя нет подписки, показываем модальное окно
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
          setRefreshSubscription(prev => prev + 1);
        }} />;
      case 'threeCards':
        return <ThreeCardsScreen onBack={() => {
          setCurrentScreen('main');
          // Обновляем статус подписки после возврата с экрана Three Cards
          setRefreshSubscription(prev => prev + 1);
        }} />;
      case 'yesNo':
        return <YesNoScreen onBack={() => {
          setCurrentScreen('main');
          // Обновляем статус подписки после возврата с экрана Yes/No
          setRefreshSubscription(prev => prev + 1);
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
                refreshSubscription={refreshSubscription}
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
                refreshSubscription={refreshSubscription}
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
