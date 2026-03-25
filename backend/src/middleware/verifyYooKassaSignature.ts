import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * IP-адреса YooKassa для webhook-уведомлений.
 * Источник: https://yookassa.ru/developers/using-api/webhooks#ip-auth
 */
const YOOKASSA_IP_RANGES = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.154.128/25',
  '77.75.156.11',
  '77.75.156.35',
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [network, maskBits] = cidr.split('/');
  const mask = (~0 << (32 - parseInt(maskBits, 10))) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

function isYooKassaIp(ip: string): boolean {
  const cleanIp = ip.replace('::ffff:', '');
  return YOOKASSA_IP_RANGES.some(range => isIpInCidr(cleanIp, range));
}

/**
 * Middleware для верификации webhook YooKassa.
 *
 * Проверка 1: IP-адрес отправителя (whitelist YooKassa).
 * В development или за reverse proxy (Render, nginx) проверка IP пропускается
 * с предупреждением, т.к. реальный IP может быть скрыт за прокси.
 */
export const verifyYooKassaWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket.remoteAddress || '';

    if (isYooKassaIp(clientIp)) {
      logger.info('YooKassa webhook: IP verified', { ip: clientIp });
      next();
      return;
    }

    // За reverse proxy (Render, Vercel, nginx) IP может быть прокси-сервера
    if (process.env.NODE_ENV === 'production' && forwarded) {
      logger.warn('YooKassa webhook: IP not in whitelist, but behind proxy — allowing', {
        ip: clientIp,
        forwarded,
      });
      next();
      return;
    }

    // В development пропускаем для тестирования
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('YooKassa webhook: IP check skipped in development', { ip: clientIp });
      next();
      return;
    }

    logger.warn('YooKassa webhook: rejected — IP not in whitelist', { ip: clientIp });
    res.status(403).json({ status: 'error', message: 'Forbidden' });
  } catch (err) {
    logger.error('Webhook verification error', { error: err });
    res.status(500).json({ status: 'error', message: 'Webhook verification error' });
  }
};
