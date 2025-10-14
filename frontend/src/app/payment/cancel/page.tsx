'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Загрузка...</p>
      </div>
    </div>
  );
}

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Проверяем статус отмены...');

  useEffect(() => {
    const handleCancel = async () => {
      try {
        // Получаем параметры из URL
        const paymentId = searchParams.get('paymentId') || 
                         searchParams.get('payment_id') || 
                         searchParams.get('id');
        
        if (paymentId) {
          console.log('Payment cancelled with ID:', paymentId);
        }

        // Показываем сообщение об отмене
        setStatus('success');
        setMessage('Платеж был отменен. Вы будете перенаправлены обратно в Telegram бота.');
        
        // Перенаправляем обратно в Telegram бота через 3 секунды
        setTimeout(() => {
          // Пытаемся закрыть WebApp и вернуться в бота
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.close();
          } else {
            // Если WebApp API недоступен, показываем инструкции
            setMessage('Платеж отменен. Пожалуйста, вернитесь в Telegram бота вручную.');
          }
        }, 3000);
        
      } catch (error) {
        console.error('Error handling payment cancel:', error);
        setStatus('error');
        setMessage('Произошла ошибка при обработке отмены платежа.');
      }
    };

    handleCancel();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          )}
          {status === 'success' && (
            <div className="text-6xl mb-4">❌</div>
          )}
          {status === 'error' && (
            <div className="text-6xl mb-4">⚠️</div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          {status === 'loading' && 'Проверка отмены...'}
          {status === 'success' && 'Платеж отменен'}
          {status === 'error' && 'Ошибка'}
        </h1>
        
        <p className="text-gray-200 mb-6 leading-relaxed">
          {message}
        </p>
        
        {status === 'success' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-300">
              Автоматическое перенаправление через 3 секунды...
            </p>
            <button
              onClick={() => {
                if (window.Telegram?.WebApp) {
                  window.Telegram.WebApp.close();
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Вернуться в бота
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => {
              if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
              }
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Вернуться в бота
          </button>
        )}
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCancelContent />
    </Suspense>
  );
}
