import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { TarotReading } from '../models/TarotReading';
import { allCards, getRandomCard, getCardsByCategory } from '../data/tarotCards';
import { checkSubscriptionStatus, updateUserAfterUsage, getRestrictionMessage } from '../utils/subscription';
import { getRiderWaiteImagePath } from '../utils/cardImages';
import { OpenAIService } from '../services/openai';
import { enrichCardWithDetailedDescription, getCardDescriptionByName } from '../utils/cardEnrichment';

const router = Router();

// Middleware to verify JWT token
const authenticateToken = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get single card reading (advice of the day)
router.post('/single-card', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем статус подписки
    const subscriptionInfo = checkSubscriptionStatus(user);
    
    if (!subscriptionInfo.canUseDailyAdvice) {
      return res.status(403).json({ 
        error: getRestrictionMessage('daily', subscriptionInfo),
        subscriptionRequired: true,
        subscriptionInfo
      });
    }

    const card = getRandomCard();
    console.log(`Single card reading - Selected card: ${card.name}`);
    
    // Получаем совет от OpenAI для карты дня
    let aiAdvice;
    try {
      console.log(`Calling OpenAI API for daily advice, card: ${card.name}`);
      aiAdvice = await OpenAIService.generateDailyAdvice({
        card: card
      });
      console.log(`OpenAI API response: ${aiAdvice.advice}`);
    } catch (error) {
      console.error('OpenAI daily advice failed, using fallback:', error);
      // Fallback к простой интерпретации
      aiAdvice = {
        advice: `Сегодня карта "${card.name}" советует вам: ${card.advice}. Это означает: ${card.meaning}. Ключевые слова: ${card.keywords}.`
      };
      console.log(`Using fallback advice: ${aiAdvice.advice}`);
    }

    const interpretation = aiAdvice.advice;

    // Обновляем статус пользователя
    await updateUserAfterUsage(user, 'daily');

    // Save reading to history
    const enrichedCard = enrichCardWithDetailedDescription(card);
    const reading = new TarotReading({
      userId: user._id,
      type: 'single',
      cards: [{
        name: enrichedCard.name,
        meaning: enrichedCard.meaning,
        advice: enrichedCard.advice,
        keywords: enrichedCard.keywords,
        imagePath: enrichedCard.imagePath,
        detailedDescription: enrichedCard.detailedDescription
      }],
      interpretation
    });
    await reading.save();

    res.json({
      card: {
        name: enrichedCard.name,
        imagePath: enrichedCard.imagePath,
        meaning: enrichedCard.meaning,
        advice: enrichedCard.advice,
        keywords: enrichedCard.keywords,
        isMajorArcana: enrichedCard.isMajorArcana,
        suit: enrichedCard.suit,
        number: enrichedCard.number,
        detailedDescription: enrichedCard.detailedDescription
      },
      interpretation,
      subscriptionInfo: {
        hasSubscription: subscriptionInfo.hasSubscription,
        canUseDailyAdvice: subscriptionInfo.canUseDailyAdvice
      }
    });

  } catch (error) {
    console.error('Single card reading error:', error);
    res.status(500).json({ error: 'Failed to get card reading' });
  }
});

