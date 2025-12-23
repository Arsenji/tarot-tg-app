import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { openAIService } from '../services/openai';
import { checkSubscriptionStatus, hasUsedFreeYesNo, markFreeYesNoUsed } from '../utils/subscription';
import { TarotReading } from '../models/TarotReading';
import logger from '../utils/logger';
import { getRussianCardName, getCardImagePath } from '../utils/cardTranslations';

const router = express.Router();

// Middleware для всех маршрутов
router.use(authenticateToken);

// Получить карту дня (GET)
router.get('/daily-card', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    
    // Проверяем, является ли пользователь администратором
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin = adminTelegramId && userId.toString() === adminTelegramId.toString();
    
    logger.info('Daily advice access check', {
      userId,
      adminTelegramId,
      isAdmin,
      userIdString: userId.toString(),
      adminIdString: adminTelegramId?.toString()
    });
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    logger.info('Daily advice subscription check', {
      userId,
      hasSubscription: subscriptionStatus.hasSubscription,
      isAdmin,
      willAllow: subscriptionStatus.hasSubscription || isAdmin
    });
    
    if (!subscriptionStatus.hasSubscription && !isAdmin) {
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
    const isReversed = Math.random() > 0.5;
    
    // Получаем русское название карты для промпта
    const russianCardName = getRussianCardName(randomCard);
    
    const interpretation = await openAIService.getCardInterpretation({
      cardName: russianCardName, // Используем русское название в промпте
      position: 'daily',
      isReversed
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
        name: russianCardName, // Русское название
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

// Получить карту дня (POST) - для совместимости с фронтендом
router.post('/daily-advice', async (req: any, res) => {
  try {
    const userId = req.user.telegramId;
    
    // Проверяем, является ли пользователь администратором
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin = adminTelegramId && userId.toString() === adminTelegramId.toString();
    
    logger.info('Daily advice access check', {
      userId,
      adminTelegramId,
      isAdmin,
      userIdString: userId.toString(),
      adminIdString: adminTelegramId?.toString()
    });
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    logger.info('Daily advice subscription check', {
      userId,
      hasSubscription: subscriptionStatus.hasSubscription,
      isAdmin,
      willAllow: subscriptionStatus.hasSubscription || isAdmin
    });
    
    if (!subscriptionStatus.hasSubscription && !isAdmin) {
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
    const isReversed = Math.random() > 0.5;
    
    // Получаем русское название карты для промпта
    const russianCardName = getRussianCardName(randomCard);
    
    const interpretation = await openAIService.getCardInterpretation({
      cardName: russianCardName, // Используем русское название в промпте
      position: 'daily',
      isReversed
    });

    if (!interpretation.success || !interpretation.interpretation) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get card interpretation'
      });
    }
    const imagePath = getCardImagePath(randomCard, isReversed);

    // Сохраняем расклад
    await openAIService.saveReading(
      req.user.userId,
      userId,
      {
        cards: [{
          name: randomCard, // Английское название для сохранения
          position: 'daily',
          isReversed: isReversed
        }],
        question: '', // Daily advice не имеет вопроса
        readingType: 'single'
      },
      interpretation.interpretation!
    );

    // Формируем ответ в формате, который ожидает фронтенд
    res.json({
      success: true,
      data: {
        card: {
          name: russianCardName, // Русское название
          category: 'major', // По умолчанию все карты из списка - старшие арканы
          isReversed: isReversed, // Добавляем информацию о перевернутости
          uprightImage: getCardImagePath(randomCard, false),
          reversedImage: getCardImagePath(randomCard, true),
          image: imagePath, // Добавляем поле image для совместимости
          imagePath: imagePath, // Добавляем поле imagePath для совместимости
          uprightInterpretation: isReversed ? '' : interpretation.interpretation,
          reversedInterpretation: isReversed ? interpretation.interpretation : ''
        },
        interpretation: interpretation.interpretation,
        advice: interpretation.interpretation, // Для совместимости с фронтендом
        category: 'major'
      }
    });
  } catch (error) {
    logger.error('Daily advice error', { error, userId: req.user?.telegramId });
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
    
    // Проверяем, является ли пользователь администратором
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin = adminTelegramId && userId.toString() === adminTelegramId.toString();
    
    logger.info('Three cards access check', {
      userId,
      adminTelegramId,
      isAdmin,
      userIdString: userId.toString(),
      adminIdString: adminTelegramId?.toString()
    });
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    logger.info('Three cards subscription check', {
      userId,
      hasSubscription: subscriptionStatus.hasSubscription,
      isAdmin,
      willAllow: subscriptionStatus.hasSubscription || isAdmin
    });
    
    if (!subscriptionStatus.hasSubscription && !isAdmin) {
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
    const selectedCardsForAPI = []; // Для API (английские названия)
    const usedIndices = new Set();
    
    // Выбираем 3 уникальные карты
    while (selectedCards.length < 3) {
      const randomIndex = Math.floor(Math.random() * cards.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        const englishName = cards[randomIndex];
        const russianName = getRussianCardName(englishName);
        const isReversed = Math.random() > 0.5;
        const position: 'past' | 'present' | 'future' = selectedCards.length === 0 ? 'past' : selectedCards.length === 1 ? 'present' : 'future';
        
        const imagePath = getCardImagePath(englishName, isReversed);
        
        // Логируем для отладки
        logger.info('Selected card for three-card reading', {
          index: selectedCards.length,
          englishName,
          russianName,
          position,
          isReversed,
          imagePath
        });
        
        // Для API используем английские названия
        selectedCardsForAPI.push({
          name: englishName,
          position: position,
          isReversed: isReversed
        });
        
        // Для ответа используем русские названия
        selectedCards.push({
          name: russianName, // Русское название
          position: position,
          isReversed: isReversed,
          category: 'major',
          uprightImage: getCardImagePath(englishName, false),
          reversedImage: getCardImagePath(englishName, true),
          image: imagePath, // Добавляем поле image для совместимости
          imagePath: imagePath // Добавляем поле imagePath для совместимости
        });
      }
    }

    const interpretation = await openAIService.getReadingInterpretation({
      cards: selectedCardsForAPI, // Используем английские названия для API
      question,
      readingType: 'three'
    });

    if (!interpretation.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get reading interpretation'
      });
    }

    // Сохраняем расклад (используем английские названия для сохранения)
    await openAIService.saveReading(
      req.user.userId,
      userId,
      {
        cards: selectedCardsForAPI,
        question,
        readingType: 'three'
      },
      interpretation.interpretation!
    );

    res.json({
      success: true,
      data: {
        cards: selectedCards, // Русские названия для фронтенда
        interpretation: interpretation.interpretation,
        category: 'major'
      }
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

    // Проверяем, является ли пользователь администратором
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin = adminTelegramId && userId.toString() === adminTelegramId.toString();
    
    logger.info('Yes/No access check', {
      userId,
      adminTelegramId,
      isAdmin,
      userIdString: userId.toString(),
      adminIdString: adminTelegramId?.toString()
    });
    
    // Проверяем подписку или бесплатное использование
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    const hasUsedFree = await hasUsedFreeYesNo(userId);
    
    logger.info('Yes/No subscription check', {
      userId,
      hasSubscription: subscriptionStatus.hasSubscription,
      isAdmin,
      hasUsedFree,
      willAllow: subscriptionStatus.hasSubscription || isAdmin || !hasUsedFree
    });
    
    if (!subscriptionStatus.hasSubscription && !isAdmin && hasUsedFree) {
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

    if (!interpretation.success || !interpretation.interpretation) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get Yes/No interpretation'
      });
    }

    // Извлекаем ответ "Да" или "Нет" из интерпретации
    const interpretationText = interpretation.interpretation;
    const firstLine = interpretationText.split('\n')[0].trim();
    let answer: 'Да' | 'Нет' = 'Да';
    
    if (firstLine.toLowerCase().includes('нет') || firstLine.toLowerCase().startsWith('нет')) {
      answer = 'Нет';
    } else if (firstLine.toLowerCase().includes('да') || firstLine.toLowerCase().startsWith('да')) {
      answer = 'Да';
    } else {
      // Если ответ не найден явно, определяем по карте
      const positiveCards = ['The Sun', 'The Star', 'The World', 'The Wheel of Fortune', 'The Lovers', 'The Chariot'];
      const negativeCards = ['The Tower', 'Death', 'The Devil', 'The Hanged Man', 'The Moon'];
      
      if (negativeCards.includes(randomCard) && isReversed) {
        answer = 'Нет';
      } else if (positiveCards.includes(randomCard) && !isReversed) {
        answer = 'Да';
      } else {
        // По умолчанию определяем по перевернутости
        answer = isReversed ? 'Нет' : 'Да';
      }
    }

    // Получаем русское название карты
    const russianCardName = getRussianCardName(randomCard);
    const imagePath = getCardImagePath(randomCard, isReversed);

    // Сохраняем расклад
    await openAIService.saveReading(
      req.user.userId,
      userId,
      {
        cards: [cardData],
        question,
        readingType: 'yesno'
      },
      interpretationText
    );

    // Отмечаем использование бесплатного Yes/No
    if (!subscriptionStatus.hasSubscription) {
      await markFreeYesNoUsed(userId);
    }

    // Формируем ответ в формате, который ожидает фронтенд
    res.json({
      success: true,
      data: {
        card: {
          name: russianCardName, // Русское название
          category: 'major',
          isReversed: isReversed, // Добавляем информацию о перевернутости
          uprightImage: getCardImagePath(randomCard, false),
          reversedImage: getCardImagePath(randomCard, true),
          image: imagePath, // Добавляем поле image для совместимости
          imagePath: imagePath, // Добавляем поле imagePath для совместимости
          uprightInterpretation: isReversed ? '' : interpretationText,
          reversedInterpretation: isReversed ? interpretationText : ''
        },
        answer: answer,
        interpretation: interpretationText,
        category: 'major'
      }
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
    
    // Проверяем, является ли пользователь администратором (безлимитный доступ)
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    const isAdmin = adminTelegramId && userId.toString() === adminTelegramId.toString();
    
    // Логируем для отладки
    logger.info('Subscription status check', {
      userId,
      adminTelegramId,
      isAdmin,
      userIdType: typeof userId,
      adminIdType: typeof adminTelegramId,
      userIdString: userId.toString(),
      adminIdString: adminTelegramId?.toString(),
      comparison: `${userId.toString()} === ${adminTelegramId?.toString()}`
    });
    
    // Проверяем подписку
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    const hasUsedFreeYesNoValue = await hasUsedFreeYesNo(userId);
    
    // Формируем ответ в формате, который ожидает фронтенд
    // ВРЕМЕННО: разрешаем все расклады для всех пользователей (для отладки)
    const subscriptionInfo = {
      hasSubscription: subscriptionStatus.hasSubscription || isAdmin, // Админ всегда имеет подписку
      canUseDailyAdvice: true, // ВРЕМЕННО: всегда доступно
      canUseYesNo: true, // ВРЕМЕННО: всегда доступно
      canUseThreeCards: true, // ВРЕМЕННО: всегда доступно
      remainingDailyAdvice: -1, // -1 означает неограниченно
      remainingYesNo: -1, // -1 означает неограниченно
      remainingThreeCards: -1, // -1 означает неограниченно
    };
    
    logger.info('Subscription info response', {
      userId,
      isAdmin,
      subscriptionInfo
    });
    
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

// Уточняющий вопрос для расклада
// Поддерживаем оба пути для обратной совместимости
const handleClarifyingQuestion = async (req: any, res: any) => {
  try {
    const userId = req.user.telegramId;
    const { clarifyingQuestion, originalQuestion, originalCard, originalInterpretation, readingType } = req.body;
    
    logger.info('Clarifying question request', {
      userId,
      hasClarifyingQuestion: !!clarifyingQuestion,
      clarifyingQuestionLength: clarifyingQuestion?.length,
      hasOriginalQuestion: !!originalQuestion,
      hasOriginalCard: !!originalCard,
      hasOriginalInterpretation: !!originalInterpretation,
      readingType
    });
    
    if (!clarifyingQuestion || clarifyingQuestion.trim().length < 3) {
      logger.warn('Invalid clarifying question', { clarifyingQuestion, length: clarifyingQuestion?.length });
      return res.status(400).json({
        success: false,
        error: 'Clarifying question must be at least 3 characters long'
      });
    }

    // Используем clarifyingQuestion как fallback для originalQuestion
    const finalOriginalQuestion = originalQuestion || clarifyingQuestion;
    
    if (!finalOriginalQuestion || !originalCard || !originalInterpretation) {
      logger.warn('Missing required fields', {
        hasOriginalQuestion: !!finalOriginalQuestion,
        hasOriginalCard: !!originalCard,
        hasOriginalInterpretation: !!originalInterpretation
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: originalQuestion, originalCard, originalInterpretation'
      });
    }

    // Получаем ответ от GPT
    const answer = await openAIService.getClarifyingAnswer(
      clarifyingQuestion,
      originalQuestion,
      originalCard,
      originalInterpretation,
      readingType || 'yesno'
    );

    if (!answer.success || !answer.interpretation) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get clarifying answer'
      });
    }

    // Извлекаем ответ "Да" или "Нет" для yes/no расклада
    let yesNoAnswer: 'Да' | 'Нет' | null = null;
    if (readingType === 'yesno') {
      const firstLine = answer.interpretation.split('\n')[0].trim();
      if (firstLine.toLowerCase().includes('нет') || firstLine.toLowerCase().startsWith('нет')) {
        yesNoAnswer = 'Нет';
      } else if (firstLine.toLowerCase().includes('да') || firstLine.toLowerCase().startsWith('да')) {
        yesNoAnswer = 'Да';
      }
    }

    res.json({
      success: true,
      data: {
        answer: answer.interpretation,
        yesNoAnswer: yesNoAnswer,
        card: originalCard // Возвращаем ту же карту
      }
    });
  } catch (error) {
    logger.error('Clarifying question error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Регистрируем оба пути для обратной совместимости
router.post('/clarifying-question', handleClarifyingQuestion);
router.post('/clarifying-answer', handleClarifyingQuestion); // Для обратной совместимости со старым кодом

export default router;
