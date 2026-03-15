import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { Payment } from '../models/Payment';
import { YooKassaService } from '../services/yookassa';
import logger from '../utils/logger';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/payment/status/:paymentId
 * Возвращает статус платежа. Сначала проверяет нашу БД, затем YooKassa API (для платежей из бота).
 */
router.get('/status/:paymentId', async (req: any, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.telegramId.toString();

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId is required',
      });
    }

    // 1. Проверяем нашу БД (платежи из WebApp create-payment)
    const paymentRecord = await Payment.findOne({ paymentId, userId });

    if (paymentRecord) {
      return res.json({
        success: true,
        payment: {
          paymentId: paymentRecord.paymentId,
          status: paymentRecord.status,
          paid: paymentRecord.status === 'succeeded',
          subscriptionActivated: paymentRecord.subscriptionActivated,
        },
      });
    }

    // 2. Fallback: запрос в YooKassa (платежи из бота или старые)
    const yooKassa = new YooKassaService(
      process.env.YOOKASSA_SHOP_ID || '',
      process.env.YOOKASSA_SECRET_KEY || ''
    );

    const yooPayment = await yooKassa.getPayment(paymentId);

    if (!yooPayment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Проверяем, что платёж принадлежит текущему пользователю
    const paymentUserId = yooPayment.metadata?.userId;
    if (paymentUserId && paymentUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const paid = yooPayment.status === 'succeeded';

    return res.json({
      success: true,
      payment: {
        paymentId: yooPayment.id,
        status: yooPayment.status,
        paid,
        subscriptionActivated: paid, // если succeeded — подписка активирована webhook'ом
      },
    });
  } catch (error) {
    logger.error('Payment status error', { error, paymentId: req.params.paymentId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