// Get daily advice (alias for single-card for frontend compatibility)
router.post('/daily-advice', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем статус подписки
    console.log('=== DAILY ADVICE - Checking subscription status ===');
    console.log('User before check:', {
      _id: user._id,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiry: user.subscriptionExpiry,
      freeDailyAdviceUsed: user.freeDailyAdviceUsed
    });
    
    const subscriptionInfo = checkSubscriptionStatus(user);
    console.log('Subscription info:', subscriptionInfo);
    
    if (!subscriptionInfo.canUseDailyAdvice) {
      return res.status(403).json({ 
        error: getRestrictionMessage('daily', subscriptionInfo),
        subscriptionRequired: true,
        subscriptionInfo
      });
    }

    const card = getRandomCard();
    console.log(`Daily advice - Selected card: ${card.name}`);
    console.log('Card details:', {
      name: card.name,
      meaning: card.meaning,
      advice: card.advice,
      keywords: card.keywords
    });
    
    // Получаем совет от OpenAI для карты дня
    let aiAdvice;
    try {
      console.log(`Calling OpenAI API for daily advice, card: ${card.name}`);
      aiAdvice = await OpenAIService.generateDailyAdvice({
        card: card
      });
      console.log(`OpenAI API response: ${aiAdvice.advice}`);
    } catch (error) {
      console.error('OpenAI daily advice failed, using fallback:', error);
      // Fallback к простой интерпретации
      aiAdvice = {
        advice: `Сегодня карта "${card.name}" советует вам: ${card.advice}. Это означает: ${card.meaning}. Ключевые слова: ${card.keywords}.`
      };
      console.log(`Using fallback advice: ${aiAdvice.advice}`);
    }

    const interpretation = aiAdvice.advice;

    // Save reading to history
    const enrichedCard = enrichCardWithDetailedDescription(card);
    console.log('Enriched card before saving:', {
      name: enrichedCard.name,
      meaning: enrichedCard.meaning,
      advice: enrichedCard.advice,
      keywords: enrichedCard.keywords
    });
    
    const reading = new TarotReading({
      userId: user._id,
      type: 'single',
      cards: [{
        name: enrichedCard.name,
        meaning: enrichedCard.meaning,
        advice: enrichedCard.advice,
        keywords: enrichedCard.keywords,
        imagePath: enrichedCard.imagePath,
        detailedDescription: enrichedCard.detailedDescription
      }],
      interpretation
    });
    await reading.save();

    // Обновляем счетчик использования для бесплатных пользователей
    console.log('=== DAILY ADVICE - Before updateUserAfterUsage ===');
    console.log('User before update:', {
      _id: user._id,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiry: user.subscriptionExpiry,
      freeDailyAdviceUsed: user.freeDailyAdviceUsed
    });
    
    await updateUserAfterUsage(user, 'daily');
    
    console.log('=== DAILY ADVICE - After updateUserAfterUsage ===');
    console.log('User after update:', {
      _id: user._id,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiry: user.subscriptionExpiry,
      freeDailyAdviceUsed: user.freeDailyAdviceUsed
    });

    // Возвращаем данные в формате, ожидаемом фронтендом
    const finalSubscriptionInfo = checkSubscriptionStatus(user);
    console.log('Final subscription info:', finalSubscriptionInfo);
    
    res.json({
      advice: interpretation,
      card: {
        name: enrichedCard.name,
        image: enrichedCard.imagePath,
        keywords: enrichedCard.keywords,
        advice: enrichedCard.advice,
        meaning: enrichedCard.meaning,
        isMajorArcana: enrichedCard.isMajorArcana,
        suit: enrichedCard.suit,
        number: enrichedCard.number
      },
      subscriptionInfo: finalSubscriptionInfo // Возвращаем обновленную инфу о подписке
    });

  } catch (error) {
    console.error('Daily advice error:', error);
    res.status(500).json({ error: 'Failed to get daily advice' });
  }
});

