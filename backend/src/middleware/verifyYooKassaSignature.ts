import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';

/**
 * Middleware для проверки подписи webhook YooKassa.
 * Защита от подделки POST-запросов — принимаем только запросы от YooKassa.
 *
 * YOOKASSA_WEBHOOK_SECRET обязателен при включённой YooKassa (проверка при старте).
 */
export const verifyYooKassaSignature = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const secret = process.env.YOOKASSA_WEBHOOK_SECRET;

    if (!secret) {
      logger.warn('YOOKASSA_WEBHOOK_SECRET not set — signature verification skipped');
      next();
      return;
    }

    const signature = req.headers['yookassa-signature'] as string;
    if (!signature) {
      logger.warn('YooKassa webhook: missing signature header');
      res.status(403).json({ status: 'error', message: 'Missing signature' });
      return;
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      logger.error('YooKassa webhook: rawBody not available for signature verification');
      res.status(500).json({ status: 'error', message: 'Webhook verification error' });
      return;
    }

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (generatedSignature !== signature) {
      logger.warn('YooKassa webhook: invalid signature');
      res.status(403).json({ status: 'error', message: 'Invalid signature' });
      return;
    }

    next();
  } catch (err) {
    logger.error('Webhook verification error', { error: err });
    res.status(500).json({ status: 'error', message: 'Webhook verification error' });
  }
};
