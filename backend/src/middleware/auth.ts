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

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Проверяем, существует ли пользователь
    const user = await User.findOne({ telegramId: decoded.telegramId });
    if (!user) {
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
    logger.error('Authentication error', { error });
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

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