/**
 * Unit-тесты для admin login.
 * Маршрут: POST /api/auth/login
 */

import bcrypt from 'bcryptjs';
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../src/routes/auth';

describe('Admin Login', () => {
  let app: Express;
  let realHash: string;

  beforeAll(async () => {
    realHash = await bcrypt.hash('correctPassword123', 10);
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Мокаем env для тестов
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD_HASH = realHash;
    process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
  });

  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.JWT_SECRET;
  });

  describe('bcrypt compare', () => {
    it('bcrypt.compare корректно сравнивает пароль с хешем', async () => {
      const hash = await bcrypt.hash('test123', 10);
      expect(await bcrypt.compare('test123', hash)).toBe(true);
      expect(await bcrypt.compare('wrong', hash)).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('успешный логин — status 200, возвращается JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'correctPassword123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.token.length).toBeGreaterThan(0);
      expect(res.body.data.user).toEqual({ username: 'admin' });
    });

    it('неверный пароль — status 401, Invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongPassword' })
        .expect(401);

      expect(res.body.error).toBe('Invalid credentials');
    });

    it('пустой пароль — status 400, Username and password are required', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '' })
        .expect(400);

      expect(res.body.error).toBe('Username and password are required');
    });

    it('отсутствует password — status 400', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' })
        .expect(400);
    });

    it('неверный username — status 401', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'correctPassword123' })
        .expect(401);
    });
  });

  describe('ADMIN_PASSWORD_HASH отсутствует', () => {
    beforeEach(() => {
      delete process.env.ADMIN_PASSWORD_HASH;
    });

    it('при запросе логина — status 500, Server configuration error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'any' })
        .expect(500);

      expect(res.body.error).toBe('Server configuration error');
    });
  });
});
