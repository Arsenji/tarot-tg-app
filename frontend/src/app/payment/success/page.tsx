'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getApiEndpoint } from '@/utils/config';
import { getValidAuthToken } from '@/utils/auth';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Проверяем статус платежа...');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Проверяем, не была ли отмена платежа
        const isCancelled = searchParams?.get('cancel') === 'true' || 
                           searchParams?.get('cancelled') === 'true' ||
                           searchParams?.get('status') === 'cancelled';
        
        if (isCancelled) {
          console.log('❌ Payment was cancelled');
          setStatus('error');
          setMessage('Платеж был отменен. Вы будете перенаправлены обратно в Telegram бота.');
          
          // Перенаправляем обратно в Telegram бота через 3 секунды
          setTimeout(() => {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
              (window as any).Telegram.WebApp.close();
            } else {
              router.push('/');
            }
          }, 3000);
          return;
        }
        
        // Получаем ID платежа из URL параметров
        // YooKassa может возвращать параметры в разных форматах
        const paymentId = searchParams?.get('paymentId') || 
                         searchParams?.get('payment_id') ||
                         searchParams?.get('orderId') ||
                         searchParams?.get('order_id');
        
        const urlParams = {
          paymentId: searchParams?.get('paymentId'),
          payment_id: searchParams?.get('payment_id'),
          orderId: searchParams?.get('orderId'),
          order_id: searchParams?.get('order_id'),
          cancel: searchParams?.get('cancel'),
          cancelled: searchParams?.get('cancelled'),
          status: searchParams?.get('status'),
          all: Array.from(searchParams?.entries() || [])
        };
        
        console.log('🔍 URL search params:', urlParams);
        
        // Показываем URL параметры на странице для диагностики
        setDebugInfo(`URL параметры: ${JSON.stringify(urlParams, null, 2)}`);
        
        if (!paymentId) {
          console.error('Payment ID not found in URL');
          setStatus('error');
          setMessage('Не удалось определить ID платежа. Проверьте статус подписки в профиле.');
          return;
        }

        console.log('✅ Payment ID:', paymentId);
        console.log('🔍 Checking payment status...');

        // Получаем токен аутентификации
        const token = await getValidAuthToken();
        if (!token) {
          console.error('Auth token not available');
          setStatus('error');
          setMessage('Ошибка авторизации. Попробуйте вернуться в приложение.');
          return;
        }

        // Проверяем статус платежа через backend
        const endpoint = getApiEndpoint(`/payment/status/${paymentId}`);
        console.log('🌐 Requesting payment status from:', endpoint);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to check payment status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Payment status data:', data);

        if (data.success && data.payment?.paid) {
          setStatus('success');
          setMessage('Оплата успешно завершена! Ваша подписка активирована.');
          
          // Через 3 секунды возвращаем пользователя в приложение
          setTimeout(() => {
            if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
              (window as any).Telegram.WebApp.close();
            } else {
              router.push('/');
            }
          }, 3000);
        } else if (data.payment?.status === 'pending') {
          setStatus('checking');
          setMessage('Платёж обрабатывается. Пожалуйста, подождите...');
          
          // Повторяем проверку через 2 секунды
          setTimeout(checkPaymentStatus, 2000);
        } else {
          setStatus('error');
          setMessage('Платёж не завершён. Если деньги списались, обратитесь в поддержку.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setMessage('Произошла ошибка при проверке статуса платежа. Проверьте статус подписки в профиле.');
      }
    };

    checkPaymentStatus();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full border border-slate-600/30 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center space-y-6">
          {/* Icon */}
          {status === 'checking' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-16 h-16 text-amber-400" />
            </motion.div>
          )}
          
          {status === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-400" />
            </motion.div>
          )}
          
          {status === 'error' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <XCircle className="w-16 h-16 text-red-400" />
            </motion.div>
          )}

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center">
            {status === 'checking' && 'Проверяем платёж...'}
            {status === 'success' && 'Успешно!'}
            {status === 'error' && 'Что-то пошло не так'}
          </h1>

          {/* Message */}
          <p className="text-gray-300 text-center">
            {message}
          </p>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mt-4 p-4 bg-black/20 rounded-lg">
              <h3 className="text-white text-sm font-semibold mb-2">🔍 Диагностика:</h3>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                {debugInfo}
              </pre>
            </div>
          )}

          {/* Button */}
          {status !== 'checking' && (
            <Button
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
                  (window as any).Telegram.WebApp.close();
                } else {
                  router.push('/');
                }
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-xl font-medium transition-all duration-300"
            >
              Вернуться в приложение
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full border border-slate-600/30 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-16 h-16 text-amber-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white text-center">
            Загрузка...
          </h1>
          <p className="text-gray-300 text-center">
            Подготавливаем страницу оплаты
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