// Get three cards reading
router.post('/three-cards', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { category, userQuestion, clarifyingQuestions } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем статус подписки
    const subscriptionInfo = checkSubscriptionStatus(user);
    
    if (!subscriptionInfo.canUseThreeCards) {
      return res.status(403).json({ 
        error: getRestrictionMessage('three_cards', subscriptionInfo),
        subscriptionRequired: true,
        subscriptionInfo
      });
    }

    const availableCards = category ? getCardsByCategory(category) : allCards;
    
    // Select three random cards
    const selectedCards = [];
    const usedIndices = new Set();
    
    while (selectedCards.length < 3) {
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedCards.push(availableCards[randomIndex]);
      }
    }

    const positions = ['past', 'present', 'future'];
    const cards = selectedCards.map((card, index) => {
      const enrichedCard = enrichCardWithDetailedDescription(card, category);
      return {
        name: enrichedCard.name,
        position: positions[index],
        meaning: enrichedCard.meaning,
        advice: enrichedCard.advice,
        keywords: enrichedCard.keywords,
        image: enrichedCard.imagePath, // Исправляем: используем image вместо imagePath
        isMajorArcana: enrichedCard.isMajorArcana,
        suit: enrichedCard.suit,
        number: enrichedCard.number,
        detailedDescription: enrichedCard.detailedDescription
      };
    });

    // Generate interpretation using OpenAI
    let interpretation = '';
    try {
      const openaiRequest = {
        cards: cards.map(card => ({
          name: card.name,
          meaning: card.meaning,
          advice: card.advice,
          keywords: card.keywords,
          position: card.position
        })),
        category: category || 'personal',
        userQuestion: userQuestion || undefined
      };
      
      const openaiResponse = await OpenAIService.interpretThreeCards(openaiRequest);
      interpretation = openaiResponse.interpretation;
    } catch (error) {
      console.error('OpenAI interpretation error:', error);
      // Fallback to basic interpretation
      if (category === 'love') {
        interpretation = `В любовных отношениях прошлое заложило основу для понимания истинной любви. В настоящем важно сделать выбор сердцем. В будущем вас ждет гармония и счастье в отношениях.`;
      } else if (category === 'career') {
        interpretation = `В карьере прошлая усердная работа создала прочный фундамент. В настоящем сотрудничество и командная работа приведут к успеху. В будущем вас ждет финансовая стабильность и долгосрочный успех.`;
      } else {
        interpretation = `В личном развитии прошлый период внутреннего поиска завершился важными откровениями. В настоящем время исцеления и обновления. В будущем вас ждет просветление и радость.`;
      }
    }

    // Save reading to history with additional data
    const reading = new TarotReading({
      userId: user._id,
      type: 'three_cards',
      category: category || 'personal',
      userQuestion: userQuestion || null,
      clarifyingQuestions: clarifyingQuestions || [],
      cards,
      interpretation
    });
    await reading.save();

    // Обновляем счетчик использования для бесплатных пользователей
    await updateUserAfterUsage(user, 'three_cards');

    res.json({
      readingId: reading._id,
      cards,
      interpretation,
      category: category || 'personal',
      subscriptionInfo: {
        hasSubscription: subscriptionInfo.hasSubscription,
        canUseThreeCards: subscriptionInfo.canUseThreeCards
      }
    });

  } catch (error) {
    console.error('Three cards reading error:', error);
    res.status(500).json({ error: 'Failed to get three cards reading' });
  }
});

