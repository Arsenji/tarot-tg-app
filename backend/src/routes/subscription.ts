import express from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { PostHog } from 'posthog-node';
import { authenticateToken } from '../middleware/auth';
import { verifyYooKassaWebhook } from '../middleware/verifyYooKassaSignature';
import { YooKassaService, TOKEN_PACKAGES } from '../services/yookassa';
import { Payment } from '../models/Payment';
import { creditTokenPackage } from '../utils/tokens';
import { isTokenPackageId } from '../constants/tokens';
import logger from '../utils/logger';

const posthog = new PostHog('phc_pA7Aai2zies44X8G3ebVUTQii7DmCRxt26Cww33HPsN3', {
  host: 'https://eu.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
});

const router = express.Router();

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many webhook requests' },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment requests, please try again later' },
});

router.post('/webhook', webhookLimiter, verifyYooKassaWebhook, async (req, res) => {
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

    const yooKassa = new YooKassaService(
      process.env.YOOKASSA_SHOP_ID || '',
      process.env.YOOKASSA_SECRET_KEY || ''
    );
    const verifiedPayment = await yooKassa.getPayment(paymentId);

    if (!verifiedPayment || verifiedPayment.status !== 'succeeded') {
      logger.warn('Webhook: payment status not confirmed via API', {
        paymentId,
        webhookStatus: paymentData.status,
        apiStatus: verifiedPayment?.status || 'not found',
      });
      return res.status(200).json({ status: 'ok', message: 'Payment not confirmed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { paymentId, processed: false },
      {
        $set: {
          status: 'succeeded',
          tokensCredited: true,
          processed: true,
        },
      },
      { new: true }
    );

    if (!payment) {
      logger.info('Webhook: payment already processed or not found (idempotent)', { paymentId });
      return res.status(200).json({ status: 'ok', message: 'Already processed' });
    }

    const metadata = verifiedPayment.metadata || paymentData.metadata;
    const packageRaw = metadata?.tokenPackage || payment.tokenPackage;
    const userId = parseInt(metadata?.userId || payment.userId, 10);

    if (userId && packageRaw && isTokenPackageId(String(packageRaw))) {
      const packageId = String(packageRaw) as import('../constants/tokens').TokenPackageId;
      const pkg = TOKEN_PACKAGES[packageId];
      const newBalance = await creditTokenPackage(userId, packageId);

      if (newBalance != null) {
        logger.info('Tokens credited via webhook', {
          userId,
          tokenPackage: packageId,
          paymentId,
          amount: paymentData.amount?.value,
          tokensBalance: newBalance,
        });

        posthog.capture({
          distinctId: String(userId),
          event: 'tokens_purchased',
          properties: {
            package: pkg.tokens,
            amount: Number(paymentData.amount?.value || pkg.price),
            currency: paymentData.amount?.currency || 'RUB',
            paymentId,
          },
        });
      } else {
        logger.error('Failed to credit tokens via webhook', { userId, packageId, paymentId });
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook error', { error, body: req.body });
    return res.status(500).json({ status: 'error', message: 'Webhook processing failed' });
  }
});

router.use(authenticateToken);

router.post('/create-payment', paymentLimiter, async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    const { tokenPackage } = req.body;
    const packageId = String(tokenPackage ?? '');

    if (!isTokenPackageId(packageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token package',
      });
    }

    const yooKassa = new YooKassaService(
      process.env.YOOKASSA_SHOP_ID || '',
      process.env.YOOKASSA_SECRET_KEY || ''
    );

    const returnRef = randomUUID();
    const returnUrl = `${process.env.FRONTEND_URL}/payment-result?paymentId=${returnRef}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/payment/cancel`;

    const payment = await yooKassa.createTokenPayment(
      userId.toString(),
      packageId,
      returnUrl,
      cancelUrl
    );

    if (!payment) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment',
      });
    }

    await Payment.findOneAndUpdate(
      { paymentId: payment.id },
      {
        paymentId: payment.id,
        userId: userId.toString(),
        status: 'pending',
        tokensCredited: false,
        processed: false,
        tokenPackage: packageId,
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
        description: payment.description,
        tokenPackage: packageId,
      },
    });
  } catch (error) {
    logger.error('Create token payment error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

router.get('/packages', (_req, res) => {
  try {
    const packages = Object.entries(TOKEN_PACKAGES).map(([id, pkg]) => ({
      id,
      tokens: pkg.tokens,
      name: pkg.name,
      price: pkg.price,
      currency: 'RUB',
    }));

    res.json({ success: true, packages });
  } catch (error) {
    logger.error('Get token packages error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
