'use client';

import { motion, AnimatePresence } from 'motion/react';
import BottomNavigation from '@/components/BottomNavigation';
import { ArrowLeft, Calendar, Clock, Star, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { formatInterpretationText, truncateText } from '@/utils/textFormatting';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { tarotCards } from '@/data/tarotCards';

interface HistoryCard {
  name: string;
  imagePath: string;
  meaning: string;
  advice: string;
  keywords: string;
}

interface ClarifyingQuestion {
  question: string;
  card: HistoryCard;
  interpretation: string;
  timestamp: Date;
}

interface HistoryEntry {
  _id: string;
  type: 'single' | 'three_cards' | 'yes_no';
  category?: string;
  userQuestion?: string;
  cards: HistoryCard[];
  interpretation: string;
  clarifyingQuestions?: ClarifyingQuestion[];
  createdAt: string;
}

interface HistoryScreenProps {
  onBack: () => void;
  activeTab: 'home' | 'history';
  onTabChange: (tab: 'home' | 'history') => void;
}

// Фиксированные позиции для sparkles
const sparklePositions = [
  { left: 10, top: 20, delay: 0, duration: 2.5 },
  { left: 85, top: 15, delay: 0.5, duration: 3 },
  { left: 25, top: 80, delay: 1, duration: 2.8 },
  { left: 70, top: 60, delay: 1.5, duration: 3.2 },
  { left: 45, top: 30, delay: 2, duration: 2.7 },
  { left: 90, top: 40, delay: 2.5, duration: 3.1 },
  { left: 15, top: 50, delay: 3, duration: 2.9 },
  { left: 60, top: 85, delay: 3.5, duration: 2.6 },
  { left: 35, top: 10, delay: 4, duration: 3.3 },
  { left: 80, top: 75, delay: 4.5, duration: 2.4 },
  { left: 5, top: 65, delay: 0.2, duration: 2.8 },
  { left: 95, top: 25, delay: 0.7, duration: 3.1 },
  { left: 20, top: 35, delay: 1.2, duration: 2.9 },
  { left: 75, top: 50, delay: 1.7, duration: 2.7 },
  { left: 50, top: 70, delay: 2.2, duration: 3.2 },
  { left: 30, top: 45, delay: 2.7, duration: 2.6 },
  { left: 65, top: 20, delay: 3.2, duration: 3.0 },
  { left: 40, top: 90, delay: 3.7, duration: 2.8 },
  { left: 85, top: 55, delay: 4.2, duration: 2.9 },
  { left: 10, top: 75, delay: 4.7, duration: 3.1 },
];

export function HistoryScreen({ onBack, activeTab, onTabChange }: HistoryScreenProps) {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [selectedCardDetails, setSelectedCardDetails] = useState<{
    card: HistoryCard;
    category: string;
    detailedDescription: string;
  } | null>(null);
  const [isInterpretationExpanded, setIsInterpretationExpanded] = useState(false);
  const [expandedClarifyingQuestions, setExpandedClarifyingQuestions] = useState<{ [key: number]: boolean }>({});
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Загружаем историю при монтировании компонента и при переключении на вкладку истории
  useEffect(() => {
    if (activeTab === 'history') {
      // Небольшая задержка, чтобы убедиться, что предыдущие модальные окна закрыты
      const timer = setTimeout(() => {
        loadHistory();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // При переключении с истории на другую вкладку закрываем модальное окно
      setShowSubscriptionModal(false);
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📚 Loading history...');
      const response = await apiService.getHistory();
      console.log('📚 History response:', response);
      console.log('📚 Response success:', response.success);
      console.log('📚 Response data:', response.data);
      console.log('📚 Response data.readings:', response.data?.readings);
      
      if (response.success && response.data) {
        const readings = response.data.readings || [];
        console.log('📚 Setting history with readings:', readings.length);
        setHistory(readings as any);
      } else if (response.subscriptionRequired) {
        // Показываем модальное окно подписки для истории
        setShowSubscriptionModal(true);
        setError('История доступна только по подписке');
      } else {
        console.error('📚 History load failed:', response.error);
        setError(response.error || 'Не удалось загрузить историю');
      }
    } catch (err) {
      console.error('📚 Error loading history:', err);
      setError('Ошибка при загрузке истории');
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
  };

  const closeDetails = () => {
    setSelectedEntry(null);
  };

  const handleCardDetails = async (card: HistoryCard, category: string) => {
    try {
      console.log('=== HANDLE CARD DETAILS CALLED ===');
      console.log('Card details request:', { cardName: card.name, category, card });
      
      // Проверяем, что у карты есть название
      if (!card.name || card.name.trim() === '') {
        console.error('Card name is empty or undefined:', card);
        return;
      }
      
      // Ищем карту в локальных данных
      const localCard = tarotCards.find(c => {
        const cardName = card.name?.toLowerCase().trim();
        const localName = c.name?.toLowerCase().trim();
        return cardName === localName;
      });
      
      // Формируем описание из локальных данных или используем данные карты
      let detailedDescription = '';
      
      if (localCard) {
        // Используем данные из локального источника
        detailedDescription = `${localCard.meaning}\n\n${localCard.advice}`;
      } else {
        // Используем данные из карты истории
        detailedDescription = card.meaning || card.advice || 'Подробное описание карты';
      }
      
      // Дополняем карту данными из локального источника, если они отсутствуют
      const enrichedCard: HistoryCard = {
        ...card,
        meaning: card.meaning || localCard?.meaning || 'Значение карты',
        advice: card.advice || localCard?.advice || 'Совет карты',
        keywords: card.keywords || localCard?.keywords || 'Ключевые слова'
      };
      
      console.log('Setting modal state...');
      setSelectedCardDetails({
        card: enrichedCard,
        category,
        detailedDescription: detailedDescription
      });
      setShowCardDetails(true);
      console.log('Modal should be shown now');
      console.log('showCardDetails state:', true);
      console.log('selectedCardDetails state:', { card: enrichedCard, category, detailedDescription });
    } catch (error) {
      console.error('Error getting card details:', error);
      // Не показываем модальное окно при ошибке
      return;
    }
  };

  const closeCardDetails = () => {
    setShowCardDetails(false);
    setSelectedCardDetails(null);
  };

  // Отслеживаем изменения состояния модального окна
  useEffect(() => {
    console.log('=== MODAL STATE CHANGED ===');
    console.log('showCardDetails:', showCardDetails);
    console.log('selectedCardDetails:', selectedCardDetails);
    if (showCardDetails) {
      console.log('Modal should be visible now!');
    }
  }, [showCardDetails, selectedCardDetails]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryName = (category: string | null | undefined): string => {
    if (!category) return '';
    
    const categoryMap: { [key: string]: string } = {
      'love': 'Любовь',
      'career': 'Карьера',
      'personal': 'Личное развитие',
      'yesno': 'Да/Нет'
    };
    
    return categoryMap[category] || category;
  };

  const getReadingTypeIcon = (type: string) => {
    switch (type) {
      case 'single':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'three_cards':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'yes_no':
        return <Star className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  const getReadingTypeName = (type: string) => {
    switch (type) {
      case 'single':
        return 'Тип расклада: Совет дня';
      case 'three_cards':
        return 'Тип расклада: Три карты';
      case 'yes_no':
        return 'Тип расклада: Да/Нет';
      default:
        return 'Тип расклада: Расклад';
    }
  };

  if (selectedEntry) {
    return (
      <div className="relative h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
        {/* Background with stars */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            // Убрана ссылка на unsplash для избежания таймаутов
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Floating sparkles */}
        <div className="absolute inset-0">
          {sparklePositions.map((sparkle, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-300 rounded-full"
              style={{
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: sparkle.duration,
                repeat: Infinity,
                delay: sparkle.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-screen">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between px-4 py-6 pt-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Button
              onClick={closeDetails}
              className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-2xl border border-slate-600/30 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Button>
            <div className="text-center">
              <h1 className="text-lg text-white">Детали расклада</h1>
              <p className="text-sm text-gray-300">
                {formatDate(selectedEntry.createdAt)} в {formatTime(selectedEntry.createdAt)}
              </p>
            </div>
            <div className="w-9" />
          </motion.div>

          {/* Content */}
          <div className="flex-1 px-4 pb-20 overflow-y-auto">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Reading Type */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/30 shadow-lg">
                <div className="flex items-center space-x-3 mb-2">
                  {getReadingTypeIcon(selectedEntry.type)}
                  <h3 className="text-white">{getReadingTypeName(selectedEntry.type)}</h3>
                </div>
                {selectedEntry.category && (
                  <p className="text-sm text-gray-300">Категория: {getCategoryName(selectedEntry.category)}</p>
                )}
                {selectedEntry.userQuestion && (
                  <p className="text-sm text-gray-300 mt-2">Вопрос: {selectedEntry.userQuestion}</p>
                )}
              </div>

              {/* AI Interpretation */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/30 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-amber-400">Карта говорит</h3>
                  </div>
                  <motion.button
                    onClick={() => setIsInterpretationExpanded(!isInterpretationExpanded)}
                    className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      animate={{ rotate: isInterpretationExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-90" />
                    </motion.div>
                  </motion.button>
                </div>
                <div className="text-white text-sm leading-relaxed whitespace-pre-line">
                  {isInterpretationExpanded 
                    ? formatInterpretationText(selectedEntry.interpretation)
                    : truncateText(formatInterpretationText(selectedEntry.interpretation))
                  }
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-4">
                {selectedEntry.cards.map((card, index) => (
                  <motion.div
                    key={index}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/30 shadow-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  >
                    <div className="flex items-start space-x-6">
                      <div className="w-24 h-36 rounded-xl overflow-hidden bg-gradient-to-b from-amber-50 to-amber-100 shadow-md border-2 border-amber-400/30 flex-shrink-0">
                        <img
                          src={card.imagePath}
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-amber-400 mb-3 text-lg font-semibold">{card.name}</h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-white">
                            Сегодня карта "{card.name || 'Неизвестная карта'}" советует вам: <span className="text-amber-300">{card.advice || 'Следуйте своей интуиции'}</span>
                          </p>
                          <p className="text-gray-400">
                            Ключевые слова: <span className="text-gray-300">{card.keywords || 'Интуиция, мудрость'}</span>
                          </p>
                        </div>
                        {selectedEntry.type === 'three_cards' && (
                          <p className="text-xs text-purple-400 mt-3 font-medium">
                            {index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее'}
                          </p>
                        )}
                        
                        {/* Кнопка "Подробнее" */}
                        <div className="mt-4">
                          <motion.button
                            className="w-full bg-slate-700/20 rounded-md p-1.5 border border-slate-500/10 cursor-pointer hover:bg-slate-600/30 transition-colors text-gray-400 text-xs"
                            onClick={() => {
                              console.log('=== ПОДРОБНЕЕ BUTTON CLICKED ===');
                              const category = selectedEntry.category;
                              const validCategory = (category && category !== 'null' && category !== 'undefined' && category !== null && category !== undefined) ? category : 'personal';
                              console.log('Calling handleCardDetails with:', { card: card.name, category: validCategory });
                              handleCardDetails(card, validCategory);
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-xs">ℹ️</span>
                              <span>Подробнее</span>
                            </div>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Clarifying Questions */}
              {selectedEntry.clarifyingQuestions && selectedEntry.clarifyingQuestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-white text-lg">Уточняющие вопросы</h3>
                  {selectedEntry.clarifyingQuestions.map((cq, index) => (
                    <motion.div
                      key={index}
                      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/30 shadow-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-18 rounded-lg overflow-hidden bg-gradient-to-b from-amber-50 to-amber-100 shadow-md border border-amber-400/30 flex-shrink-0">
                          <img
                            src={cq.card.imagePath}
                            alt={cq.card.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-amber-400 text-sm">
                              <span className="text-gray-400">Вопрос: </span>"{cq.question}"
                            </p>
                            <motion.button
                              onClick={() => setExpandedClarifyingQuestions(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <motion.div
                                animate={{ rotate: expandedClarifyingQuestions[index] ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ArrowLeft className="w-3 h-3 text-gray-400 rotate-90" />
                              </motion.div>
                            </motion.button>
                          </div>
                          <p className="text-white text-sm mb-2">{cq.card.name}</p>
                          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                            {expandedClarifyingQuestions[index] 
                              ? formatInterpretationText(cq.interpretation)
                              : truncateText(formatInterpretationText(cq.interpretation), 150)
                            }
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Bottom Navigation */}
          <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="relative h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Background with stars */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1623489956130-64c5f8e84590?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFycyUyMG5pZ2h0JTIwc2t5JTIwbWFnaWNhbHxlbnwxfHx8fDE3NTc2NjA3NzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Floating sparkles */}
      <div className="absolute inset-0">
        {sparklePositions.map((sparkle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-300 rounded-full"
            style={{
              left: `${sparkle.left}%`,
              top: `${sparkle.top}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: sparkle.duration,
              repeat: Infinity,
              delay: sparkle.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between px-4 py-6 pt-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            onClick={onBack}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-2xl border border-slate-600/30 transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl text-white">История раскладов</h1>
            <p className="text-sm text-gray-300">Ваши предыдущие гадания</p>
          </div>
          <div className="w-9" />
        </motion.div>

        {/* Content */}
        <div className="flex-1 px-4 pb-20 overflow-y-auto">
          {loading ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-4xl text-amber-400 mb-4">🔮</div>
              <p className="text-white">Загружаем историю...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-4xl text-red-400 mb-4">❌</div>
              <h3 className="text-white mb-2">Ошибка</h3>
              <p className="text-sm text-gray-300 text-center mb-4">{error}</p>
              <Button
                onClick={loadHistory}
                className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-white rounded-xl border border-amber-400/30"
              >
                Попробовать снова
              </Button>
            </motion.div>
          ) : history.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="text-6xl text-gray-400 mb-4">📚</div>
              <h3 className="text-white mb-2">История пуста</h3>
              <p className="text-sm text-gray-300 text-center">
                Ваши расклады будут появляться здесь после каждого гадания
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {history.map((entry, index) => (
                <motion.div
                  key={entry._id}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/30 shadow-lg cursor-pointer hover:bg-slate-700/50 transition-all duration-300"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl border ${
                        entry.type === 'single' 
                          ? 'bg-amber-600/20 border-amber-400/30'
                          : entry.type === 'three_cards'
                          ? 'bg-purple-600/20 border-purple-400/30'
                          : 'bg-emerald-600/20 border-emerald-400/30'
                      }`}>
                        {getReadingTypeIcon(entry.type)}
                      </div>
                      <div>
                        <h3 className="text-white">{getReadingTypeName(entry.type)}</h3>
                        {entry.category && (
                          <p className="text-xs text-gray-400">{getCategoryName(entry.category)}</p>
                        )}
                        {entry.userQuestion && (
                          <p className="text-xs text-gray-400 mt-1">
                            <span className="text-gray-500">Вопрос: </span>{entry.userQuestion}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-xs text-gray-400 mb-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(entry.createdAt)}
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                    </div>
                  </div>

                  {/* Cards preview */}
                  <div className="flex items-center space-x-2">
                    {entry.cards.slice(0, 3).map((card, cardIndex) => (
                      <div key={cardIndex} className="relative">
                        <div className="w-8 h-12 rounded-lg overflow-hidden bg-gradient-to-b from-amber-50 to-amber-100 shadow-sm border border-amber-400/30">
                          <img
                            src={card.imagePath}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {cardIndex === 0 && entry.cards.length > 1 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">
                            {entry.cards.length}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex-1 ml-3">
                      <p className="text-sm text-white truncate">
                        {entry.cards[0].name}
                        {entry.cards.length > 1 && ` и еще ${entry.cards.length - 1}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {entry.cards[0].meaning}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Mystical decoration */}
              <motion.div
                className="text-center text-amber-400/60 py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
              >
                ✦ ❋ ✦
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      {/* Subscription Modal for History */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          // Возвращаемся на главную страницу при закрытии
          onTabChange('home');
        }}
        title="Требуется подписка"
        message="Подписка — это ваш доступ к полному функционалу. Оформите её прямо сейчас и продолжайте работу без ограничений."
        showHistoryMessage={false}
      />
    </div>

    {/* Modal для подробного описания карты - рендерится вне основного контейнера с overflow-hidden */}
    <AnimatePresence mode="wait">
      {showCardDetails && selectedCardDetails && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          onClick={closeCardDetails}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-600/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-18 rounded-lg overflow-hidden bg-gradient-to-b from-amber-50 to-amber-100 shadow-md border-2 border-amber-400/30">
                  <img
                    src={selectedCardDetails.card.imagePath}
                    alt={selectedCardDetails.card.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold">{selectedCardDetails.card.name}</h3>
                  <p className="text-gray-300 text-sm">
                    {selectedCardDetails.category === 'love' ? 'Любовь' : 
                     selectedCardDetails.category === 'work' ? 'Карьера' : 
                     selectedCardDetails.category === 'career' ? 'Карьера' : 'Личное развитие'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeCardDetails}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-500/30">
                <h4 className="text-white font-medium mb-2">Подробное описание</h4>
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                  {selectedCardDetails.detailedDescription}
                </p>
              </div>

              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-500/30">
                <h4 className="text-white font-medium mb-2">Ключевые слова</h4>
                <p className="text-gray-200 text-sm">{selectedCardDetails.card.keywords}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={closeCardDetails}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-gray-300 border border-slate-400/30 rounded-lg text-sm font-medium transition-all duration-300"
              >
                Закрыть
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

export default HistoryScreen;