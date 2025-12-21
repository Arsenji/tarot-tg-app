import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { openAIService } from '../services/openai';
import { checkSubscriptionStatus, hasUsedFreeYesNo, markFreeYesNoUsed } from '../utils/subscription';
import { TarotReading } from '../models/TarotReading';
import logger from '../utils/logger';

const router = express.Router();

// Middleware для всех маршрутов
router.use(authenticateToken);

// Получить карту дня
router.get('/daily-card', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    if (!subscriptionStatus.hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required',
        subscriptionRequired: true
      });
    }

    // Здесь должна быть логика выбора случайной карты
    const cards = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ];
    
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    
    const interpretation = await openAIService.getCardInterpretation({
      cardName: randomCard,
      position: 'daily',
      isReversed: Math.random() > 0.5
    });

    if (!interpretation.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get card interpretation'
      });
    }

    res.json({
      success: true,
      card: {
        name: randomCard,
        interpretation: interpretation.interpretation
      }
    });
  } catch (error) {
    logger.error('Daily card error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Получить три карты
router.post('/three-cards', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    const { question } = req.body;
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    if (!subscriptionStatus.hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required',
        subscriptionRequired: true
      });
    }

    const cards = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ];

    const selectedCards = [];
    const usedIndices = new Set();
    
    // Выбираем 3 уникальные карты
    while (selectedCards.length < 3) {
      const randomIndex = Math.floor(Math.random() * cards.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedCards.push({
          name: cards[randomIndex],
          position: selectedCards.length === 0 ? 'past' : selectedCards.length === 1 ? 'present' : 'future',
          isReversed: Math.random() > 0.5
        });
      }
    }

    const interpretation = await openAIService.getReadingInterpretation({
      cards: selectedCards,
      question,
      readingType: 'three'
    });

    if (!interpretation.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get reading interpretation'
      });
    }

    // Сохраняем расклад
    await openAIService.saveReading(
      req.user.userId,
      userId,
      {
        cards: selectedCards,
        question,
        readingType: 'three'
      },
      interpretation.interpretation!
    );

    res.json({
      success: true,
      cards: selectedCards,
      interpretation: interpretation.interpretation
    });
  } catch (error) {
    logger.error('Three cards error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Yes/No расклад
router.post('/yes-no', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    const { question } = req.body;
    
    if (!question || question.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Question must be at least 10 characters long'
      });
    }

    // Проверяем подписку или бесплатное использование
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    const hasUsedFree = await hasUsedFreeYesNo(userId);
    
    if (!subscriptionStatus.hasSubscription && hasUsedFree) {
      return res.status(403).json({
        success: false,
        error: 'Free Yes/No reading already used. Subscription required.',
        subscriptionRequired: true
      });
    }

    const cards = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ];

    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    const isReversed = Math.random() > 0.5;
    
    const cardData = {
      name: randomCard,
      position: 'yesno',
      isReversed
    };

    const interpretation = await openAIService.getReadingInterpretation({
      cards: [cardData],
      question,
      readingType: 'yesno'
    });

    if (!interpretation.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get Yes/No interpretation'
      });
    }

    // Сохраняем расклад
    await openAIService.saveReading(
      req.user.userId,
      userId,
      {
        cards: [cardData],
        question,
        readingType: 'yesno'
      },
      interpretation.interpretation!
    );

    // Отмечаем использование бесплатного Yes/No
    if (!subscriptionStatus.hasSubscription) {
      await markFreeYesNoUsed(userId);
    }

    res.json({
      success: true,
      card: cardData,
      interpretation: interpretation.interpretation
    });
  } catch (error) {
    logger.error('Yes/No error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Получить историю раскладов
router.get('/history', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const readings = await TarotReading.find({ telegramId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    res.json({
      success: true,
      readings
    });
  } catch (error) {
    logger.error('History error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Получить статус подписки (для фронтенда)
router.get('/subscription-status', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    const hasUsedFreeYesNoValue = await hasUsedFreeYesNo(userId);
    
    // Формируем ответ в формате, который ожидает фронтенд
    const subscriptionInfo = {
      hasSubscription: subscriptionStatus.hasSubscription,
      canUseDailyAdvice: subscriptionStatus.hasSubscription, // Только с подпиской
      canUseYesNo: subscriptionStatus.hasSubscription || !hasUsedFreeYesNoValue, // С подпиской или если не использовал бесплатный
      canUseThreeCards: subscriptionStatus.hasSubscription, // Только с подпиской
      remainingDailyAdvice: subscriptionStatus.hasSubscription ? -1 : 0, // -1 означает неограниченно
      remainingYesNo: subscriptionStatus.hasSubscription ? -1 : (hasUsedFreeYesNoValue ? 0 : 1), // 1 бесплатное использование
      remainingThreeCards: subscriptionStatus.hasSubscription ? -1 : 0, // -1 означает неограниченно
    };
    
    res.json({
      success: true,
      subscriptionInfo
    });
  } catch (error) {
    logger.error('Subscription status error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
