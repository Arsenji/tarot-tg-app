import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FloatingCard } from '@/components/FloatingCard';
import { ArrowLeft, Heart, Briefcase, Star, Sparkles } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { apiService } from '@/services/api';
import { TarotCard } from '@/types/tarot';
import { TarotLoader } from './OneCardScreen';
import { formatInterpretationText } from '@/utils/textFormatting';

// Категории гадания
const categories = [
  {
    id: 'love',
    name: 'Любовь',
    icon: Heart,
    description: 'Отношения и романтика',
    color: 'from-pink-600/20 to-rose-500/20',
    borderColor: 'border-pink-400/30',
    iconColor: 'text-pink-400'
  },
  {
    id: 'career',
    name: 'Бизнес/Карьера',
    icon: Briefcase,
    description: 'Работа и финансы',
    color: 'from-blue-600/20 to-blue-500/20',
    borderColor: 'border-blue-400/30',
    iconColor: 'text-blue-400'
  },
  {
    id: 'personal',
    name: 'Личное развитие',
    icon: Star,
    description: 'Духовный рост и самопознание',
    color: 'from-purple-600/20 to-purple-500/20',
    borderColor: 'border-purple-400/30',
    iconColor: 'text-purple-400'
  }
];

// Данные карт для разных категорий
const cardData = {
  love: {
    past: {
      name: "Двойка Кубков",
      image: "/images/rider-waite-tarot/minor_arcana_cups_2.png",
      interpretation: "Прошлые отношения заложили основу для понимания истинной любви"
    },
    present: {
      name: "Влюбленные",
      image: "/images/rider-waite-tarot/major_arcana_lovers.png",
      interpretation: "Важный выбор в отношениях. Время принять решение о будущем"
    },
    future: {
      name: "Десятка Кубков",
      image: "/images/rider-waite-tarot/minor_arcana_cups_10.png",
      interpretation: "Гармония и счастье в отношениях. Исполнение сердечных желаний"
    }
  },
  career: {
    past: {
      name: "Восьмерка Пентаклей",
      image: "/images/rider-waite-tarot/minor_arcana_pentacles_8.png",
      interpretation: "Усердная работа и обучение создали прочный фундамент для роста"
    },
    present: {
      name: "Тройка Пентаклей",
      image: "/images/rider-waite-tarot/minor_arcana_pentacles_3.png",
      interpretation: "Сотрудничество и командная работа приведут к успеху"
    },
    future: {
      name: "Десятка Пентаклей",
      image: "/images/rider-waite-tarot/minor_arcana_pentacles_10.png",
      interpretation: "Финансовая стабильность и долгосрочный успех в карьере"
    }
  },
  personal: {
    past: {
      name: "Отшельник",
      image: "/images/rider-waite-tarot/major_arcana_hermit.png",
      interpretation: "Период внутреннего поиска и самопознания завершился важными откровениями"
    },
    present: {
      name: "Звезда",
      image: "/images/rider-waite-tarot/major_arcana_star.png",
      interpretation: "Время исцеления и обновления. Ваша интуиция особенно сильна"
    },
    future: {
      name: "Солнце",
      image: "/images/rider-waite-tarot/major_arcana_sun.png",
      interpretation: "Просветление и радость. Достижение внутренней гармонии и мудрости"
    }
  }
};

// Фоновые карты для атмосферы
const backgroundCards = [
  {
    src: "/images/rider-waite-tarot/major_arcana_fool.png",
    alt: "Mystical Tarot Card"
  },
  {
    src: "/images/rider-waite-tarot/major_arcana_magician.png",
    alt: "Mystical Tarot Card"
  },
  {
    src: "/images/rider-waite-tarot/major_arcana_priestess.png",
    alt: "Mystical Tarot Card"
  }
];

interface ThreeCardsScreenProps {
  onBack: () => void;
}

