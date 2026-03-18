import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { verifyYooKassaSignature } from '../middleware/verifyYooKassaSignature';
import { checkSubscriptionStatus, activateSubscription } from '../utils/subscription';
import { YooKassaService, SUBSCRIPTION_PLANS } from '../services/yookassa';
import { Payment } from '../models/Payment';
import logger from '../utils/logger';

const router = express.Router();

// Webhook YooKassa — БЕЗ JWT (server-to-server), только проверка подписи
// Идемпотентность: атомарный findOneAndUpdate по processed: false
router.post('/webhook', verifyYooKassaSignature, async (req, res) => {
  try {
    const { event, object: paymentData } = req.body;

    if (event !== 'payment.succeeded') {
      return res.status(200).json({ status: 'ok', message: 'Event ignored' });
    }

    const paymentId = paymentData?.id;
    if (!paymentId) {
      logger.warn('Webhook: missing payment id', { body: req.body });
      return res.status(200).json({ status: 'ok', message: 'Event ignored' });
    }

    // Атомарное обновление: только если processed: false (избегаем race condition)
    const payment = await Payment.findOneAndUpdate(
      { paymentId, processed: false },
      {
        $set: {
          status: 'succeeded',
          subscriptionActivated: true,
          processed: true,
        },
      },
      { new: true }
    );

    if (!payment) {
      logger.info('Webhook: payment already processed or not found (idempotent)', { paymentId });
      return res.status(200).json({ status: 'ok', message: 'Already processed' });
    }

    // Активируем подписку только при первом успешном обновлении
    if (paymentData.metadata?.userId && paymentData.metadata?.plan) {
      const userId = parseInt(paymentData.metadata.userId);
      const plan = paymentData.metadata.plan as keyof typeof SUBSCRIPTION_PLANS;

      if (userId && SUBSCRIPTION_PLANS[plan]) {
        const durationDays = SUBSCRIPTION_PLANS[plan].duration;
        const success = await activateSubscription(userId, durationDays);

        if (success) {
          logger.info('Subscription activated via webhook', {
            userId,
            plan,
            paymentId,
            amount: paymentData.amount?.value,
          });
        } else {
          logger.error('Failed to activate subscription via webhook', {
            userId,
            plan,
            paymentId,
          });
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook error', { error, body: req.body });
    return res.status(500).json({ status: 'error', message: 'Webhook processing failed' });
  }
});

// Middleware для остальных маршрутов (требуют JWT)
router.use(authenticateToken);

// Получить статус подписки
router.get('/status', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    res.json({
      success: true,
      subscription: subscriptionStatus
    });
  } catch (error) {
    logger.error('Subscription status error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Создать платеж для подписки
router.post('/create-payment', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    const { plan } = req.body;
    
    if (!plan || !SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription plan'
      });
    }

    const yooKassa = new YooKassaService(
      process.env.YOOKASSA_SHOP_ID || '',
      process.env.YOOKASSA_SECRET_KEY || ''
    );

    // ref в return_url — payment.id от YooKassa приходит только после создания,
    // поэтому используем ref для lookup после редиректа
    const returnRef = randomUUID();
    const returnUrl = `${process.env.FRONTEND_URL}/payment-result?paymentId=${returnRef}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/payment/cancel`;

    const payment = await yooKassa.createPayment(
      userId.toString(),
      plan as keyof typeof SUBSCRIPTION_PLANS,
      returnUrl,
      cancelUrl
    );

    if (!payment) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment'
      });
    }

    await Payment.findOneAndUpdate(
      { paymentId: payment.id },
      {
        paymentId: payment.id,
        userId: userId.toString(),
        status: 'pending',
        subscriptionActivated: false,
        processed: false,
        plan,
        returnRef,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      payment: {
        id: payment.id,
        paymentId: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
        amount: payment.amount.value,
        currency: payment.amount.currency,
        description: payment.description
      }
    });
  } catch (error) {
    logger.error('Create payment error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Получить доступные планы подписки
router.get('/plans', (req, res) => {
  try {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      currency: 'RUB'
    }));

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    logger.error('Get plans error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
