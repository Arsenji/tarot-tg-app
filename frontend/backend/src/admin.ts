import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taro-app');

// Модели
const User = mongoose.model('User', new mongoose.Schema({
  telegramId: Number,
  firstName: String,
  lastName: String,
  username: String,
  subscriptionStatus: Number,
  subscriptionExpiry: Date,
  subscriptionActivatedAt: Date,
  freeYesNoUsed: Boolean,
  lastDailyAdviceDate: Date,
  createdAt: Date,
  updatedAt: Date
}));

const TarotReading = mongoose.model('TarotReading', new mongoose.Schema({
  userId: String,
  type: String,
  category: String,
  cards: Array,
  interpretation: String,
  createdAt: Date
}));

// Новые модели для отзывов и поддержки
const SupportMessage = mongoose.model('SupportMessage', new mongoose.Schema({
  userId: String,
  telegramId: Number,
  userName: String,
  userUsername: String,
  message: String,
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new' },
  adminResponse: String,
  createdAt: Date,
  updatedAt: Date
}));

const Review = mongoose.model('Review', new mongoose.Schema({
  userId: String,
  telegramId: Number,
  userName: String,
  userUsername: String,
  review: String,
  rating: Number,
  status: { type: String, enum: ['new', 'published', 'hidden'], default: 'new' },
  adminResponse: String,
  createdAt: Date,
  updatedAt: Date
}));

