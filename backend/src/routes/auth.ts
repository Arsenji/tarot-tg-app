import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

const isTest = process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: 'Too many login attempts, please try again later' },
});

const telegramAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: 'Too many auth requests, please try again later' },
});

// POST /auth/login - авторизация (для админки)
router.post('/login', loginLimiter, (req, res) => authController.login(req, res));

// POST /auth/telegram - авторизация через Telegram WebApp
router.post('/telegram', telegramAuthLimiter, (req, res) => authController.telegramAuth(req, res));

// GET /auth/verify - проверка токена
router.get('/verify', authenticateToken, (req, res) => authController.verifyToken(req, res));

export default router;
