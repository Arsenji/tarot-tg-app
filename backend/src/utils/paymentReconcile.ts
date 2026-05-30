import { Payment } from '../models/Payment';
import { YooKassaService } from '../services/yookassa';
import { creditTokenPackage } from './tokens';
import { isTokenPackageId, TokenPackageId, TOKEN_PACKAGES } from '../constants/tokens';
import logger from './logger';

/**
 * Builds the YooKassa return_url.
 * Prefers a Telegram deep link back to the bot so the user lands in the chat
 * (and we reconcile + credit on /start). Falls back to the web result page.
 */
export function getPaymentReturnUrl(returnRef: string): string {
  const botUsername = process.env.BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME;
  if (botUsername) {
    return `https://t.me/${botUsername}?start=paid`;
  }
  return `${process.env.FRONTEND_URL}/payment-result?paymentId=${returnRef}`;
}

/**
 * Idempotently credits tokens for a succeeded payment.
 * Uses an atomic claim on the Payment document so concurrent callers
 * (webhook + status poll + reconcile) never double-credit.
 */
export async function creditTokensForSucceededPayment(params: {
  paymentId: string;
  metadata?: { userId?: string; tokenPackage?: string } | null;
}): Promise<{ credited: boolean; newBalance?: number; tokenPackage?: TokenPackageId; userId?: number }> {
  const { paymentId } = params;

  // Atomic claim — only the first caller proceeds to credit.
  const payment = await Payment.findOneAndUpdate(
    { paymentId, tokensCredited: { $ne: true } },
    { $set: { status: 'succeeded', tokensCredited: true, processed: true } },
    { new: true }
  );

  if (!payment) {
    return { credited: false };
  }

  const packageRaw = params.metadata?.tokenPackage || payment.tokenPackage;
  const userId = parseInt(String(params.metadata?.userId || payment.userId), 10);

  if (!userId || !packageRaw || !isTokenPackageId(String(packageRaw))) {
    logger.error('Cannot credit tokens: missing/invalid package or user', { paymentId, userId, packageRaw });
    // Release the claim so a later attempt with valid data can retry.
    await Payment.updateOne({ paymentId }, { $set: { tokensCredited: false } });
    return { credited: false };
  }

  const packageId = String(packageRaw) as TokenPackageId;
  const newBalance = await creditTokenPackage(userId, packageId);

  if (newBalance == null) {
    await Payment.updateOne({ paymentId }, { $set: { tokensCredited: false } });
    logger.error('Token crediting failed, claim released', { paymentId, userId, packageId });
    return { credited: false };
  }

  logger.info('Tokens credited for payment', {
    paymentId,
    userId,
    packageId,
    tokens: TOKEN_PACKAGES[packageId].tokens,
    newBalance,
  });

  return { credited: true, newBalance, tokenPackage: packageId, userId };
}

/**
 * Reconciles a user's uncredited payments by verifying them against YooKassa
 * and crediting any that succeeded. Guarantees crediting even if the webhook
 * never arrives. Returns the latest balance if anything was credited.
 */
export async function reconcilePendingPayments(telegramId: number): Promise<number | null> {
  const yooKassa = new YooKassaService(
    process.env.YOOKASSA_SHOP_ID || '',
    process.env.YOOKASSA_SECRET_KEY || ''
  );

  const pending = await Payment.find({
    userId: String(telegramId),
    tokensCredited: { $ne: true },
    tokenPackage: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(10);

  let lastBalance: number | null = null;

  for (const p of pending) {
    try {
      let yp = await yooKassa.getPayment(p.paymentId);

      // Legacy two-stage payments stuck in waiting_for_capture: capture them
      // so they reach succeeded, then credit.
      if (yp?.status === 'waiting_for_capture') {
        logger.info('reconcilePendingPayments: capturing waiting_for_capture payment', { paymentId: p.paymentId });
        const captured = await yooKassa.capturePayment(p.paymentId, yp.amount);
        yp = captured || (await yooKassa.getPayment(p.paymentId));
      }

      if (yp?.status === 'succeeded') {
        const result = await creditTokensForSucceededPayment({
          paymentId: p.paymentId,
          metadata: yp.metadata,
        });
        if (result.credited && result.newBalance != null) {
          lastBalance = result.newBalance;
        }
      } else if (yp?.status === 'canceled') {
        await Payment.updateOne({ paymentId: p.paymentId }, { $set: { status: 'canceled', processed: true } });
      }
    } catch (err) {
      logger.error('reconcilePendingPayments: failed for payment', { paymentId: p.paymentId, error: err });
    }
  }

  return lastBalance;
}
