import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

// Telegram WebApp authentication
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Init data is required' });
    }

    // In production, you should validate the initData signature
    // For now, we'll parse it directly
    const urlParams = new URLSearchParams(initData);
    const userData = JSON.parse(urlParams.get('user') || '{}');
    
    // Allow test user for development
    if (!userData.id && !initData.includes('test_hash')) {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    // Find or create user
    let user = await User.findOne({ telegramId: userData.id });
    
    if (!user) {
      user = new User({
        telegramId: userData.id,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        username: userData.username || '',
        languageCode: userData.language_code || 'ru',
        isPremium: false
      });
      await user.save();
    } else {
      // Update user data
      user.firstName = userData.first_name || user.firstName;
      user.lastName = userData.last_name || user.lastName;
      user.username = userData.username || user.username;
      user.languageCode = userData.language_code || user.languageCode;
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, telegramId: user.telegramId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt
      }
    });

  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      languageCode: user.languageCode,
      isPremium: user.isPremium,
      premiumExpiresAt: user.premiumExpiresAt
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
