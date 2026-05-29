/**
 * Unit tests for OpenAI service.
 * Mocks the OpenAI SDK to test health check logic and fallback behavior.
 */

// Mock OpenAI before importing the service
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: { readyState: 0 },
}));

// Mock TarotReading model
jest.mock('../src/models/TarotReading', () => ({
  TarotReading: {},
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('OpenAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.OPENAI_API_KEY = 'test-key-123';
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
  });

  describe('checkGptConnection', () => {
    it('returns true and sets gptAvailable on successful ping', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'pong' } }],
      });

      // Re-import to get fresh instance
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');
      
      const result = await openAIService.checkGptConnection();

      expect(result).toBe(true);
      expect(openAIService.gptAvailable).toBe(true);
      expect(openAIService.lastCheckAt).toBeInstanceOf(Date);
    });

    it('returns false and sets gptAvailable=false on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API timeout'));

      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      const result = await openAIService.checkGptConnection();

      expect(result).toBe(false);
      expect(openAIService.gptAvailable).toBe(false);
    });

    it('returns false when not configured (no API key)', async () => {
      delete process.env.OPENAI_API_KEY;
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      const result = await openAIService.checkGptConnection();

      expect(result).toBe(false);
      expect(openAIService.gptAvailable).toBe(false);
    });
  });

  describe('getCardInterpretation', () => {
    it('returns fallback when GPT is unavailable', async () => {
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      const result = await openAIService.getCardInterpretation({
        cardName: 'Шут',
        position: 'daily',
        isReversed: false,
      });

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('returns interpretation on success', async () => {
      mockCreate
        .mockResolvedValueOnce({ choices: [{ message: { content: 'ok' } }] })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Сегодня Шут дарит тебе новые возможности...' } }],
        });

      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      // First call: health check ping
      await openAIService.checkGptConnection();
      expect(openAIService.gptAvailable).toBe(true);

      const result = await openAIService.getCardInterpretation({
        cardName: 'Шут',
        position: 'daily',
        isReversed: false,
      });

      expect(result.success).toBe(true);
      expect(result.interpretation).toContain('Шут');
      expect(result.fallback).toBeUndefined();
    });

    it('marks GPT unavailable on API error during interpretation', async () => {
      mockCreate
        .mockResolvedValueOnce({ choices: [{ message: { content: 'ok' } }] })
        .mockRejectedValueOnce(new Error('Rate limit exceeded'));

      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      await openAIService.checkGptConnection();
      expect(openAIService.gptAvailable).toBe(true);

      const result = await openAIService.getCardInterpretation({
        cardName: 'Маг',
        position: 'daily',
        isReversed: true,
      });

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(openAIService.gptAvailable).toBe(false);
    });
  });

  describe('getReadingInterpretation', () => {
    it('returns fallback when GPT is unavailable', async () => {
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      const result = await openAIService.getReadingInterpretation({
        cards: [{ name: 'The Fool', position: 'past', isReversed: false }],
        readingType: 'three',
      });

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
    });
  });

  describe('getClarifyingAnswer', () => {
    it('returns fallback when GPT is unavailable', async () => {
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      const result = await openAIService.getClarifyingAnswer(
        'Как мне улучшить ситуацию?',
        'Будет ли мне везти?',
        { name: 'Шут' },
        'Шут говорит о новых начинаниях...',
        'yesno'
      );

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('returns false when not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      expect(await openAIService.isAvailable()).toBe(false);
    });

    it('returns false when configured but GPT check not done', async () => {
      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      expect(await openAIService.isAvailable()).toBe(false);
    });

    it('returns true after successful GPT check', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'ok' } }],
      });

      jest.resetModules();
      const { openAIService } = await import('../src/services/openai');

      await openAIService.checkGptConnection();
      expect(await openAIService.isAvailable()).toBe(true);
    });
  });
});
