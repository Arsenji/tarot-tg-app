import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { checkSubscriptionStatus, updateUserAfterUsage } from '../utils/subscription';
// Middleware для аутентификации
const authenticateToken = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const router = Router();

// Регистрация пользователя при первом заходе
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { telegramId, firstName, lastName, username, languageCode } = req.body;

    if (!telegramId || !firstName) {
      return res.status(400).json({ error: 'TelegramId and firstName are required' });
    }

    // Проверяем, существует ли пользователь
    let user = await User.findOne({ telegramId });
    
    if (user) {
      // Пользователь уже существует, возвращаем его данные
      const subscriptionInfo = checkSubscriptionStatus(user);
      return res.json({
        success: true,
        user: {
          id: user._id,
          telegramId: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          languageCode: user.languageCode
        },
        subscriptionInfo
      });
    }

    // Создаем нового пользователя
    user = new User({
      telegramId,
      firstName,
      lastName: lastName || '',
      username: username || '',
      languageCode: languageCode || 'ru',
      subscriptionStatus: 0,
      freeDailyAdviceUsed: false,
      freeYesNoUsed: false,
      freeThreeCardsUsed: false
    });

    await user.save();

    const subscriptionInfo = checkSubscriptionStatus(user);

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode
      },
      subscriptionInfo
    });

  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Получить статус подписки пользователя
router.get('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionInfo = checkSubscriptionStatus(user);

    res.json({
      success: true,
      subscriptionInfo
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Использование расклада (уменьшение счетчика)
router.post('/:id/use-spread', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { spreadType } = req.body; // 'daily', 'yesno', 'three_cards'

    if (!spreadType || !['daily', 'yesno', 'three_cards'].includes(spreadType)) {
      return res.status(400).json({ error: 'Invalid spread type' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionInfo = checkSubscriptionStatus(user);

    // Проверяем, может ли пользователь использовать этот расклад
    let canUse = false;
    switch (spreadType) {
      case 'daily':
        canUse = subscriptionInfo.canUseDailyAdvice;
        break;
      case 'yesno':
        canUse = subscriptionInfo.canUseYesNo;
        break;
      case 'three_cards':
        canUse = subscriptionInfo.canUseThreeCards;
        break;
    }

    if (!canUse) {
      return res.status(403).json({ 
        error: 'Spread limit reached',
        subscriptionRequired: true,
        subscriptionInfo
      });
    }

    // Обновляем счетчик использования
    await updateUserAfterUsage(user, spreadType);

    // Получаем обновленную информацию о подписке
    const updatedUser = await User.findById(userId);
    const updatedSubscriptionInfo = checkSubscriptionStatus(updatedUser!);

    res.json({
      success: true,
      subscriptionInfo: updatedSubscriptionInfo
    });

  } catch (error) {
    console.error('Use spread error:', error);
    res.status(500).json({ error: 'Failed to update spread usage' });
  }
});

// Активация подписки
router.post('/:id/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { subscriptionExpiry } = req.body;

    if (!subscriptionExpiry) {
      return res.status(400).json({ error: 'Subscription expiry date is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Активируем подписку
    user.subscriptionStatus = 1;
    user.subscriptionExpiry = new Date(subscriptionExpiry);
    user.subscriptionActivatedAt = new Date();

    await user.save();

    const subscriptionInfo = checkSubscriptionStatus(user);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscriptionInfo
    });

  } catch (error) {
    console.error('Activate subscription error:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// Деактивация подписки (для тестирования)
router.post('/:id/unsubscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Деактивируем подписку
    user.subscriptionStatus = 0;
    user.subscriptionExpiry = undefined;
    user.subscriptionActivatedAt = undefined;

    await user.save();

    const subscriptionInfo = checkSubscriptionStatus(user);

    res.json({
      success: true,
      message: 'Subscription deactivated successfully',
      subscriptionInfo
    });

  } catch (error) {
    console.error('Deactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to deactivate subscription' });
  }
});

export default router;