export function ThreeCardsScreen({ onBack }: ThreeCardsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [apiCards, setApiCards] = useState<TarotCard[]>([]);
  const [apiInterpretation, setApiInterpretation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showClarifyingQuestion, setShowClarifyingQuestion] = useState(false);
  const [clarifyingQuestion, setClarifyingQuestion] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedCardForDescription, setSelectedCardForDescription] = useState<TarotCard | null>(null);
  const [isInterpretationExpanded, setIsInterpretationExpanded] = useState<{[key: string]: boolean}>({});
  const [currentReadingId, setCurrentReadingId] = useState<string | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<Array<{
    question: string;
    answer?: string;
    card?: any;
    isLoading?: boolean;
  }>>([]);
  const [showClarifyingInput, setShowClarifyingInput] = useState(false);
  const [currentClarifyingQuestion, setCurrentClarifyingQuestion] = useState('');

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  // Статический массив звезд для предотвращения мигания
  const sparklesData = useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 4,
    }));
  }, []);

  const openDescriptionModal = (card: TarotCard) => {
    setSelectedCardForDescription(card);
    setShowDescriptionModal(true);
  };

  const closeDescriptionModal = () => {
    setShowDescriptionModal(false);
    setSelectedCardForDescription(null);
  };

  const submitClarifyingQuestion = async () => {
    if (!currentClarifyingQuestion.trim() || !apiCards.length) return;

    const questionText = currentClarifyingQuestion; // Сохраняем вопрос перед очисткой
    const newQuestion = {
      question: questionText,
      isLoading: true,
    };

    // Добавляем вопрос в список с лоадером
    setClarifyingQuestions(prev => [...prev, newQuestion]);
    setCurrentClarifyingQuestion('');
    setShowClarifyingInput(false);
    
    try {
      console.log('Sending clarifying question:', questionText);
      console.log('Cards data:', apiCards);
      
      // Используем API для получения ответа от ChatGPT
      const response = await apiService.getClarifyingAnswer(
        questionText,
        apiCards[0], // Используем первую карту как основную
        apiInterpretation,
        selectedCategory || 'personal',
        currentReadingId || undefined // Передаем ID текущего расклада
      );

      console.log('API Response:', response);
      console.log('Response data:', response.data);

      // Проверяем структуру ответа более детально
      let answer = '';
      let clarifyingCard = apiCards[0]; // Используем первую карту по умолчанию
      
      if (response.success && response.data) {
        if (response.data.answer) {
          answer = response.data.answer;
          // Если в ответе есть карта, используем её, иначе используем карту из основного результата
          clarifyingCard = response.data.card || apiCards[0];
        } else {
          console.error('Answer not found in response data:', response.data);
          answer = 'Карты говорят, что ответ на ваш уточняющий вопрос требует более глубокого размышления.';
        }
      } else {
        console.error('API response failed:', response);
        answer = 'Произошла ошибка при получении ответа. Попробуйте еще раз.';
      }

      console.log('Final answer:', answer);
      console.log('Clarifying card:', clarifyingCard);

      // Обновляем вопрос с полученным ответом и картой
      setClarifyingQuestions(prev => 
        prev.map((q, index) => 
          index === prev.length - 1 
            ? { ...q, answer, card: clarifyingCard, isLoading: false }
            : q
        )
      );
    } catch (error) {
      console.error('Error getting clarifying answer:', error);
      
      // Обновляем вопрос с ошибкой
      setClarifyingQuestions(prev => 
        prev.map((q, index) => 
          index === prev.length - 1 
            ? { ...q, answer: 'Произошла ошибка при получении ответа. Попробуйте еще раз.', isLoading: false }
            : q
        )
      );
    }
  };

  const startReading = async () => {
    if (!selectedCategory || !userQuestion.trim()) return;

    setIsReading(true);
    setIsLoading(true);
    setIsShuffling(true);
    setShowCards(false);
    setRevealedCards([]);
    setError('');
    
    try {
      const response = await apiService.getThreeCardsReading(selectedCategory, userQuestion);
      
      if (response.success && response.data) {
        setApiCards(response.data.cards);
        setApiInterpretation(response.data.interpretation);
        setCurrentReadingId(response.data.readingId);
        
        // Останавливаем анимацию тасования и показываем карты
        setIsShuffling(false);
        setIsReading(false);
        setIsLoading(false);
        setShowCards(true);
        
        // Последовательное открытие карт
        setTimeout(() => setRevealedCards([0]), 500);
        setTimeout(() => setRevealedCards([0, 1]), 1000);
        setTimeout(() => setRevealedCards([0, 1, 2]), 1500);
          } else {
                setError(response.error || 'Ошибка при получении расклада');
                setIsShuffling(false);
          setIsReading(false);
                setIsLoading(false);
      }
    } catch (error) {
      setError('Ошибка при обращении к серверу');
      setIsShuffling(false);
      setIsReading(false);
      setIsLoading(false);
    }
  };

  const positions = [
    { label: 'Прошлое', key: 'past' as const },
    { label: 'Настоящее', key: 'present' as const },
    { label: 'Будущее', key: 'future' as const }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
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
        {sparklesData.map((sparkle) => (
          <motion.div
            key={sparkle.id}
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

      {/* Background floating cards */}
      <FloatingCard
        src={backgroundCards[0].src}
        alt={backgroundCards[0].alt}
        delay={0.5}
        duration={6}
        x={5}
        y={10}
        rotation={-25}
        scale={0.25}
      />
      <FloatingCard
        src={backgroundCards[1].src}
        alt={backgroundCards[1].alt}
        delay={2}
        duration={5}
        x={90}
        y={15}
        rotation={30}
        scale={0.2}
      />
      <FloatingCard
        src={backgroundCards[2].src}
        alt={backgroundCards[2].alt}
        delay={4}
        duration={7}
        x={15}
        y={80}
        rotation={-15}
        scale={0.18}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between px-4 py-6 pt-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
            <motion.button
            onClick={onBack}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-2xl border border-slate-600/30 transition-all duration-300"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>

          <motion.h1
            className="text-xl text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Расклад трех карт
          </motion.h1>

          <div className="w-11" />
        </motion.div>

        {/* Category Selection and Question Input */}
        {!showCards && (
        <motion.div
            className="px-4 mb-6 space-y-4"
            initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div>
              <label className="block text-white mb-3">Выберите категорию:</label>
              <div className="grid grid-cols-1 gap-3">
                {categories.map((category) => (
                  <motion.div
                  key={category.id}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                      selectedCategory === category.id
                        ? `bg-gradient-to-r ${category.color} border-amber-400/50 shadow-lg`
                        : 'bg-slate-800/50 border-slate-600/30 hover:border-slate-500/50'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {category.id === 'love' && <Heart className="w-6 h-6 text-pink-400" />}
                        {category.id === 'career' && <Briefcase className="w-6 h-6 text-blue-400" />}
                        {category.id === 'personal' && <Star className="w-6 h-6 text-green-400" />}
                  </div>
                      <div>
                        <h3 className="text-white font-semibold">{category.name}</h3>
                        <p className="text-gray-400 text-sm">{category.description}</p>
                  </div>
          </div>
        </motion.div>
                ))}
              </div>
            </div>

        {selectedCategory && (
          <motion.div
                initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
          >
                <label className="block text-white mb-3">Ваш вопрос:</label>
            <textarea
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Задайте свой вопрос картам..."
                  className="w-full h-20 bg-slate-800/50 border-slate-600/30 text-white rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder-gray-400"
            />
          </motion.div>
        )}

            {error && (
              <motion.div
                className="bg-red-500/20 border border-red-500/30 rounded-xl p-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Reading Animation - TarotLoader */}
          {isReading && (
                    <motion.div
              className="text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <TarotLoader message="Тасуем карты..." />
              {selectedCategoryData && (
                <p className="text-white text-sm mt-4">Категория: {selectedCategoryData.name}</p>
              )}
                    </motion.div>
          )}

          {/* Card Placeholders / Results */}
          {!isReading && !showCards && (
                <motion.div
              className="w-full max-w-sm"
              initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {/* Карты для выбора позиций */}
              {!isShuffling && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {positions.map((position, index) => (
                  <motion.div
                      key={position.key}
                      className="text-center"
                      initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                  >
                      <div className="w-24 h-36 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-600/50 mx-auto mb-2 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-gray-400 text-xs">{position.label}</p>
                    </motion.div>
                  ))}
                      </div>
              )}

              <Button
                onClick={startReading}
                disabled={!selectedCategory || !userQuestion.trim() || isLoading || isShuffling}
                className={`w-full h-12 ${
                  selectedCategoryData && userQuestion.trim()
                    ? `bg-gradient-to-r ${selectedCategoryData.color} hover:opacity-80 ${selectedCategoryData.borderColor}` 
                    : 'bg-slate-600/20 border-slate-600/30'
                } text-white border-2 rounded-2xl shadow-xl transition-all duration-300 disabled:opacity-50`}
              >
                {isShuffling ? 'Тасуем карты...' : isLoading ? 'Получение расклада...' : 'Начать расклад'}
              </Button>
                  </motion.div>
                )}

          {/* Three Cards Results */}
          {showCards && apiCards.length > 0 && (
                  <motion.div
              className="w-full max-w-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid grid-cols-3 gap-3 mb-6">
                {positions.map((position, index) => {
                  const card = apiCards[index];
                  const isRevealed = revealedCards.includes(index);
                  
                  return (
                    <motion.div
                      key={position.key}
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: isRevealed ? 1 : 0.5, 
                        scale: isRevealed ? 1 : 0.8 
                      }}
                      transition={{ duration: 0.5, delay: index * 0.3 }}
                    >
                      <motion.div
                        className="w-24 h-36 mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-50 to-amber-100"
                        initial={{ rotateY: 180, scale: 0.8 }}
                        animate={{ rotateY: isRevealed ? 0 : 180, scale: isRevealed ? 1 : 0.8 }}
                        transition={{ duration: 1, delay: index * 0.3 }}
                      >
                        <ImageWithFallback
                          src={card.image || card.imagePath || '/images/placeholder.png'}
                          alt={card.name}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                      
                      <p className="text-gray-400 text-xs mt-1">{position.label}</p>
                      {isRevealed && (
                        <motion.div
                          className="mt-2 space-y-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        >
                          <p className="text-amber-400 text-xs font-semibold">
                            {card.name}
                          </p>
                          
                          {/* Кнопка подробного описания */}
                        <motion.button
                            className="w-full bg-slate-700/20 rounded-md p-1.5 border border-slate-500/10 cursor-pointer hover:bg-slate-600/30 transition-colors text-gray-400 text-xs"
                            onClick={() => openDescriptionModal(card)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              <span className="text-xs">ℹ️</span>
                              <span>Подробнее</span>
                          </div>
                        </motion.button>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
                      </div>

              {/* AI Interpretation */}
              {revealedCards.length === 3 && apiInterpretation && (
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.8 }}
                >
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-amber-400 text-sm font-semibold">Толкование карт</span>
                      <button
                        onClick={() => setIsInterpretationExpanded(prev => ({
                          ...prev,
                          main: !prev.main
                        }))}
                        className="text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        {isInterpretationExpanded.main ? '▲' : '▼'}
                      </button>
                    </div>
                    {isInterpretationExpanded.main && (
                      <div className="text-white text-sm leading-relaxed whitespace-pre-line">
                        {formatInterpretationText(apiInterpretation)}
                      </div>
                    )}
                    {!isInterpretationExpanded.main && (
                      <div className="text-white text-sm leading-relaxed">
                        {formatInterpretationText(apiInterpretation).substring(0, 200)}...
                      </div>
                    )}
                    </div>
                  </motion.div>
                )}

              {/* Уточняющие вопросы и ответы */}
                {clarifyingQuestions.length > 0 && (
                  <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 2.0 }}
                >
                  <h3 className="text-amber-400 text-lg font-semibold mb-4">Уточняющие вопросы</h3>
                  <div className="space-y-3">
                    {clarifyingQuestions.map((item, index) => (
                      <motion.div
                        key={index}
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        {/* Answer or Loading */}
                        {item.isLoading ? (
                          <div className="bg-purple-900/30 rounded-2xl p-4 border border-purple-400/30 mr-8">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-white font-bold">Т</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-purple-300 text-sm font-medium mb-2">Карты отвечают...</p>
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                  <span className="text-purple-200 text-xs">Получаем ответ от карт</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : item.answer ? (
                        <div className="space-y-4">
                          {/* Question */}
                            <div className="bg-blue-900/30 rounded-2xl p-4 border border-blue-400/30">
                              <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-xs text-white font-bold">В</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-blue-300 text-sm font-medium mb-1">Ваш вопрос</p>
                                  <p className="text-white text-sm leading-relaxed">{item.question}</p>
                                </div>
                              </div>
                          </div>

                            {/* Card */}
                            <div className="text-center">
                            <motion.div
                                className="w-32 h-48 mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-50 to-amber-100 mb-3"
                                initial={{ rotateY: 180, scale: 0.8 }}
                                animate={{ rotateY: 0, scale: 1 }}
                                transition={{ duration: 1, delay: 0.3 }}
                              >
                                <ImageWithFallback
                                  src={item.card?.image || item.card?.imagePath || '/images/placeholder.png'}
                                  alt={item.card?.name || 'Карта'}
                                className="w-full h-full object-cover"
                              />
                            </motion.div>
                              <h3 className="text-lg text-amber-400 mb-2">{item.card?.name || 'Карта'}</h3>
                              
                              {/* Кнопка подробного описания */}
                              <motion.button
                                className="w-full bg-slate-700/20 rounded-md p-1.5 border border-slate-500/10 cursor-pointer hover:bg-slate-600/30 transition-colors text-gray-400 text-xs mb-3"
                                onClick={() => openDescriptionModal(item.card)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  <span className="text-xs">ℹ️</span>
                                  <span>Подробнее</span>
                              </div>
                              </motion.button>
                              </div>

                            {/* Answer */}
                            <motion.div
                              className="bg-slate-800/50 rounded-2xl p-6 border border-slate-600/30"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 1 }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-amber-400 font-medium">Толкование карт</h4>
                                <button
                                  onClick={() => {
                                    // Создаем уникальный ключ для каждого уточняющего вопроса
                                    const questionKey = `clarifying-${index}`;
                                    setIsInterpretationExpanded(prev => ({
                                      ...prev,
                                      [questionKey]: !prev[questionKey]
                                    }));
                                  }}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  {isInterpretationExpanded[`clarifying-${index}`] ? '▲' : '▼'}
                                </button>
                            </div>
                              <div className="overflow-hidden">
                                <p className={`text-gray-300 leading-relaxed whitespace-pre-line transition-all duration-300 ${
                                  isInterpretationExpanded[`clarifying-${index}`] ? 'max-h-none opacity-100' : 'max-h-20 opacity-70'
                                }`}>
                                  {item.answer}
                                </p>
                                {!isInterpretationExpanded[`clarifying-${index}`] && (
                                  <div className="mt-2 text-xs text-gray-400">
                          </div>
                                )}
                          </div>
                            </motion.div>
                        </div>
                        ) : null}
                      </motion.div>
                    ))}
                  </div>
                  </motion.div>
                )}

              {/* Clarifying Question Section */}
              {revealedCards.length === 3 && (
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 2.5 }}
                >
                  {/* Add New Question Button */}
                  {!showClarifyingInput && (
                    <Button
                      onClick={() => setShowClarifyingInput(true)}
                      className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-500/30 rounded-xl py-3"
                    >
                      Задать уточняющий вопрос
                    </Button>
                  )}

                  {/* Question Input */}
                  {showClarifyingInput && (
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-600/30 space-y-4">
                      <textarea
                        value={currentClarifyingQuestion}
                        onChange={(e) => setCurrentClarifyingQuestion(e.target.value)}
                        placeholder="Задать уточняющий вопрос"
                        className="w-full h-20 px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-amber-400/50"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        onClick={submitClarifyingQuestion}
                        disabled={!currentClarifyingQuestion.trim()}
                        className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-400/30 rounded-lg py-2"
                      >
                        Отправить
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
              </motion.div>
            )}
        </div>

        {/* Bottom Action */}
        {showCards && (
          <motion.div
            className="px-4 pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.5 }}
          >
            <Button
                    onClick={() => {
                setShowCards(false);
                setSelectedCategory('');
                setUserQuestion('');
                      setRevealedCards([]);
                setApiCards([]);
                setApiInterpretation('');
                setError('');
                setExpandedCard(null);
                      setShowClarifyingQuestion(false);
                      setClarifyingQuestion('');
                setIsShuffling(false);
                setShowDescriptionModal(false);
                setSelectedCardForDescription(null);
                setIsInterpretationExpanded({});
                setCurrentReadingId(null);
                      setClarifyingQuestions([]);
                    }}
              className="w-full h-12 bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 text-white border-2 border-purple-400/30 rounded-2xl shadow-xl transition-all duration-300"
                  >
              Новый расклад
            </Button>
                </motion.div>
            )}

        {/* Модальное окно для подробного описания */}
        {showDescriptionModal && selectedCardForDescription && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDescriptionModal}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto border border-slate-600/30"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">
                  {selectedCardForDescription.name}
                </h3>
                <button
                  onClick={closeDescriptionModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <motion.div
                    className="w-32 h-48 mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-50 to-amber-100"
                    initial={{ rotateY: 180, scale: 0.8 }}
                    animate={{ rotateY: 0, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  >
                    <ImageWithFallback
                      src={selectedCardForDescription.image || selectedCardForDescription.imagePath || '/images/placeholder.png'}
                      alt={selectedCardForDescription.name}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-amber-400 text-sm font-medium mb-2">Значение:</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedCardForDescription.meaning}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-amber-400 text-sm font-medium mb-2">Совет:</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedCardForDescription.advice}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-amber-400 text-sm font-medium mb-2">Ключевые слова:</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedCardForDescription.keywords}
                    </p>
                  </div>
                  
                  {selectedCardForDescription.detailedDescription?.displayDescription && (
                    <div>
                      <h4 className="text-amber-400 text-sm font-medium mb-2">Подробное описание:</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {selectedCardForDescription.detailedDescription.displayDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