// Get Yes/No card reading
router.post('/yes-no', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { question } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем статус подписки
    const subscriptionInfo = checkSubscriptionStatus(user);
    
    if (!subscriptionInfo.canUseYesNo) {
      return res.status(403).json({ 
        error: getRestrictionMessage('yesno', subscriptionInfo),
        subscriptionRequired: true,
        subscriptionInfo
      });
    }

    const card = getRandomCard();
    console.log(`Yes/No reading - Selected card: ${card.name}`);
    
    // Получаем анализ от OpenAI для вопроса Да/Нет
    let aiAnalysis;
    try {
      aiAnalysis = await OpenAIService.analyzeYesNoQuestion({
        question: question || 'Да/Нет',
        card: card
      });
    } catch (error) {
      console.error('OpenAI Yes/No analysis failed, using fallback:', error);
      // Fallback к простой логике
      const isYesCard = card.isMajorArcana && 
        ['Шут', 'Маг', 'Императрица', 'Император', 'Иерофант', 'Влюблённые', 'Колесница', 'Сила', 'Колесо Фортуны', 'Солнце', 'Мир'].includes(card.name);
      
      aiAnalysis = {
        answer: isYesCard ? 'ДА' : 'НЕТ',
        interpretation: `На ваш вопрос "${question || 'Да/Нет'}" карта "${card.name}" отвечает: ${isYesCard ? 'ДА' : 'НЕТ'}. ${card.meaning}. Совет: ${card.advice}`
      };
    }

    const answer = aiAnalysis.answer;
    const interpretation = aiAnalysis.interpretation;

    // Обновляем статус пользователя
    await updateUserAfterUsage(user, 'yesno');

    // Save reading to history
    const reading = new TarotReading({
      userId: user._id,
      type: 'yes_no',
      userQuestion: question || null,
      clarifyingQuestions: [], // Инициализируем пустым массивом
      cards: [{
        name: card.name,
        meaning: card.meaning,
        advice: card.advice,
        keywords: card.keywords,
        imagePath: card.imagePath
      }],
      interpretation
    });
    await reading.save();

    // Обновляем счетчик использования для бесплатных пользователей
    await updateUserAfterUsage(user, 'yesno');

    res.json({
      readingId: reading._id,
      card: {
        name: card.name,
        imagePath: card.imagePath,
        meaning: card.meaning,
        advice: card.advice,
        keywords: card.keywords,
        isMajorArcana: card.isMajorArcana,
        suit: card.suit,
        number: card.number
      },
      answer,
      interpretation,
      question: question || 'Да/Нет',
      subscriptionInfo: {
        hasSubscription: subscriptionInfo.hasSubscription,
        canUseYesNo: subscriptionInfo.canUseYesNo
      }
    });

  } catch (error) {
    console.error('Yes/No reading error:', error);
    res.status(500).json({ error: 'Failed to get Yes/No reading' });
  }
});

// Save clarifying question for Yes/No reading
router.post('/yes-no/clarifying', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { readingId, question, card } = req.body;
    
    if (!readingId || !question || !card) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const reading = await TarotReading.findOne({ 
      _id: readingId, 
      userId: req.user.userId,
      type: 'yes_no'
    });

    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    // Получаем интерпретацию от OpenAI
    let aiInterpretation = `Уточняющий вопрос: ${question}. Карта "${card.name}" советует: ${card.advice}`;
    try {
      const aiResponse = await OpenAIService.interpretClarifyingQuestion({
        clarifyingQuestion: question,
        originalQuestion: reading.userQuestion || 'Да/Нет вопрос',
        originalCards: reading.cards.map(card => ({
          name: card.name,
          meaning: card.meaning,
          advice: card.advice,
          keywords: card.keywords,
          imagePath: card.imagePath || "/images/rider-waite-tarot/major_arcana_fool.png",
          isMajorArcana: true,
          suit: "Major Arcana",
          number: 0
        })),
        clarifyingCard: {
          name: card.name,
          meaning: card.meaning,
          advice: card.advice,
          keywords: card.keywords,
          imagePath: card.imagePath || "/images/rider-waite-tarot/major_arcana_fool.png",
          isMajorArcana: true,
          suit: "Major Arcana",
          number: 0
        }
      });
      aiInterpretation = aiResponse.interpretation;
    } catch (aiError) {
      console.error('OpenAI clarifying question failed:', aiError);
      // Используем fallback интерпретацию
    }

    // Добавляем уточняющий вопрос
    if (!reading.clarifyingQuestions) {
      reading.clarifyingQuestions = [];
    }
    
    reading.clarifyingQuestions.push({
      question,
      card: {
        name: card.name,
        meaning: card.meaning,
        advice: card.advice,
        keywords: card.keywords,
        imagePath: card.imagePath
      },
      interpretation: aiInterpretation,
      timestamp: new Date()
    });

    await reading.save();

    res.json({
      success: true,
      clarifyingQuestions: reading.clarifyingQuestions
    });

  } catch (error) {
    console.error('Save clarifying question error:', error);
    res.status(500).json({ error: 'Failed to save clarifying question' });
  }
});

// Get all available cards (for premium users)
router.get('/cards', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has premium access
    if (!user.isPremium) {
      return res.status(403).json({ error: 'Premium access required' });
    }

    res.json({ cards: allCards });

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to get cards' });
  }
});

