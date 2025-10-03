import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// POST /auth/login - авторизация
router.post('/login', (req, res) => authController.login(req, res));

// GET /auth/verify - проверка токена
router.get('/verify', authenticateToken, (req, res) => authController.verifyToken(req, res));

export default router;
