import express from 'express';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { authenticateToken } from '../middleware/auth';
import { openAIService } from '../services/openai';
import {
  markDailyAdviceUsed,
  getFreeUsageCooldowns,
} from '../utils/subscription';
import {
  buildWalletSnapshot,
  canAffordYesNo,
  canAffordThreeCards,
  tryConsumeYesNo,
  tryConsumeThreeCards,
  WalletSnapshot,
} from '../utils/tokens';
import { YES_NO_TOKEN_COST, THREE_CARDS_TOKEN_COST } from '../constants/tokens';
import { TarotReading } from '../models/TarotReading';
import logger from '../utils/logger';
import { getRussianCardName, getCardImagePath } from '../utils/cardTranslations';

const router = express.Router();

function isAdminUser(userId: number): boolean {
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  return !!(adminTelegramId && userId.toString() === adminTelegramId.toString());
}

async function buildWalletInfoForRequest(req: any): Promise<WalletSnapshot | null> {
  const userId = req.user?.telegramId;
  if (userId == null) return null;
  return buildWalletSnapshot(userId, isAdminUser(userId));
}

function sendInsufficientTokens(res: express.Response, required: number, balance: number) {
  return res.status(402).json({
    success: false,
    code: 'INSUFFICIENT_TOKENS',
    required,
    balance,
  });
}

