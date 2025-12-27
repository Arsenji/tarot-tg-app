import express from 'express';
import { bot } from '../bot/index';
import logger from '../utils/logger';

const router = express.Router();

// Webhook endpoint для получения обновлений от Telegram
router.post('/webhook', async (req, res) => {
  try {
    // Проверяем, что бот инициализирован
    if (!bot) {
      logger.error('Bot is not initialized, cannot process webhook');
      return res.status(503).json({ error: 'Bot is not initialized' });
    }

    // Передаем обновление боту для обработки
    await bot.handleUpdate(req.body);
    
    // Отвечаем Telegram, что обновление получено
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error processing Telegram webhook', { error });
    // Все равно отвечаем 200, чтобы Telegram не повторял запрос
    res.status(200).json({ ok: false, error: 'Processing failed' });
  }
});

// Endpoint для проверки статуса webhook
router.get('/webhook-info', async (req, res) => {
  try {
    if (!bot) {
      return res.status(503).json({ error: 'Bot is not initialized' });
    }

    const webhookInfo = await bot.telegram.getWebhookInfo();
    res.json(webhookInfo);
  } catch (error) {
    logger.error('Error getting webhook info', { error });
    res.status(500).json({ error: 'Failed to get webhook info' });
  }
});

export default router;

