import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { LoginRequest, AuthResponse } from '../types';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password }: LoginRequest = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      // Проверяем учетные данные
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      if (username !== adminUsername) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, await bcrypt.hash(adminPassword, 10));

      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Генерируем JWT токен
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      const token = jwt.sign(
        { username, role: 'admin' },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );

      const response: AuthResponse = {
        token,
        user: { username }
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      // Если middleware auth прошел успешно, токен валиден
      res.json({
        success: true,
        data: { valid: true }
      });
    } catch (error) {
      console.error('Error verifying token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async telegramAuth(req: Request, res: Response): Promise<void> {
    try {
      const { initData } = req.body;

      if (!initData) {
        res.status(400).json({ error: 'Telegram initData is required' });
        return;
      }

      // Проверяем подпись Telegram WebApp
      const isValidTelegramData = this.verifyTelegramAuthData(initData);
      
      if (!isValidTelegramData) {
        res.status(401).json({ error: 'Invalid Telegram WebApp data' });
        return;
      }

      // Извлекаем данные пользователя из initData
      const params = new URLSearchParams(initData);
      const userJson = params.get('user');
      
      if (!userJson) {
        res.status(400).json({ error: 'User data not found in initData' });
        return;
      }

      const telegramUser = JSON.parse(userJson);
      const userId = telegramUser.id;

      // Генерируем JWT токен для пользователя
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      const token = jwt.sign(
        { 
          userId: userId,
          telegramId: userId,
          username: telegramUser.username || telegramUser.first_name,
          role: 'user'
        },
        jwtSecret,
        { expiresIn: '30d' } as jwt.SignOptions
      );

      const response = {
        token,
        user: {
          id: userId,
          username: telegramUser.username || telegramUser.first_name,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name
        },
        expires: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 дней
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error during Telegram auth:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private verifyTelegramAuthData(initData: string): boolean {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      
      if (!hash) {
        return false;
      }

      // Удаляем hash из параметров для проверки подписи
      params.delete('hash');
      
      // Сортируем параметры
      const dataCheckString = Array.from(params.keys())
        .sort()
        .map(key => `${key}=${params.get(key)}`)
        .join('\n');

      // Получаем секретный ключ бота
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
        return false;
      }

      // Создаем секретный ключ из токена бота
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // Проверяем подпись
      const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      return computedHash === hash;
    } catch (error) {
      console.error('Error verifying Telegram auth data:', error);
      return false;
    }
  }
}
