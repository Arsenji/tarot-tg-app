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
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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
        decodedPayload: { telegramId: decoded.telegramId, username: decoded.username }
      });
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