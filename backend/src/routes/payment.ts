import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { Payment } from '../models/Payment';
import { YooKassaService } from '../services/yookassa';
import { creditTokensForSucceededPayment } from '../utils/paymentReconcile';
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

    const yooKassa = new YooKassaService(
      process.env.YOOKASSA_SHOP_ID || '',
      process.env.YOOKASSA_SECRET_KEY || ''
    );

    // 1. Проверяем нашу БД: по paymentId (YooKassa id) или по returnRef (из URL после редиректа)
    let paymentRecord = await Payment.findOne({ paymentId, userId });
    if (!paymentRecord) {
      paymentRecord = await Payment.findOne({ returnRef: paymentId, userId });
    }

    if (paymentRecord) {
      const realId = paymentRecord.paymentId;
      const yooPayment = await yooKassa.getPayment(realId);
      const paid = yooPayment?.status === 'succeeded' || paymentRecord.status === 'succeeded';

      // Резервное начисление токенов, если webhook не дошёл (идемпотентно).
      if (paid && !paymentRecord.tokensCredited) {
        await creditTokensForSucceededPayment({
          paymentId: realId,
          metadata: yooPayment?.metadata,
        });
        paymentRecord = (await Payment.findOne({ paymentId: realId })) || paymentRecord;
      }

      return res.json({
        success: true,
        payment: {
          paymentId: realId,
          status: yooPayment?.status || paymentRecord.status,
          paid,
          tokensCredited: paymentRecord.tokensCredited,
        },
      });
    }

    // 2. Fallback: запрос в YooKassa (платежи из бота или старые)
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

    if (paid) {
      await creditTokensForSucceededPayment({
        paymentId: yooPayment.id,
        metadata: yooPayment.metadata,
      });
    }

    return res.json({
      success: true,
      payment: {
        paymentId: yooPayment.id,
        status: yooPayment.status,
        paid,
        tokensCredited: paid,
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