// Middleware для простой авторизации
const adminAuth = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey === process.env.ADMIN_KEY || adminKey === 'admin123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Статистика пользователей
app.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 1 });
    const expiredSubscriptions = await User.countDocuments({ 
      subscriptionStatus: 1, 
      subscriptionExpiry: { $lt: new Date() } 
    });
    
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('telegramId firstName lastName username subscriptionStatus subscriptionExpiry createdAt');

    res.json({
      totalUsers,
      activeSubscriptions,
      expiredSubscriptions,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Статистика раскладов
app.get('/admin/readings', adminAuth, async (req, res) => {
  try {
    const totalReadings = await TarotReading.countDocuments();
    const readingsByType = await TarotReading.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const recentReadings = await TarotReading.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'telegramId firstName lastName');

    res.json({
      totalReadings,
      readingsByType,
      recentReadings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reading statistics' });
  }
});

// Получить сообщения поддержки
app.get('/admin/support', adminAuth, async (req, res) => {
  try {
    const { status = 'new', limit = 50 } = req.query;
    
    const messages = await SupportMessage.find(status === 'all' ? {} : { status })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    const stats = {
      new: await SupportMessage.countDocuments({ status: 'new' }),
      in_progress: await SupportMessage.countDocuments({ status: 'in_progress' }),
      resolved: await SupportMessage.countDocuments({ status: 'resolved' })
    };

    res.json({ messages, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch support messages' });
  }
});

// Обновить статус сообщения поддержки
app.post('/admin/support/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const message = await SupportMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.status = status;
    if (adminResponse) {
      message.adminResponse = adminResponse;
    }
    message.updatedAt = new Date();
    
    await message.save();
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// Получить отзывы
app.get('/admin/reviews', adminAuth, async (req, res) => {
  try {
    const { status = 'new', limit = 50 } = req.query;
    
    const reviews = await Review.find(status === 'all' ? {} : { status })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    const stats = {
      new: await Review.countDocuments({ status: 'new' }),
      published: await Review.countDocuments({ status: 'published' }),
      hidden: await Review.countDocuments({ status: 'hidden' })
    };

    res.json({ reviews, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Обновить статус отзыва
app.post('/admin/reviews/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    review.status = status;
    if (adminResponse) {
      review.adminResponse = adminResponse;
    }
    review.updatedAt = new Date();
    
    await review.save();
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

// Управление пользователями
app.get('/admin/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const readings = await TarotReading.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ user, readings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Обновление подписки пользователя
app.post('/admin/users/:id/subscription', adminAuth, async (req, res) => {
  try {
    const { action, days } = req.body;
    const user = await User.findOne({ telegramId: req.params.id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (action === 'extend') {
      const now = new Date();
      let expiryDate;
      
      if (user.subscriptionStatus === 1 && user.subscriptionExpiry && user.subscriptionExpiry > now) {
        expiryDate = new Date(user.subscriptionExpiry.getTime() + (days * 24 * 60 * 60 * 1000));
      } else {
        expiryDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        user.subscriptionActivatedAt = now;
      }
      
      user.subscriptionStatus = 1;
      user.subscriptionExpiry = expiryDate;
      await user.save();
      
      res.json({ 
        message: 'Subscription extended successfully',
        expiryDate: expiryDate.toISOString()
      });
    } else if (action === 'revoke') {
      user.subscriptionStatus = 0;
      user.subscriptionExpiry = null;
      await user.save();
      
      res.json({ message: 'Subscription revoked successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Простая HTML админка
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Таро Админка</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
            .stat-number { font-size: 1.8em; font-weight: bold; color: #007bff; }
            .stat-label { color: #666; margin-top: 5px; font-size: 0.9em; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
            .tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid #ddd; }
            .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
            .tab.active { border-bottom-color: #007bff; color: #007bff; font-weight: bold; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; font-size: 0.9em; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .btn { background: #007bff; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 0.8em; }
            .btn:hover { background: #0056b3; }
            .btn-success { background: #28a745; }
            .btn-success:hover { background: #218838; }
            .btn-warning { background: #ffc107; color: #212529; }
            .btn-warning:hover { background: #e0a800; }
            .btn-danger { background: #dc3545; }
            .btn-danger:hover { background: #c82333; }
            .form-group { margin: 10px 0; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .form-group textarea { height: 80px; resize: vertical; }
            .hidden { display: none; }
            .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
            .status-new { background: #ffc107; color: #212529; }
            .status-in_progress { background: #17a2b8; color: white; }
            .status-resolved { background: #28a745; color: white; }
            .status-published { background: #28a745; color: white; }
            .status-hidden { background: #6c757d; color: white; }
            .message-content { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
            .modal-content { background: white; margin: 5% auto; padding: 20px; width: 80%; max-width: 600px; border-radius: 8px; }
            .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
            .close:hover { color: black; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔮 Таро Админка</h1>
                <p>Панель управления приложением</p>
            </div>

            <div class="stats" id="stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalUsers">-</div>
                    <div class="stat-label">Всего пользователей</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="activeSubscriptions">-</div>
                    <div class="stat-label">Активных подписок</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalReadings">-</div>
                    <div class="stat-label">Всего раскладов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="newSupport">-</div>
                    <div class="stat-label">Новых сообщений</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="newReviews">-</div>
                    <div class="stat-label">Новых отзывов</div>
                </div>
            </div>

            <div class="tabs">
                <div class="tab active" onclick="showTab('users')">👥 Пользователи</div>
                <div class="tab" onclick="showTab('support')">🆘 Поддержка</div>
                <div class="tab" onclick="showTab('reviews')">⭐ Отзывы</div>
            </div>

            <!-- Вкладка пользователей -->
            <div id="users" class="tab-content active">
                <div class="section">
                    <h3>👥 Управление пользователями</h3>
                    <div class="form-group">
                        <label>Telegram ID пользователя:</label>
                        <input type="number" id="userIdInput" placeholder="Введите Telegram ID">
                        <button class="btn" onclick="loadUser()">Найти пользователя</button>
                    </div>
                    
                    <div id="userDetails" class="hidden">
                        <h4>Информация о пользователе</h4>
                        <div id="userInfo"></div>
                        
                        <h4>Управление подпиской</h4>
                        <div class="form-group">
                            <label>Действие:</label>
                            <select id="subscriptionAction">
                                <option value="extend">Продлить подписку</option>
                                <option value="revoke">Отменить подписку</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Количество дней (для продления):</label>
                            <input type="number" id="subscriptionDays" value="30">
                        </div>
                        <button class="btn" onclick="updateSubscription()">Выполнить</button>
                    </div>
                </div>

                <div class="section">
                    <h3>📊 Последние пользователи</h3>
                    <table id="recentUsers">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Username</th>
                                <th>Подписка</th>
                                <th>Дата регистрации</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <!-- Вкладка поддержки -->
            <div id="support" class="tab-content">
                <div class="section">
                    <h3>🆘 Сообщения поддержки</h3>
                    <div class="form-group">
                        <label>Фильтр по статусу:</label>
                        <select id="supportFilter" onchange="loadSupportMessages()">
                            <option value="new">Новые</option>
                            <option value="in_progress">В работе</option>
                            <option value="resolved">Решены</option>
                            <option value="all">Все</option>
                        </select>
                    </div>
                    <table id="supportMessages">
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Пользователь</th>
                                <th>Сообщение</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <!-- Вкладка отзывов -->
            <div id="reviews" class="tab-content">
                <div class="section">
                    <h3>⭐ Отзывы пользователей</h3>
                    <div class="form-group">
                        <label>Фильтр по статусу:</label>
                        <select id="reviewFilter" onchange="loadReviews()">
                            <option value="new">Новые</option>
                            <option value="published">Опубликованы</option>
                            <option value="hidden">Скрыты</option>
                            <option value="all">Все</option>
                        </select>
                    </div>
                    <table id="reviewsTable">
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Пользователь</th>
                                <th>Отзыв</th>
                                <th>Рейтинг</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Модальное окно для детального просмотра -->
        <div id="messageModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <h3 id="modalTitle"></h3>
                <div id="modalContent"></div>
                <div class="form-group">
                    <label>Ответ администратора:</label>
                    <textarea id="adminResponse" placeholder="Введите ответ..."></textarea>
                </div>
                <div class="form-group">
                    <label>Статус:</label>
                    <select id="modalStatus">
                        <option value="new">Новый</option>
                        <option value="in_progress">В работе</option>
                        <option value="resolved">Решен</option>
                    </select>
                </div>
                <button class="btn" onclick="saveResponse()">Сохранить</button>
            </div>
        </div>

        <script>
            const API_BASE = '/admin';
            const ADMIN_KEY = 'admin123';
            let currentItemId = null;
            let currentItemType = null;

            async function fetchWithAuth(url, options = {}) {
                return fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Key': ADMIN_KEY,
                        ...options.headers
                    }
                });
            }

            function showTab(tabName) {
                // Скрыть все вкладки
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                });

                // Показать выбранную вкладку
                document.getElementById(tabName).classList.add('active');
                event.target.classList.add('active');

                // Загрузить данные для вкладки
                if (tabName === 'support') {
                    loadSupportMessages();
                } else if (tabName === 'reviews') {
                    loadReviews();
                }
            }

            async function loadStats() {
                try {
                    const [usersRes, readingsRes, supportRes, reviewsRes] = await Promise.all([
                        fetchWithAuth(API_BASE + '/users'),
                        fetchWithAuth(API_BASE + '/readings'),
                        fetchWithAuth(API_BASE + '/support'),
                        fetchWithAuth(API_BASE + '/reviews')
                    ]);
                    
                    const usersData = await usersRes.json();
                    const readingsData = await readingsRes.json();
                    const supportData = await supportRes.json();
                    const reviewsData = await reviewsRes.json();
                    
                    document.getElementById('totalUsers').textContent = usersData.totalUsers;
                    document.getElementById('activeSubscriptions').textContent = usersData.activeSubscriptions;
                    document.getElementById('totalReadings').textContent = readingsData.totalReadings;
                    document.getElementById('newSupport').textContent = supportData.stats.new;
                    document.getElementById('newReviews').textContent = reviewsData.stats.new;
                    
                    // Заполняем таблицу пользователей
                    const tbody = document.querySelector('#recentUsers tbody');
                    tbody.innerHTML = usersData.recentUsers.map(user => \`
                        <tr>
                            <td>\${user.telegramId}</td>
                            <td>\${user.firstName} \${user.lastName || ''}</td>
                            <td>@\${user.username || 'нет'}</td>
                            <td>\${user.subscriptionStatus ? '✅ Активна' : '❌ Нет'}</td>
                            <td>\${new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                        </tr>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading stats:', error);
                }
            }

            async function loadSupportMessages() {
                try {
                    const filter = document.getElementById('supportFilter').value;
                    const response = await fetchWithAuth(\`\${API_BASE}/support?status=\${filter}\`);
                    const data = await response.json();
                    
                    const tbody = document.querySelector('#supportMessages tbody');
                    tbody.innerHTML = data.messages.map(msg => \`
                        <tr>
                            <td>\${new Date(msg.createdAt).toLocaleDateString('ru-RU')}</td>
                            <td>\${msg.userName} (@\${msg.userUsername || 'нет'})</td>
                            <td class="message-content" title="\${msg.message}">\${msg.message}</td>
                            <td><span class="status-badge status-\${msg.status}">\${getStatusText(msg.status)}</span></td>
                            <td>
                                <button class="btn" onclick="viewMessage('\${msg._id}', 'support')">Просмотр</button>
                                <button class="btn btn-success" onclick="updateStatus('\${msg._id}', 'support', 'resolved')">Решено</button>
                            </td>
                        </tr>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading support messages:', error);
                }
            }

            async function loadReviews() {
                try {
                    const filter = document.getElementById('reviewFilter').value;
                    const response = await fetchWithAuth(\`\${API_BASE}/reviews?status=\${filter}\`);
                    const data = await response.json();
                    
                    const tbody = document.querySelector('#reviewsTable tbody');
                    tbody.innerHTML = data.reviews.map(review => \`
                        <tr>
                            <td>\${new Date(review.createdAt).toLocaleDateString('ru-RU')}</td>
                            <td>\${review.userName} (@\${review.userUsername || 'нет'})</td>
                            <td class="message-content" title="\${review.review}">\${review.review}</td>
                            <td>\${review.rating ? '⭐'.repeat(review.rating) : 'Нет'}</td>
                            <td><span class="status-badge status-\${review.status}">\${getStatusText(review.status)}</span></td>
                            <td>
                                <button class="btn" onclick="viewMessage('\${review._id}', 'review')">Просмотр</button>
                                <button class="btn btn-success" onclick="updateStatus('\${review._id}', 'review', 'published')">Опубликовать</button>
                                <button class="btn btn-danger" onclick="updateStatus('\${review._id}', 'review', 'hidden')">Скрыть</button>
                            </td>
                        </tr>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading reviews:', error);
                }
            }

            function getStatusText(status) {
                const statusMap = {
                    'new': 'Новый',
                    'in_progress': 'В работе',
                    'resolved': 'Решен',
                    'published': 'Опубликован',
                    'hidden': 'Скрыт'
                };
                return statusMap[status] || status;
            }

            function viewMessage(id, type) {
                currentItemId = id;
                currentItemType = type;
                
                const modal = document.getElementById('messageModal');
                const title = document.getElementById('modalTitle');
                const content = document.getElementById('modalContent');
                const statusSelect = document.getElementById('modalStatus');
                
                if (type === 'support') {
                    title.textContent = 'Сообщение поддержки';
                    // Здесь можно загрузить полное сообщение
                } else if (type === 'review') {
                    title.textContent = 'Отзыв пользователя';
                    // Здесь можно загрузить полный отзыв
                }
                
                modal.style.display = 'block';
            }

            function closeModal() {
                document.getElementById('messageModal').style.display = 'none';
                currentItemId = null;
                currentItemType = null;
            }

            async function saveResponse() {
                if (!currentItemId || !currentItemType) return;
                
                const adminResponse = document.getElementById('adminResponse').value;
                const status = document.getElementById('modalStatus').value;
                
                try {
                    const endpoint = currentItemType === 'support' ? 'support' : 'reviews';
                    await fetchWithAuth(\`\${API_BASE}/\${endpoint}/\${currentItemId}/status\`, {
                        method: 'POST',
                        body: JSON.stringify({ status, adminResponse })
                    });
                    
                    alert('Ответ сохранен');
                    closeModal();
                    
                    // Перезагрузить данные
                    if (currentItemType === 'support') {
                        loadSupportMessages();
                    } else if (currentItemType === 'review') {
                        loadReviews();
                    }
                    loadStats();
                } catch (error) {
                    console.error('Error saving response:', error);
                    alert('Ошибка сохранения ответа');
                }
            }

            async function updateStatus(id, type, status) {
                try {
                    const endpoint = type === 'support' ? 'support' : 'reviews';
                    await fetchWithAuth(\`\${API_BASE}/\${endpoint}/\${id}/status\`, {
                        method: 'POST',
                        body: JSON.stringify({ status })
                    });
                    
                    alert('Статус обновлен');
                    
                    // Перезагрузить данные
                    if (type === 'support') {
                        loadSupportMessages();
                    } else if (type === 'review') {
                        loadReviews();
                    }
                    loadStats();
                } catch (error) {
                    console.error('Error updating status:', error);
                    alert('Ошибка обновления статуса');
                }
            }

            async function loadUser() {
                const userId = document.getElementById('userIdInput').value;
                if (!userId) return;
                
                try {
                    const response = await fetchWithAuth(\`\${API_BASE}/users/\${userId}\`);
                    const data = await response.json();
                    
                    if (data.user) {
                        document.getElementById('userInfo').innerHTML = \`
                            <p><strong>ID:</strong> \${data.user.telegramId}</p>
                            <p><strong>Имя:</strong> \${data.user.firstName} \${data.user.lastName || ''}</p>
                            <p><strong>Username:</strong> @\${data.user.username || 'нет'}</p>
                            <p><strong>Подписка:</strong> \${data.user.subscriptionStatus ? '✅ Активна' : '❌ Нет'}</p>
                            <p><strong>Действует до:</strong> \${data.user.subscriptionExpiry ? new Date(data.user.subscriptionExpiry).toLocaleDateString('ru-RU') : 'Нет'}</p>
                            <p><strong>Раскладов:</strong> \${data.readings.length}</p>
                        \`;
                        document.getElementById('userDetails').classList.remove('hidden');
                    } else {
                        alert('Пользователь не найден');
                    }
                } catch (error) {
                    console.error('Error loading user:', error);
                    alert('Ошибка загрузки пользователя');
                }
            }

            async function updateSubscription() {
                const userId = document.getElementById('userIdInput').value;
                const action = document.getElementById('subscriptionAction').value;
                const days = document.getElementById('subscriptionDays').value;
                
                try {
                    const response = await fetchWithAuth(\`\${API_BASE}/users/\${userId}/subscription\`, {
                        method: 'POST',
                        body: JSON.stringify({ action, days: parseInt(days) })
                    });
                    
                    const data = await response.json();
                    alert(data.message);
                    loadUser();
                    loadStats();
                } catch (error) {
                    console.error('Error updating subscription:', error);
                    alert('Ошибка обновления подписки');
                }
            }

            // Закрыть модальное окно при клике вне его
            window.onclick = function(event) {
                const modal = document.getElementById('messageModal');
                if (event.target === modal) {
                    closeModal();
                }
            }

            // Загружаем статистику при загрузке страницы
            loadStats();
        </script>
    </body>
    </html>
  `);
});

const PORT = process.env.ADMIN_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🔧 Admin panel running on http://localhost:${PORT}/admin`);
});