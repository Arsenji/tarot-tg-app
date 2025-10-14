'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function DebugPaymentPage() {
  const searchParams = useSearchParams();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Парсим URL параметры
    const urlParams: any = {};
    if (searchParams) {
      for (const [key, value] of searchParams.entries()) {
        urlParams[key] = value;
      }
    }

    const info = {
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'Server-side',
      urlParams,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side',
      telegramInfo: {
        isTelegram: typeof window !== 'undefined' && typeof (window as any).Telegram !== 'undefined',
        webApp: typeof window !== 'undefined' && typeof (window as any).Telegram?.WebApp !== 'undefined',
        initData: typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initData || 'Not available' : 'Server-side',
        version: typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.version || 'Not available' : 'Server-side',
        platform: typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.platform || 'Not available' : 'Server-side'
      }
    };

    setDebugInfo(info);
  }, [searchParams]);

  const closeWebApp = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.close();
    } else {
      alert('Telegram WebApp не найден. Закройте страницу вручную.');
    }
  };

  // Автоматически закрываем через 10 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.close();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-4xl w-full text-white">
        <h1 className="text-3xl font-bold text-center mb-8">🔍 Debug Payment Page</h1>
        
        {debugInfo ? (
          <div className="space-y-6">
            {/* Current URL */}
            <div className="bg-black/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">📋 Current URL:</h2>
              <pre className="text-sm bg-black/30 p-3 rounded break-all whitespace-pre-wrap">
                {debugInfo.currentUrl}
              </pre>
            </div>

            {/* URL Parameters */}
            <div className="bg-black/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">🔗 URL Parameters:</h2>
              <pre className="text-sm bg-black/30 p-3 rounded break-all whitespace-pre-wrap">
                {JSON.stringify(debugInfo.urlParams, null, 2)}
              </pre>
            </div>

            {/* User Agent */}
            <div className="bg-black/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">🌐 User Agent:</h2>
              <pre className="text-sm bg-black/30 p-3 rounded break-all whitespace-pre-wrap">
                {debugInfo.userAgent}
              </pre>
            </div>

            {/* Telegram WebApp Info */}
            <div className="bg-black/20 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">📱 Telegram WebApp Info:</h2>
              <pre className="text-sm bg-black/30 p-3 rounded break-all whitespace-pre-wrap">
                {JSON.stringify(debugInfo.telegramInfo, null, 2)}
              </pre>
            </div>

            {/* Close Button */}
            <button
              onClick={closeWebApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              🔙 Вернуться в бота
            </button>

            {/* Auto-close notice */}
            <p className="text-center text-gray-300 text-sm">
              Страница автоматически закроется через 10 секунд
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Загрузка debug информации...</p>
          </div>
        )}
      </div>
    </div>
  );
}