// Save clarifying question
router.post('/clarifying-question', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { readingId, question, card, interpretation } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const reading = await TarotReading.findById(readingId);
    if (!reading || reading.userId.toString() !== user?._id?.toString()) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    // Проверяем подписку для использования OpenAI
    const subscriptionInfo = checkSubscriptionStatus(user);
    // Убираем ограничение - уточняющие вопросы доступны всем пользователям
    // if (!subscriptionInfo.hasSubscription) {
    //   return res.status(403).json({ 
    //     error: 'OpenAI интерпретация доступна только для подписчиков',
    //     subscriptionRequired: true
    //   });
    // }

    // Получаем интерпретацию от OpenAI для уточняющего вопроса
    let aiInterpretation = interpretation;
    try {
      const aiResponse = await OpenAIService.interpretClarifyingQuestion({
        clarifyingQuestion: question,
        originalQuestion: reading.userQuestion || 'Общий вопрос',
        originalCards: reading.cards.map(card => ({
          name: card.name,
          meaning: card.meaning,
          advice: card.advice,
          keywords: card.keywords,
          imagePath: card.imagePath || "/images/rider-waite-tarot/major_arcana_fool.png",
          isMajorArcana: true, // Предполагаем, что все карты из базы - старшие арканы
          suit: "Major Arcana",
          number: 0
        })),
        clarifyingCard: {
          name: card.name,
          meaning: card.meaning,
          advice: card.advice,
          keywords: card.keywords,
          imagePath: card.imagePath || "/images/rider-waite-tarot/major_arcana_fool.png",
          isMajorArcana: true,
          suit: "Major Arcana",
          number: 0
        }
      });
      aiInterpretation = aiResponse.interpretation;
    } catch (aiError) {
      console.error('OpenAI clarifying question failed:', aiError);
      // Используем fallback интерпретацию
    }

    // Добавляем уточняющий вопрос
    if (!reading.clarifyingQuestions) {
      reading.clarifyingQuestions = [];
    }
    
    reading.clarifyingQuestions.push({
      question,
      card: {
        name: card.name,
        meaning: card.meaning,
        advice: card.advice,
        keywords: card.keywords,
        imagePath: card.imagePath
      },
      interpretation: aiInterpretation,
      timestamp: new Date()
    });

    await reading.save();

    res.json({
      success: true,
      clarifyingQuestions: reading.clarifyingQuestions
    });

  } catch (error) {
    console.error('Save clarifying question error:', error);
    res.status(500).json({ error: 'Failed to save clarifying question' });
  }
});

// Get interpretation from OpenAI
router.post('/interpret', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { question, cards } = req.body;
    
    if (!question || !cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Question and cards are required' });
    }

    // Проверяем, что у пользователя есть подписка для использования OpenAI
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionInfo = checkSubscriptionStatus(user);
    if (!subscriptionInfo.hasSubscription) {
      return res.status(403).json({ 
        error: 'OpenAI интерпретация доступна только для подписчиков',
        subscriptionRequired: true
      });
    }

    // Получаем интерпретацию от OpenAI
    const interpretation = await OpenAIService.interpretReading({
      question,
      cards
    });

    res.json({
      interpretation: interpretation.interpretation
    });

  } catch (error) {
    console.error('Interpretation error:', error);
    res.status(500).json({ error: 'Failed to get interpretation' });
  }
});

