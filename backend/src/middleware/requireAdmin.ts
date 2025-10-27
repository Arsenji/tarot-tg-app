import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Простая проверка админа - можно расширить
  const isAdmin = req.user?.username === 'admin' || req.user?.telegramId === parseInt(process.env.ADMIN_TELEGRAM_ID || '0');
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  next();
};
