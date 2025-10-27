import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkSubscriptionStatus, activateSubscription } from '../utils/subscription';
import { YooKassaService, SUBSCRIPTION_PLANS } from '../services/yookassa';
import logger from '../utils/logger';

const router = express.Router();

// Middleware для всех маршрутов
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

    const returnUrl = `${process.env.FRONTEND_URL}/payment/success`;
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

    res.json({
      success: true,
      payment: {
        id: payment.id,
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

// Webhook для обработки платежей YooKassa
router.post('/webhook', async (req, res) => {
  try {
    const { event, object } = req.body;
    
    if (event === 'payment.succeeded') {
      const payment = object;
      
      if (payment.metadata && payment.metadata.userId && payment.metadata.plan) {
        const userId = parseInt(payment.metadata.userId);
        const plan = payment.metadata.plan as keyof typeof SUBSCRIPTION_PLANS;
        
        if (userId && SUBSCRIPTION_PLANS[plan]) {
          const durationDays = SUBSCRIPTION_PLANS[plan].duration;
          const success = await activateSubscription(userId, durationDays);
          
          if (success) {
            logger.info('Subscription activated via webhook', {
              userId,
              plan,
              paymentId: payment.id,
              amount: payment.amount.value
            });
          } else {
            logger.error('Failed to activate subscription via webhook', {
              userId,
              plan,
              paymentId: payment.id
            });
          }
        }
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
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
