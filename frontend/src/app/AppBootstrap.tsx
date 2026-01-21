'use client';

import React, { useEffect } from 'react';
import { bootstrapSubscriptionStatus, useSubscriptionStatus } from '@/state/subscriptionStore';

type Props = {
  children: React.ReactNode;
};

let started = false;

/**
 * Единственная точка инициализации статуса подписки.
 *
 * Требования:
 * - стартует автоматически при запуске приложения
 * - не зависит от пользовательских действий
 * - выполняется ровно 1 раз (shared promise в сторе)
 * - не рендерит UI приложения до loaded=true (pessimistic lock)
 */
export function AppBootstrap({ children }: Props) {
  const { loaded, loading, error } = useSubscriptionStatus();

  useEffect(() => {
    // Единственный запуск bootstrap: никаких вызовов из onClick/handlers/screens.
    if (started) return;
    started = true;
    console.log('🚀 AppBootstrap: starting subscription bootstrap');
    bootstrapSubscriptionStatus().catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded) {
      console.log('✅ AppBootstrap: subscription status loaded');
    }
  }, [loaded]);

  if (!loaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-lg font-semibold">Проверяем доступ…</div>
          <div className="text-sm text-gray-300 mt-2">Загрузка статуса подписки</div>
        </div>
      </div>
    );
  }

  // Даже при ошибках/NO_TOKEN мы не должны показывать главный экран в unlocked состоянии.
  // Поэтому `loaded` остаётся единственным критерием "можно рендерить приложение".
  if (error && !loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-lg font-semibold">Проверяем доступ…</div>
          <div className="text-sm text-gray-300 mt-2">Подождите секунду</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

