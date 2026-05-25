import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    telegramId: number;
    username?: string;
  };
  // Для переиспользования уже загруженного пользователя в роутерах (ускорение subscription-status)
  userRecord?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    // Поддерживаем "Bearer <token>" и (на всякий случай) "Bearer<token>"
    const token = authHeader
      ? (authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : authHeader.startsWith('Bearer') ? authHeader.slice('Bearer'.length).trim() : undefined)
      : undefined;

    // Временная диагностика (без утечки полного токена)
    if (process.env.AUTH_DEBUG === 'true') {
      logger.info('Auth debug headers', {
        path: req.path,
        method: req.method,
        hasAuthorizationHeader: !!authHeader,
        authorizationPrefix: authHeader ? authHeader.substring(0, 20) : null,
        headerKeys: Object.keys(req.headers || {}),
      });
    }

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        hasAuthHeader: !!authHeader
      });
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (jwtError) {
      logger.warn('Authentication failed: JWT verification error', {
        path: req.path,
        method: req.method,
        error: jwtError instanceof Error ? jwtError.message : String(jwtError),
        tokenPrefix: token.substring(0, 10) + '...'
      });
      throw jwtError;
    }
    
    // Проверяем, существует ли пользователь
    const user = await User.findOne({ telegramId: decoded.telegramId });
    if (!user) {
      logger.warn('Authentication failed: User not found', {
        path: req.path,
        method: req.method,
        telegramId: decoded.telegramId,
        decodedPayload: { telegramId: decoded.telegramId, username: decoded.username },
        adminTelegramId: process.env.ADMIN_TELEGRAM_ID
      });
      
      // Если пользователь не найден, но это администратор - создаем его автоматически
      const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
      const isAdmin = adminTelegramId && decoded.telegramId.toString() === adminTelegramId.toString();
      
      if (isAdmin) {
        logger.info('Admin user not found, creating automatically', { telegramId: decoded.telegramId });
        try {
          const newUser = await User.create({
            telegramId: decoded.telegramId,
            firstName: decoded.username || 'Admin',
            lastName: '',
            username: decoded.username || '',
            languageCode: 'ru',
            subscriptionStatus: 0,
            tokensBalance: 0,
            freeYesNoUsed: 0,
            freeThreeCardsUsed: 0,
          });
          
          req.user = {
            userId: (newUser._id as any).toString(),
            telegramId: newUser.telegramId,
            username: newUser.username
          };
          
          logger.info('Admin user created successfully', { userId: newUser._id, telegramId: newUser.telegramId });
          return next();
        } catch (createError) {
          logger.error('Failed to create admin user', { error: createError, telegramId: decoded.telegramId });
        }
      }
      
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = {
      userId: (user._id as any).toString(),
      telegramId: user.telegramId,
      username: user.username
    };
    // Сохраняем документ пользователя, чтобы роуты могли избежать повторных запросов к MongoDB
    req.userRecord = user;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Authentication failed: Invalid token', {
        path: req.path,
        method: req.method,
        error: error.message,
        tokenPrefix: req.headers.authorization?.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication failed: Token expired', {
        path: req.path,
        method: req.method,
        expiredAt: error.expiredAt,
        tokenPrefix: req.headers.authorization?.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    logger.error('Authentication error', { 
      error,
      path: req.path,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization
    });

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const generateToken = (telegramId: number, username?: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload = { 
    telegramId,
    username
  };
  
  const options: jwt.SignOptions = { 
    expiresIn: '30d'
  };

  return jwt.sign(payload, jwtSecret, options);
};