router.get('/subscription-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionInfo = checkSubscriptionStatus(user);

    res.json({
      subscriptionInfo: {
        hasSubscription: subscriptionInfo.hasSubscription,
        isExpired: subscriptionInfo.isExpired,
        canUseYesNo: subscriptionInfo.canUseYesNo,
        canUseThreeCards: subscriptionInfo.canUseThreeCards,
        canUseDailyAdvice: subscriptionInfo.canUseDailyAdvice,
        historyLimit: subscriptionInfo.historyLimit,
        remainingDailyAdvice: subscriptionInfo.remainingDailyAdvice,
        remainingYesNo: subscriptionInfo.remainingYesNo,
        remainingThreeCards: subscriptionInfo.remainingThreeCards
      },
      user: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry,
        freeYesNoUsed: user.freeYesNoUsed,
        lastDailyAdviceDate: user.lastDailyAdviceDate
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Get user's reading history
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Получаем информацию о подписке для определения лимита
    const subscriptionInfo = checkSubscriptionStatus(user);

    // Если у пользователя нет подписки, история недоступна
    if (!subscriptionInfo.hasSubscription) {
      return res.status(403).json({ 
        error: 'История доступна только по подписке. Оформите её прямо сейчас!',
        subscriptionRequired: true,
        subscriptionInfo
      });
    }

    // Get user's readings, sorted by creation date (newest first)
    const readings = await TarotReading.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(subscriptionInfo.historyLimit);

    console.log('Found readings:', readings.length);
    if (readings.length > 0) {
      console.log('First reading:', JSON.stringify(readings[0], null, 2));
    }

    // Transform readings to match frontend expectations
    const transformedReadings = readings.map(reading => ({
      _id: (reading._id as any).toString(),
      type: reading.type,
      category: reading.category,
      userQuestion: reading.userQuestion,
      cards: reading.cards.map(card => {
        const imagePath = getRiderWaiteImagePath(card.name);
        console.log(`Card: "${card.name}" -> ImagePath: "${imagePath}"`);
        return {
          name: card.name,
          imagePath: imagePath,
          meaning: card.meaning,
          advice: card.advice,
          keywords: card.keywords,
          detailedDescription: card.detailedDescription
        };
      }),
      interpretation: reading.interpretation,
      clarifyingQuestions: reading.clarifyingQuestions || [],
      createdAt: reading.createdAt
    }));

    res.json({
      readings: transformedReadings,
      total: transformedReadings.length,
      subscriptionInfo: {
        hasSubscription: subscriptionInfo.hasSubscription,
        isExpired: subscriptionInfo.isExpired,
        canUseYesNo: subscriptionInfo.canUseYesNo,
        canUseThreeCards: subscriptionInfo.canUseThreeCards,
        canUseDailyAdvice: subscriptionInfo.canUseDailyAdvice,
        historyLimit: subscriptionInfo.historyLimit,
        freeDailyAdviceUsed: subscriptionInfo.freeDailyAdviceUsed,
        freeYesNoUsed: subscriptionInfo.freeYesNoUsed,
        freeThreeCardsUsed: subscriptionInfo.freeThreeCardsUsed,
        remainingDailyAdvice: subscriptionInfo.remainingDailyAdvice,
        remainingYesNo: subscriptionInfo.remainingYesNo,
        remainingThreeCards: subscriptionInfo.remainingThreeCards
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get reading history' });
  }
});

// Эндпоинт для получения ответа на уточняющий вопрос
router.post('/clarifying-answer', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { question, card, interpretation, category, readingId } = req.body;

    if (!question || !card) {
      return res.status(400).json({ error: 'Question and card are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Генерируем новую карту для уточняющего вопроса
    const clarifyingCard = getRandomCard();
    console.log(`Clarifying question - Selected card: ${clarifyingCard.name}`);

    // Генерируем ответ через OpenAI
    let answer = '';
    try {
      // Используем специальную функцию для Да/Нет уточняющих вопросов
      if (category === 'yesno') {
        const aiResponse = await OpenAIService.interpretYesNoClarifyingQuestion({
          clarifyingQuestion: question,
          originalQuestion: 'Общий вопрос',
          originalCards: [{
            name: card.name,
            meaning: card.meaning,
            advice: card.advice,
            keywords: card.keywords,
            isMajorArcana: card.isMajorArcana || false,
            suit: card.suit || '',
            number: card.number || 0
          }],
          clarifyingCard: {
            name: clarifyingCard.name,
            meaning: clarifyingCard.meaning,
            advice: clarifyingCard.advice,
            keywords: clarifyingCard.keywords,
            isMajorArcana: clarifyingCard.isMajorArcana || false,
            suit: clarifyingCard.suit || '',
            number: clarifyingCard.number || 0
          }
        });
        answer = aiResponse.interpretation;
        console.log('Yes/No clarifying answer from OpenAI:', answer);
      } else {
        // Для других категорий используем обычную функцию
        const aiResponse = await OpenAIService.interpretClarifyingQuestion({
          clarifyingQuestion: question,
          originalQuestion: 'Общий вопрос',
          originalCards: [{
            name: card.name,
            meaning: card.meaning,
            advice: card.advice,
            keywords: card.keywords,
            isMajorArcana: card.isMajorArcana || false,
            suit: card.suit || '',
            number: card.number || 0
          }],
          clarifyingCard: {
            name: clarifyingCard.name,
            meaning: clarifyingCard.meaning,
            advice: clarifyingCard.advice,
            keywords: clarifyingCard.keywords,
            isMajorArcana: clarifyingCard.isMajorArcana || false,
            suit: clarifyingCard.suit || '',
            number: clarifyingCard.number || 0
          }
        });
        answer = aiResponse.interpretation;
        console.log('Regular clarifying answer from OpenAI:', answer);
      }
    } catch (error) {
      console.error('OpenAI clarifying question error:', error);
      // Fallback ответ
      answer = `Карта "${clarifyingCard.name}" отвечает на ваш вопрос: ${clarifyingCard.meaning}. Совет: ${clarifyingCard.advice}`;
    }

    // Сохраняем уточняющий вопрос в базу данных, если передан readingId
    if (readingId) {
      try {
        const reading = await TarotReading.findById(readingId);
        if (reading) {
          const clarifyingQuestion = {
            question: question,
            card: {
              name: clarifyingCard.name,
              meaning: clarifyingCard.meaning || '',
              advice: clarifyingCard.advice || '',
              keywords: clarifyingCard.keywords || '',
              imagePath: clarifyingCard.imagePath
            },
            interpretation: answer,
            timestamp: new Date()
          };
          
          reading.clarifyingQuestions = reading.clarifyingQuestions || [];
          reading.clarifyingQuestions.push(clarifyingQuestion);
          await reading.save();
          
          console.log('Clarifying question saved to reading:', readingId);
        } else {
          console.log('Reading not found:', readingId);
        }
      } catch (error) {
        console.error('Error saving clarifying question:', error);
        // Не прерываем выполнение, если не удалось сохранить
      }
    }

    console.log('Final answer before sending:', answer);
    console.log('Answer length:', answer.length);
    console.log('Answer type:', typeof answer);
    
    res.json({
      success: true,
      data: {
        answer: answer,
        card: {
          name: clarifyingCard.name,
          meaning: clarifyingCard.meaning,
          advice: clarifyingCard.advice,
          keywords: clarifyingCard.keywords,
          imagePath: clarifyingCard.imagePath,
          isMajorArcana: clarifyingCard.isMajorArcana,
          suit: clarifyingCard.suit,
          number: clarifyingCard.number
        }
      }
    });

  } catch (error) {
    console.error('Clarifying answer error:', error);
    res.status(500).json({ error: 'Failed to get clarifying answer' });
  }
});

// Получение подробного описания карты для категории
router.post('/card-details', authenticateToken, async (req, res) => {
  try {
    const { cardName, category } = req.body;

    if (!cardName || !category) {
      return res.status(400).json({ error: 'Card name and category are required' });
    }

    // Получаем подробное описание карты для категории
    const detailedDescription = getCardDescriptionByName(cardName, category);

    res.json({
      success: true,
      data: {
        description: detailedDescription
      }
    });
  } catch (error) {
    console.error('Error getting card details:', error);
    res.status(500).json({ error: 'Failed to get card details' });
  }
});

export default router;
