const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mock API endpoints for testing
app.post('/api/auth/telegram', (req, res) => {
  res.json({
    token: 'mock-token',
    user: {
      id: 'mock-user-id',
      telegramId: 123456789,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      languageCode: 'ru',
      isPremium: false
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    id: 'mock-user-id',
    telegramId: 123456789,
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    languageCode: 'ru',
    isPremium: false
  });
});

app.post('/api/tarot/single-card', (req, res) => {
  const cards = [
    {
      name: "Дурак",
      imagePath: "/images/rider-waite-tarot/major_arcana_fool.png",
      meaning: "Начало нового пути, спонтанность, невинность",
      advice: "Доверьтесь интуиции и будьте открыты новым возможностям",
      keywords: "Начало, спонтанность, невинность, приключения",
      isMajorArcana: true,
      suit: "Major Arcana",
      number: 0
    },
    {
      name: "Маг",
      imagePath: "/images/rider-waite-tarot/major_arcana_magician.png",
      meaning: "Сила воли, концентрация, мастерство",
      advice: "Используйте свои навыки и ресурсы для достижения целей",
      keywords: "Сила воли, концентрация, мастерство, действие",
      isMajorArcana: true,
      suit: "Major Arcana",
      number: 1
    }
  ];
  
  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  const interpretation = `Сегодня карта "${randomCard.name}" советует вам: ${randomCard.advice}. Это означает: ${randomCard.meaning}. Ключевые слова: ${randomCard.keywords}.`;
  
  res.json({
    card: randomCard,
    interpretation
  });
});

app.post('/api/tarot/three-cards', (req, res) => {
  const { category = 'personal' } = req.body;
  
  const cards = [
    {
      name: "Дурак",
      imagePath: "/images/rider-waite-tarot/major_arcana_fool.png",
      meaning: "Начало нового пути, спонтанность, невинность",
      advice: "Доверьтесь интуиции и будьте открыты новым возможностям",
      keywords: "Начало, спонтанность, невинность, приключения",
      isMajorArcana: true,
      suit: "Major Arcana",
      number: 0,
      position: 'past'
    },
    {
      name: "Маг",
      imagePath: "/images/rider-waite-tarot/major_arcana_magician.png",
      meaning: "Сила воли, концентрация, мастерство",
      advice: "Используйте свои навыки и ресурсы для достижения целей",
      keywords: "Сила воли, концентрация, мастерство, действие",
      isMajorArcana: true,
      suit: "Major Arcana",
      number: 1,
      position: 'present'
    },
    {
      name: "Верховная Жрица",
      imagePath: "/images/rider-waite-tarot/major_arcana_priestess.png",
      meaning: "Интуиция, тайны, внутренняя мудрость",
      advice: "Прислушайтесь к своему внутреннему голосу и интуиции",
      keywords: "Интуиция, тайны, внутренняя мудрость, подсознание",
      isMajorArcana: true,
      suit: "Major Arcana",
      number: 2,
      position: 'future'
    }
  ];
  
  let interpretation = '';
  if (category === 'love') {
    interpretation = 'В любовных отношениях прошлое заложило основу для понимания истинной любви. В настоящем важно сделать выбор сердцем. В будущем вас ждет гармония и счастье в отношениях.';
  } else if (category === 'career') {
    interpretation = 'В карьере прошлая усердная работа создала прочный фундамент. В настоящем сотрудничество и командная работа приведут к успеху. В будущем вас ждет финансовая стабильность и долгосрочный успех.';
  } else {
    interpretation = 'В личном развитии прошлый период внутреннего поиска завершился важными откровениями. В настоящем время исцеления и обновления. В будущем вас ждет просветление и радость.';
  }
  
  res.json({
    cards,
    interpretation,
    category
  });
});

app.get('/api/tarot/history', (req, res) => {
  res.json({ readings: [] });
});

app.get('/api/tarot/cards', (req, res) => {
  res.json({ cards: [] });
});

app.post('/api/payment/create-invoice', (req, res) => {
  const { plan } = req.body;
  const prices = {
    monthly: 299,
    yearly: 2990
  };
  
  res.json({
    invoice: {
      id: `invoice_${Date.now()}`,
      title: plan === 'monthly' ? 'Месячная подписка' : 'Годовая подписка',
      description: plan === 'monthly' ? 'Неограниченные расклады на 1 месяц' : 'Неограниченные расклады на 1 год',
      currency: 'RUB',
      prices: [{
        label: plan === 'monthly' ? 'Месячная подписка' : 'Годовая подписка',
        amount: prices[plan] * 100
      }],
      payload: JSON.stringify({ plan })
    }
  });
});

app.get('/api/payment/premium-status', (req, res) => {
  res.json({
    isPremium: false,
    expiresAt: null
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});