function attachWallet(wallet: WalletSnapshot | null) {
  if (!wallet) return {};
  return { walletInfo: wallet, tokensBalance: wallet.tokensBalance };
}

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
    
    const cooldowns = await getFreeUsageCooldowns(userId);
    const hasUsedToday = cooldowns.dailyAdviceMsRemaining > 0;

    logger.info('Daily advice access check', {
      userId,
      isAdmin,
      hasUsedToday,
      dailyAdviceMsRemaining: cooldowns.dailyAdviceMsRemaining,
      dailyAdviceHoursRemaining: cooldowns.dailyAdviceHoursRemaining,
      willAllow: isAdmin || !hasUsedToday,
    });

    if (!isAdmin && hasUsedToday) {
      const nextAvailableAt = new Date(Date.now() + cooldowns.dailyAdviceMsRemaining).toISOString();
      return res.status(403).json({
        success: false,
        error: 'Daily advice already used. Please wait until cooldown ends.',
        reason: 'DAILY_ADVICE_COOLDOWN',
        subscriptionRequired: false,
        cooldown: {
          msRemaining: cooldowns.dailyAdviceMsRemaining,
          hoursRemaining: cooldowns.dailyAdviceHoursRemaining,
          nextAvailableAt
        }
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
      const status = interpretation.fallback ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: interpretation.error || 'Failed to get card interpretation',
        fallback: interpretation.fallback || false,
      });
    }

    if (!isAdmin) {
      await markDailyAdviceUsed(userId);
      logger.info('Daily Advice marked as used', { telegramId: userId });
    }

    const wallet = await buildWalletInfoForRequest(req);
    const cooldownAfter = await getFreeUsageCooldowns(userId);
    res.json({
      success: true,
      card: {
        name: russianCardName,
        interpretation: interpretation.interpretation
      },
      ...attachWallet(wallet),
      cooldown: {
        msRemaining: cooldownAfter.dailyAdviceMsRemaining,
        hoursRemaining: cooldownAfter.dailyAdviceHoursRemaining,
        nextAvailableAt: cooldownAfter.dailyAdviceMsRemaining > 0
          ? new Date(Date.now() + cooldownAfter.dailyAdviceMsRemaining).toISOString()
          : null,
      },
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
    
    const cooldowns = await getFreeUsageCooldowns(userId);
    const hasUsedToday = cooldowns.dailyAdviceMsRemaining > 0;

    logger.info('Daily advice access check', {
      userId,
      isAdmin,
      hasUsedToday,
      dailyAdviceMsRemaining: cooldowns.dailyAdviceMsRemaining,
      dailyAdviceHoursRemaining: cooldowns.dailyAdviceHoursRemaining,
      willAllow: isAdmin || !hasUsedToday,
    });

    if (!isAdmin && hasUsedToday) {
      const nextAvailableAt = new Date(Date.now() + cooldowns.dailyAdviceMsRemaining).toISOString();
      return res.status(403).json({
        success: false,
        error: 'Daily advice already used. Please wait until cooldown ends.',
        reason: 'DAILY_ADVICE_COOLDOWN',
        subscriptionRequired: false,
        cooldown: {
          msRemaining: cooldowns.dailyAdviceMsRemaining,
          hoursRemaining: cooldowns.dailyAdviceHoursRemaining,
          nextAvailableAt
        }
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
      const status = interpretation.fallback ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: interpretation.error || 'Failed to get card interpretation',
        fallback: interpretation.fallback || false,
      });
    }
    const imagePath = getCardImagePath(randomCard, isReversed);

    if (!isAdmin) {
      await markDailyAdviceUsed(userId);
      logger.info('Daily Advice marked as used', { telegramId: userId });
    }

    try {
      if (interpretation.interpretation && interpretation.interpretation.trim().length > 0) {
        await openAIService.saveReading(
          req.user.userId,
          userId,
          {
            cards: [{
              name: randomCard,
              position: 'daily',
              isReversed: isReversed,
            }],
            question: '',
            readingType: 'single',
          },
          interpretation.interpretation
        );
      }
    } catch (saveError) {
      logger.error('Error saving daily-advice reading', { error: saveError, userId, telegramId: userId });
    }

    const wallet = await buildWalletInfoForRequest(req);
    const cooldownAfter = await getFreeUsageCooldowns(userId);
    res.json({
      success: true,
      data: {
        card: {
          name: russianCardName,
          category: 'major',
          isReversed: isReversed,
          uprightImage: getCardImagePath(randomCard, false),
          reversedImage: getCardImagePath(randomCard, true),
          image: imagePath,
          imagePath: imagePath,
          uprightInterpretation: isReversed ? '' : interpretation.interpretation,
          reversedInterpretation: isReversed ? interpretation.interpretation : '',
        },
        interpretation: interpretation.interpretation,
        advice: interpretation.interpretation,
        category: 'major',
      },
      ...attachWallet(wallet),
      cooldown: {
        msRemaining: cooldownAfter.dailyAdviceMsRemaining,
        hoursRemaining: cooldownAfter.dailyAdviceHoursRemaining,
        nextAvailableAt: cooldownAfter.dailyAdviceMsRemaining > 0
          ? new Date(Date.now() + cooldownAfter.dailyAdviceMsRemaining).toISOString()
          : null,
      },
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
    const question = req.body?.question || req.body?.userQuestion || '';
    
    const isAdmin = isAdminUser(userId);
    const walletBefore = await buildWalletSnapshot(userId, isAdmin);
    if (!walletBefore) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    if (!canAffordThreeCards(walletBefore, isAdmin)) {
      return sendInsufficientTokens(res, THREE_CARDS_TOKEN_COST, walletBefore.tokensBalance);
    }

    logger.info('Three cards token check', {
      userId,
      isAdmin,
      tokensBalance: walletBefore.tokensBalance,
      freeThreeCardsRemaining: walletBefore.freeThreeCardsRemaining,
    });

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
      const status = interpretation.fallback ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: interpretation.error || 'Failed to get reading interpretation',
        fallback: interpretation.fallback || false,
      });
    }

    const consumed = await tryConsumeThreeCards(userId, isAdmin);
    if (!consumed.ok) {
      return sendInsufficientTokens(res, consumed.required, consumed.balance);
    }

    try {
      if (interpretation.interpretation && interpretation.interpretation.trim().length > 0) {
        await openAIService.saveReading(
          req.user.userId,
          userId,
          { cards: selectedCardsForAPI, question, readingType: 'three' },
          interpretation.interpretation
        );
      }
    } catch (saveError) {
      logger.error('Error saving three-cards reading', { error: saveError, userId, telegramId: userId });
    }

    const walletAfter = await buildWalletSnapshot(userId, isAdmin);
    res.json({
      success: true,
      data: {
        cards: selectedCards,
        interpretation: interpretation.interpretation,
        category: 'major',
      },
      ...attachWallet(walletAfter),
      tokensSpent: consumed.tokensSpent,
      usedFree: consumed.usedFree,
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

    const isAdmin = isAdminUser(userId);
    const walletBefore = await buildWalletSnapshot(userId, isAdmin);
    if (!walletBefore) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    if (!canAffordYesNo(walletBefore, isAdmin)) {
      return sendInsufficientTokens(res, YES_NO_TOKEN_COST, walletBefore.tokensBalance);
    }

    logger.info('Yes/No token check', {
      userId,
      isAdmin,
      tokensBalance: walletBefore.tokensBalance,
      freeYesNoRemaining: walletBefore.freeYesNoRemaining,
    });

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
      const status = interpretation.fallback ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: interpretation.error || 'Failed to get Yes/No interpretation',
        fallback: interpretation.fallback || false,
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

    const consumed = await tryConsumeYesNo(userId, isAdmin);
    if (!consumed.ok) {
      return sendInsufficientTokens(res, consumed.required, consumed.balance);
    }

    try {
      if (interpretationText && interpretationText.trim().length > 0) {
        await openAIService.saveReading(
          req.user.userId,
          userId,
          { cards: [cardData], question, readingType: 'yesno' },
          interpretationText
        );
      }
    } catch (saveError) {
      logger.error('Error saving yes-no reading', { error: saveError, userId, telegramId: userId });
    }

    const walletAfter = await buildWalletSnapshot(userId, isAdmin);
    res.json({
      success: true,
      data: {
        card: {
          name: russianCardName,
          category: 'major',
          isReversed: isReversed,
          uprightImage: getCardImagePath(randomCard, false),
          reversedImage: getCardImagePath(randomCard, true),
          image: imagePath,
          imagePath: imagePath,
          uprightInterpretation: isReversed ? '' : interpretationText,
          reversedInterpretation: isReversed ? interpretationText : '',
        },
        answer: answer,
        interpretation: interpretationText,
        category: 'major',
      },
      ...attachWallet(walletAfter),
      tokensSpent: consumed.tokensSpent,
      usedFree: consumed.usedFree,
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

    // История доступна всем авторизованным пользователям
    const { page = 1, limit = 50 } = req.query;
    
    logger.info('Fetching history', {
      userId: req.user.userId,
      telegramId: userId,
      userIdType: typeof req.user.userId,
      telegramIdType: typeof userId,
      userIdString: String(req.user.userId),
      telegramIdString: String(userId),
      page,
      limit
    });
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Проверяем подключение к БД
    if (mongoose.connection.readyState !== 1) {
      logger.error('MongoDB not connected when fetching history', {
        readyState: mongoose.connection.readyState,
        telegramId: userId
      });
      return res.status(500).json({
        success: false,
        error: 'Database connection error'
      });
    }
    
    // Проверяем, есть ли вообще записи в БД для этого пользователя
    const totalCount = await TarotReading.countDocuments({ telegramId: userId });
    logger.info('History total count check', {
      userId: req.user.userId,
      telegramId: userId,
      totalCount,
      query: { telegramId: userId }
    });
    
    // Также проверяем по userId (на случай, если сохранялось с другим полем)
    // Пробуем найти по userId разными способами
    let countByUserId = 0;
    try {
      // Пробуем как строку
      countByUserId = await TarotReading.countDocuments({ userId: req.user.userId });
      
      // Если не нашли, пробуем как ObjectId
      if (countByUserId === 0 && Types.ObjectId.isValid(req.user.userId)) {
        countByUserId = await TarotReading.countDocuments({ 
          userId: new Types.ObjectId(req.user.userId) 
        });
      }
    } catch (countError) {
      logger.error('Error counting readings by userId', {
        error: countError,
        userId: req.user.userId,
        userIdType: typeof req.user.userId
      });
    }
    
    logger.info('History count by userId', {
      userId: req.user.userId,
      telegramId: userId,
      countByUserId,
      query: { userId: req.user.userId },
      userIdType: typeof req.user.userId,
      isValidObjectId: Types.ObjectId.isValid(req.user.userId)
    });
    
    // Пробуем найти все записи без фильтра для отладки (только первые 5)
    const allReadingsSample = await TarotReading.find({})
      .limit(5)
      .select('userId telegramId readingType createdAt')
      .lean();
    logger.info('Sample readings from database (first 5)', {
      sampleReadings: allReadingsSample.map((r: any) => ({
        _id: r._id?.toString(),
        userId: r.userId?.toString(),
        userIdType: typeof r.userId,
        userIdValue: r.userId,
        userIdMatches: r.userId?.toString() === req.user.userId?.toString(),
        telegramId: r.telegramId,
        telegramIdType: typeof r.telegramId,
        telegramIdValue: r.telegramId,
        readingType: r.readingType,
        createdAt: r.createdAt
      })),
      requestedUserId: req.user.userId,
      requestedUserIdType: typeof req.user.userId
    });
    
    // Пробуем найти записи по обоим полям
    // Используем $or для поиска по telegramId ИЛИ userId (для старых записей)
    const readingsByTelegramId = await TarotReading.find({ telegramId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();
    
    // Пробуем найти по userId (как строка и как ObjectId)
    // Используем $or для поиска по обоим вариантам одновременно
    let readingsByUserId: any[] = [];
    try {
      // Сначала пробуем как строку
      readingsByUserId = await TarotReading.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean();
      
      logger.info('Readings found by userId (as string)', {
        count: readingsByUserId.length,
        userId: req.user.userId,
        userIdType: typeof req.user.userId
      });
      
      // Если не нашли, пробуем как ObjectId
      if (readingsByUserId.length === 0 && Types.ObjectId.isValid(req.user.userId)) {
        const objectIdReadings = await TarotReading.find({ userId: new Types.ObjectId(req.user.userId) })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string))
          .lean();
        
        logger.info('Readings found by userId (as ObjectId)', {
          count: objectIdReadings.length,
          userId: req.user.userId,
          userIdType: typeof req.user.userId
        });
        
        readingsByUserId = objectIdReadings;
      }
      
      // Если все еще не нашли, пробуем найти через $or с обоими вариантами
      if (readingsByUserId.length === 0) {
        const orQuery: any[] = [{ userId: req.user.userId }];
        if (Types.ObjectId.isValid(req.user.userId)) {
          orQuery.push({ userId: new Types.ObjectId(req.user.userId) });
        }
        
        readingsByUserId = await TarotReading.find({ $or: orQuery })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string))
          .lean();
        
        logger.info('Readings found by userId (using $or)', {
          count: readingsByUserId.length,
          userId: req.user.userId,
          orQuery
        });
      }
    } catch (userIdError) {
      logger.error('Error finding readings by userId', {
        error: userIdError,
        userId: req.user.userId,
        userIdType: typeof req.user.userId,
        errorMessage: userIdError instanceof Error ? userIdError.message : String(userIdError)
      });
    }
    
    // Проверяем записи с правильным userId для диагностики
    let readingsWithCorrectUserId: any[] = [];
    try {
      readingsWithCorrectUserId = await TarotReading.find({ 
        $or: [
          { userId: req.user.userId },
          { userId: Types.ObjectId.isValid(req.user.userId) ? new Types.ObjectId(req.user.userId) : req.user.userId }
        ]
      })
        .select('_id userId telegramId readingType createdAt')
        .limit(10)
        .lean();
    } catch (error) {
      logger.error('Error finding readings for diagnosis', { error, userId: req.user.userId });
    }
    
    logger.info('Readings with correct userId (checking telegramId)', {
      count: readingsWithCorrectUserId.length,
      readings: readingsWithCorrectUserId.map((r: any) => ({
        _id: r._id?.toString(),
        userId: r.userId?.toString(),
        userIdType: typeof r.userId,
        telegramId: r.telegramId,
        telegramIdType: typeof r.telegramId,
        telegramIdMatches: r.telegramId === userId,
        readingType: r.readingType
      }))
    });
    
    // ИСПРАВЛЕНИЕ: Используем записи по userId, если по telegramId ничего не найдено
    // Это нужно для старых записей, которые могли быть сохранены без telegramId
    // Также обновляем старые записи, добавляя telegramId для будущих запросов
    let readings = readingsByTelegramId.length > 0 ? readingsByTelegramId : readingsByUserId;
    
    logger.info('History readings selection', {
      readingsByTelegramIdCount: readingsByTelegramId.length,
      readingsByUserIdCount: readingsByUserId.length,
      finalReadingsCount: readings.length,
      userId: req.user.userId,
      telegramId: userId
    });
    
    // Если нашли записи по userId, но у них нет telegramId, обновляем их
    if (readingsByUserId.length > 0 && readingsByTelegramId.length === 0) {
      logger.info('Found readings by userId without telegramId, updating them', {
        count: readingsByUserId.length,
        userId: req.user.userId,
        telegramId: userId
      });
      
      // Обновляем старые записи, добавляя telegramId
      try {
        // Пробуем обновить как строку
        let updateResult = await TarotReading.updateMany(
          { 
            $or: [
              { userId: req.user.userId },
              { userId: Types.ObjectId.isValid(req.user.userId) ? new Types.ObjectId(req.user.userId) : req.user.userId }
            ],
            telegramId: { $exists: false }
          },
          { $set: { telegramId: userId } }
        );
        
        logger.info('Updated old readings with telegramId', {
          userId: req.user.userId,
          telegramId: userId,
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount
        });
      } catch (updateError) {
        logger.error('Failed to update old readings with telegramId', {
          error: updateError,
          userId: req.user.userId,
          telegramId: userId,
          errorMessage: updateError instanceof Error ? updateError.message : String(updateError)
        });
      }
    }
    
    logger.info('History query result', {
      userId: req.user.userId,
      telegramId: userId,
      readingsFound: readings.length,
      readingsByTelegramIdCount: readingsByTelegramId.length,
      readingsByUserIdCount: readingsByUserId.length,
      totalCount,
      countByUserId,
      query: { telegramId: userId },
      sampleReading: readings.length > 0 ? {
        _id: readings[0]._id,
        userId: readings[0].userId,
        telegramId: readings[0].telegramId,
        readingType: readings[0].readingType
      } : null
    });

    // Преобразуем данные в формат, который ожидает фронтенд
    const transformedReadings = readings.map((reading: any) => {
      // Преобразуем readingType в type
      let type: 'single' | 'three_cards' | 'yes_no';
      if (reading.readingType === 'single') {
        type = 'single';
      } else if (reading.readingType === 'three') {
        type = 'three_cards';
      } else {
        type = 'yes_no';
      }

      // Преобразуем карты в формат для фронтенда
      const transformedCards = reading.cards.map((card: any) => {
        const russianName = getRussianCardName(card.name);
        const imagePath = getCardImagePath(card.name, card.isReversed);
        
        return {
          name: russianName, // Русское название
          imagePath: imagePath,
          meaning: card.interpretation || reading.interpretation || '',
          advice: reading.interpretation || '',
          keywords: '', // Можно добавить позже
          isReversed: card.isReversed,
          position: card.position
        };
      });

      return {
        _id: reading._id.toString(),
        type: type,
        category: 'major', // По умолчанию все карты из списка - старшие арканы
        userQuestion: reading.question || undefined,
        cards: transformedCards,
        interpretation: reading.interpretation,
        clarifyingQuestions: reading.clarifyingQuestions || [],
        createdAt: reading.createdAt
      };
    });

    logger.info('History retrieved', {
      userId,
      count: transformedReadings.length,
      totalReadings: readings.length
    });

    res.json({
      success: true,
      readings: transformedReadings
    });
  } catch (error) {
    logger.error('History error', { error, userId: req.user?.telegramId });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Wallet / token status for frontend
async function handleWalletStatus(req: any, res: any) {
  try {
    const userId = req.user.telegramId;
    const walletInfo = await buildWalletInfoForRequest(req);
    if (!walletInfo) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, walletInfo, tokensBalance: walletInfo.tokensBalance });
  } catch (error) {
    logger.error('Wallet status error', { error, userId: req.user?.telegramId });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

router.get('/wallet-status', handleWalletStatus);
router.get('/subscription-status', handleWalletStatus);

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
      const status = answer.fallback ? 503 : 500;
      return res.status(status).json({
        success: false,
        error: answer.error || 'Failed to get clarifying answer',
        fallback: answer.fallback || false,
      });
    }

    // Выбираем новую случайную карту для уточняющего вопроса
    const cards = [
      'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
      'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
      'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
      'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
      'Judgement', 'The World'
    ];
    
    const newRandomCard = cards[Math.floor(Math.random() * cards.length)];
    const newIsReversed = Math.random() > 0.5;
    const newRussianCardName = getRussianCardName(newRandomCard);
    const newImagePath = getCardImagePath(newRandomCard, newIsReversed);
    
    // Формируем новую карту для ответа
    const newCard = {
      name: newRussianCardName, // Русское название
      category: 'major',
      isReversed: newIsReversed,
      uprightImage: getCardImagePath(newRandomCard, false),
      reversedImage: getCardImagePath(newRandomCard, true),
      image: newImagePath,
      imagePath: newImagePath,
      uprightInterpretation: newIsReversed ? '' : answer.interpretation,
      reversedInterpretation: newIsReversed ? answer.interpretation : ''
    };

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

    logger.info('Clarifying question - new card selected', {
      userId,
      readingType,
      originalCardName: originalCard?.name,
      newCardName: newRussianCardName,
      newCardEnglishName: newRandomCard,
      newIsReversed
    });

    res.json({
      success: true,
      data: {
        answer: answer.interpretation,
        yesNoAnswer: yesNoAnswer,
        card: newCard // Возвращаем новую карту для уточняющего вопроса
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
router.post('/clarifying-answer', handleClarifyingQuestion);

// Диагностика истории — только для admin, отключён в production
router.get('/history-debug', async (req: any, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Route not found' });
  }

  const userId = req.user?.telegramId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminTelegramId || userId.toString() !== adminTelegramId.toString()) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  try {
    const userObjectId = req.user.userId;

    const totalCount = await TarotReading.countDocuments({});
    const countByTelegramId = await TarotReading.countDocuments({ telegramId: userId });
    const countByUserId = await TarotReading.countDocuments({ userId: userObjectId });

    const byTelegramId = await TarotReading.find({ telegramId: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('_id userId telegramId readingType createdAt')
      .lean();

    res.json({
      success: true,
      debug: {
        currentUser: {
          userId: userObjectId,
          telegramId: userId,
        },
        database: {
          totalReadings: totalCount,
          countByTelegramId,
          countByUserId,
        },
        readingsByTelegramId: byTelegramId.map((r: any) => ({
          _id: r._id.toString(),
          userId: r.userId,
          telegramId: r.telegramId,
          readingType: r.readingType,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('History debug error', { error, userId });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
