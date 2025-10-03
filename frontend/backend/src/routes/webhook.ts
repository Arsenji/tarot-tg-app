import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { YooKassaService } from '../services/yookassa';
import logger from '../utils/logger';

const router = Router();

// Инициализация Юкассы
const yooKassa = new YooKassaService(
  process.env.YOOKASSA_SHOP_ID || '',
  process.env.YOOKASSA_SECRET_KEY || ''
);

// Webhook для обработки уведомлений от Юкассы
router.post('/yookassa/webhook', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    
    logger.info('YooKassa webhook received', { webhookData });

    const success = await yooKassa.processWebhook(webhookData);
    
    if (success) {
      const { object } = webhookData;
      const { metadata } = object;
      const { userId, planType } = metadata;

      // Обновляем подписку пользователя
      const user = await User.findOne({ telegramId: parseInt(userId) });
      if (user) {
        let duration = 30; // по умолчанию
        switch (planType) {
          case 'weekly':
            duration = 7;
            break;
          case 'monthly':
            duration = 30;
            break;
          case 'quarterly':
            duration = 90;
            break;
          case 'yearly':
            duration = 365;
            break;
        }
        
        const plan = { duration };
        const now = new Date();
        let expiryDate: Date;
        
        if (user.subscriptionStatus === 1 && user.subscriptionExpiry && user.subscriptionExpiry > now) {
          // Если подписка активна - продлеваем (суммируем сроки)
          expiryDate = new Date(user.subscriptionExpiry.getTime() + (plan.duration * 24 * 60 * 60 * 1000));
        } else {
          // Если подписки нет или она истекла - создаем новую
          expiryDate = new Date(now.getTime() + (plan.duration * 24 * 60 * 60 * 1000));
          user.subscriptionActivatedAt = now;
        }

        user.subscriptionStatus = 1;
        user.subscriptionExpiry = expiryDate;
        await user.save();

        logger.info('Subscription updated', {
          userId,
          planType,
          expiryDate: expiryDate.toISOString()
        });

        // Отправляем уведомление пользователю в Telegram
        // Здесь можно добавить отправку сообщения через бота
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('YooKassa webhook error', { error });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Проверка статуса платежа
router.get('/payment/status/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await yooKassa.getPaymentStatus(paymentId);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        paid: payment.paid,
        amount: payment.amount,
        metadata: payment.metadata
      }
    });
  } catch (error) {
    logger.error('Payment status check error', { error });
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

export default router;
