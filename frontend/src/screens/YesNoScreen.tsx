'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { FloatingCard } from '@/components/FloatingCard';
import { ArrowLeft, Send, X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { tarotCards } from '@/data/tarotCards';
import { apiService } from '@/services/api';

// Импорт TarotLoader из OneCardScreen
import { TarotLoader } from './OneCardScreen';

interface YesNoScreenProps {
  onBack: () => void;
  onSubscriptionRequired?: () => void;
}

interface YesNoResult {
  readingId?: string;
  question: string;
  card: {
    name: string;
    imagePath: string;
    keywords: string;
    meaning: string;
    advice: string;
    isMajorArcana: boolean;
    suit: string;
    number: number;
  };
  answer: string;
  yesNoAnswer?: 'Да' | 'Нет'; // Поле для точного определения ответа
  interpretation: string;
}

export function YesNoScreen({ onBack, onSubscriptionRequired }: YesNoScreenProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<YesNoResult | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<Array<{
    question: string;
    answer?: string;
    card?: any;
    yesNoAnswer?: 'Да' | 'Нет' | null;
    isLoading?: boolean;
  }>>([]);
  const [showClarifyingInput, setShowClarifyingInput] = useState(false);
  const [currentClarifyingQuestion, setCurrentClarifyingQuestion] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedCardForDescription, setSelectedCardForDescription] = useState<any>(null);
  const [isInterpretationExpanded, setIsInterpretationExpanded] = useState<{[key: string]: boolean}>({});

  // Валидация вопроса
  const validateQuestion = (text: string): boolean => {
    const trimmedText = text.trim();
    
    // Проверяем базовые условия
    if (trimmedText.length === 0 || !trimmedText.endsWith('?')) {
      return false;
    }
    
    // Проверяем минимальную длину (10 символов, как на бэкенде)
    if (trimmedText.length < 10) {
      return false;
    }
    
    // Проверяем на осмысленность - должны быть русские или английские слова
    const hasValidWords = /[а-яёА-ЯЁa-zA-Z]{2,}/.test(trimmedText);
    if (!hasValidWords) {
      return false;
    }
    
    // Проверяем, что это не только знаки препинания и пробелы
    const meaningfulChars = trimmedText.replace(/[^\wа-яёА-ЯЁ]/g, '').length;
    if (meaningfulChars < 3) {
      return false;
    }
    
    // Проверяем, что есть хотя бы одно слово длиннее 2 символов
    const words = trimmedText.split(/\s+/).filter(word => word.length > 2);
    if (words.length === 0) {
      return false;
    }
    
    return true;
  };

  // Начать расклад
  const startReading = async () => {
    if (!validateQuestion(question)) {
      setShowValidationError(true);
      return;
    }

    setIsLoading(true);
    setShowValidationError(false);

    try {
      const response = await apiService.getYesNoReading(question);
      
      // Проверяем, требуется ли подписка
      if (response.subscriptionRequired) {
        // Если требуется подписка, возвращаемся на главный экран
        // Статус подписки обновится автоматически через refreshSubscription
        if (onSubscriptionRequired) {
          onSubscriptionRequired();
        } else {
          onBack();
        }
        return;
      }
      
      if (response.success && response.data) {
        // Преобразуем формат ответа API в формат, который ожидает компонент
        const apiData = response.data;
        
        // Используем imagePath если он есть, иначе выбираем по isReversed
        let cardImage = apiData.card.imagePath;
        if (!cardImage) {
          cardImage = apiData.card.isReversed 
            ? apiData.card.reversedImage 
            : apiData.card.uprightImage;
        }
        // Если все еще нет, используем image или uprightImage как fallback
        if (!cardImage) {
          cardImage = apiData.card.image || apiData.card.uprightImage;
        }
        
        console.log('Card image path:', cardImage);
        console.log('Card data:', apiData.card);
        
        // Определяем ответ "Да" или "Нет" из API ответа
        // Берем первую строку ответа для определения
        let finalAnswer = 'НЕТ';
        let yesNoAnswer: 'Да' | 'Нет' = 'Нет';
        
        if (apiData.answer) {
          const firstLine = apiData.answer.split('\n')[0].trim().toUpperCase();
          if (firstLine === 'ДА' || firstLine.startsWith('ДА')) {
            finalAnswer = 'ДА';
            yesNoAnswer = 'Да';
          } else if (firstLine === 'НЕТ' || firstLine.startsWith('НЕТ')) {
            finalAnswer = 'НЕТ';
            yesNoAnswer = 'Нет';
          }
        }
        
        setResult({
          question,
          card: {
            name: apiData.card.name,
            imagePath: cardImage,
            keywords: '',
            meaning: apiData.card.isReversed 
              ? apiData.card.reversedInterpretation 
              : apiData.card.uprightInterpretation,
            advice: apiData.interpretation,
            isMajorArcana: apiData.card.category === 'major',
            suit: apiData.card.category,
            number: 0,
          },
          answer: finalAnswer,
          yesNoAnswer: yesNoAnswer, // Добавляем поле для точного определения
          interpretation: apiData.interpretation,
        });
      } else {
        // Проверяем, требуется ли подписка
        
        // Fallback к случайной карте
        const randomCard = tarotCards[Math.floor(Math.random() * tarotCards.length)];
        const randomAnswer = Math.random() > 0.5 ? 'yes' : 'no';
        
        setResult({
          question,
          card: {
            name: randomCard.name,
            imagePath: randomCard.image,
            keywords: randomCard.keywords,
            meaning: randomCard.meaning,
            advice: randomCard.advice,
            isMajorArcana: randomCard.isMajorArcana,
            suit: randomCard.suit ?? '',
            number: randomCard.number ?? 0,
          },
          answer: randomAnswer === 'yes' ? 'ДА' : 'НЕТ',
          interpretation: `На основе карты "${randomCard.name}" ответ: ${randomAnswer === 'yes' ? 'Да' : 'Нет'}. ${randomCard.advice}`,
        });
      }
    } catch (error) {
      console.error('Error getting yes/no answer:', error);
      // Fallback к случайной карте
      const randomCard = tarotCards[Math.floor(Math.random() * tarotCards.length)];
      const randomAnswer = Math.random() > 0.5 ? 'yes' : 'no';
      
      setResult({
        question,
        card: {
          name: randomCard.name,
          imagePath: randomCard.image,
          keywords: randomCard.keywords,
          meaning: randomCard.meaning,
          advice: randomCard.advice,
          isMajorArcana: randomCard.isMajorArcana,
          suit: randomCard.suit ?? '',
          number: randomCard.number ?? 0,
        },
        answer: randomAnswer === 'yes' ? 'ДА' : 'НЕТ',
        interpretation: `На основе карты "${randomCard.name}" ответ: ${randomAnswer === 'yes' ? 'Да' : 'Нет'}. ${randomCard.advice}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Отправить уточняющий вопрос
  const submitClarifyingQuestion = async () => {
    if (!currentClarifyingQuestion.trim() || !result) return;

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
      console.log('Card data:', result.card);
      console.log('Original question:', result.question);
      
      // Используем API для получения ответа от ChatGPT
      const originalQuestion = result.question || question;
      const response = await apiService.getClarifyingAnswer(
        questionText,
        result.card,
        result.interpretation,
        'yesno',
        result.readingId,
        originalQuestion // Передаем оригинальный вопрос
      );

      console.log('API Response:', response);
      console.log('Response success:', response.success);
      console.log('Response data:', response.data);

      // Проверяем структуру ответа
      let answer = 'Карты говорят, что ответ на ваш уточняющий вопрос требует более глубокого размышления.';
      let clarifyingCard = result.card; // Используем карту из основного результата по умолчанию
      let yesNoAnswer: 'Да' | 'Нет' | null = null;
      
      if (response.success && response.data) {
        // Ожидаемая структура: response.data.answer / response.data.card / response.data.yesNoAnswer
        if (response.data.answer) {
          answer = response.data.answer;
          clarifyingCard = response.data.card || result.card;
          yesNoAnswer = response.data.yesNoAnswer || null;
        } else {
          console.error('Answer not found in response data:', response.data);
        }
      } else {
        console.error('API request failed:', response.error);
      }

      // Если yesNoAnswer не получен из API, извлекаем его из текста ответа
      if (!yesNoAnswer && answer) {
        const firstLine = answer.split('\n')[0].trim().toUpperCase();
        if (firstLine.includes('НЕТ') || firstLine.startsWith('НЕТ')) {
          yesNoAnswer = 'Нет';
        } else if (firstLine.includes('ДА') || firstLine.startsWith('ДА')) {
          yesNoAnswer = 'Да';
        }
      }

      console.log('Final answer:', answer);
      console.log('Clarifying card:', clarifyingCard);
      console.log('Yes/No answer:', yesNoAnswer);

      // Обновляем вопрос с полученным ответом и картой
      setClarifyingQuestions(prev => 
        prev.map((q, index) => 
          index === prev.length - 1 
            ? { ...q, answer, card: clarifyingCard, yesNoAnswer, isLoading: false }
            : q
        )
      );
    } catch (error) {
      console.error('Error getting clarifying answer:', error);
      
      // Обновляем вопрос с ошибкой
      setClarifyingQuestions(prev => 
        prev.map((q, index) => 
          index === prev.length - 1 
            ? { ...q, answer: 'Карты говорят, что ответ на ваш уточняющий вопрос требует более глубокого размышления.', isLoading: false }
            : q
        )
      );
    }
  };

  // Функции для модального окна подробного описания
  const openDescriptionModal = (card: any) => {
    // Если карта не имеет полных данных (meaning, advice, keywords), дополняем их из локального источника
    let enrichedCard = { ...card };
    
    // Ищем карту по имени в локальных данных (синхронно, так как tarotCards уже импортирован)
    const localCard = tarotCards.find(c => {
      const cardName = card.name?.toLowerCase().trim();
      const localName = c.name?.toLowerCase().trim();
      return cardName === localName;
    });
    
    if (localCard) {
      // Дополняем карту данными из локального источника
      enrichedCard = {
        ...card,
        meaning: card.meaning || localCard.meaning || card.uprightInterpretation || card.reversedInterpretation || 'Значение карты',
        advice: card.advice || localCard.advice || card.interpretation || 'Совет карты',
        keywords: card.keywords || localCard.keywords || 'Ключевые слова'
      };
    } else {
      // Если карта не найдена, используем значения по умолчанию или из интерпретации
      enrichedCard = {
        ...card,
        meaning: card.meaning || card.uprightInterpretation || card.reversedInterpretation || 'Значение карты',
        advice: card.advice || card.interpretation || 'Совет карты',
        keywords: card.keywords || 'Ключевые слова'
      };
    }
    
    console.log('Opening description modal for card:', enrichedCard);
    console.log('Card has meaning:', !!enrichedCard.meaning);
    console.log('Card has advice:', !!enrichedCard.advice);
    console.log('Card has keywords:', !!enrichedCard.keywords);
    
    setSelectedCardForDescription(enrichedCard);
    setShowDescriptionModal(true);
  };

  const closeDescriptionModal = () => {
    setShowDescriptionModal(false);
    setSelectedCardForDescription(null);
  };

  // Начать заново
  const resetReading = () => {
    setQuestion('');
    setResult(null);
    setClarifyingQuestions([]);
    setCurrentClarifyingQuestion('');
    setShowClarifyingInput(false);
    setShowValidationError(false);
    setShowDescriptionModal(false);
    setSelectedCardForDescription(null);
    setIsInterpretationExpanded({});
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 overflow-y-auto">
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
        {[
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
        ].map((sparkle, index) => (
          <motion.div
            key={index}
            className="absolute w-1 h-1 bg-amber-300 rounded-full"
            style={{ left: `${sparkle.left}%`, top: `${sparkle.top}%` }}
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

      {/* Floating cards */}
      <FloatingCard
        src="/rider-waite-tarot/major_arcana_fool.png"
        alt="Шут"
        delay={0}
        duration={8}
        x={8}
        y={12}
        rotation={-22}
        scale={0.3}
      />
      <FloatingCard
        src="/rider-waite-tarot/major_arcana_magician.png"
        alt="Маг"
        delay={2}
        duration={5}
        x={90}
        y={15}
        rotation={30}
        scale={0.25}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
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
            Да/Нет
          </motion.h1>

          <div className="w-11 h-11" /> {/* Spacer to center the title */}
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col px-4 pb-8">
          {!result && !isLoading && (
            <motion.div
              className="flex-1 flex flex-col justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Question Input */}
              <div className="max-w-md mx-auto w-full space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl text-amber-400 mb-3">Задайте свой вопрос</h2>
                  <p className="text-gray-300 text-sm">
                    Сформулируйте вопрос, на который можно ответить "да" или "нет"
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Например: Стоит ли мне менять работу?"
                      className="w-full h-24 px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50"
                      maxLength={200}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                      {question.length}/200
                    </div>
                  </div>

                  <Button
                    onClick={startReading}
                    disabled={!question.trim()}
                    className="w-full h-12 bg-gradient-to-r from-amber-600/20 to-amber-500/20 hover:from-amber-600/30 hover:to-amber-500/30 text-white border-2 border-amber-400/30 rounded-2xl shadow-xl transition-all duration-300 disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Начать расклад
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <TarotLoader message="Ищем ответ в картах..." />
            </div>
          )}

          {/* Result */}
          {result && !isLoading && (
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="max-w-md mx-auto space-y-6">
                {/* Question */}
                <div className="text-center">
                  <h3 className="text-lg text-gray-300 mb-2">Ваш вопрос:</h3>
                  <p className="text-white font-medium">{result.question}</p>
                </div>

                {/* Card */}
                <div className="text-center">
                  <motion.div
                    className="w-48 h-72 mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-50 to-amber-100 mb-4"
                    initial={{ rotateY: 180, scale: 0.8 }}
                    animate={{ rotateY: 0, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                  >
                    <ImageWithFallback
                      src={result.card.imagePath}
                      alt={result.card.name}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <h3 className="text-xl text-amber-400 mb-2">{result.card.name}</h3>
                  
                  {/* Кнопка подробного описания */}
                  <motion.button
                    className="w-full bg-slate-700/20 rounded-md p-1.5 border border-slate-500/10 cursor-pointer hover:bg-slate-600/30 transition-colors text-gray-400 text-xs"
                    onClick={() => openDescriptionModal(result.card)}
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
                  className={`text-center p-6 rounded-2xl border-2 ${
                    (result.yesNoAnswer === 'Да' || result.answer.toUpperCase().trim() === 'ДА')
                      ? 'bg-green-900/30 border-green-400/30'
                      : 'bg-red-900/30 border-red-400/30'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div className="text-4xl mb-2">
                    {(result.yesNoAnswer === 'Да' || result.answer.toUpperCase().trim() === 'ДА') ? '✅' : '❌'}
                  </div>
                  <h2 className={`text-3xl font-bold mb-2 ${
                    (result.yesNoAnswer === 'Да' || result.answer.toUpperCase().trim() === 'ДА') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.yesNoAnswer || result.answer}
                  </h2>
                </motion.div>

                {/* Interpretation */}
                <motion.div
                  className="bg-slate-800/50 rounded-2xl p-6 border border-slate-600/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-amber-400 font-medium">Толкование карт</h4>
                    <button
                      onClick={() => setIsInterpretationExpanded(prev => ({
                        ...prev,
                        main: !prev.main
                      }))}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {isInterpretationExpanded.main ? '▲' : '▼'}
                    </button>
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-gray-300 leading-relaxed whitespace-pre-line transition-all duration-300 ${
                      isInterpretationExpanded.main ? 'max-h-none opacity-100' : 'max-h-20 opacity-70'
                    }`}>
                      {result.interpretation}
                    </p>
                    {!isInterpretationExpanded.main && (
                      <div className="mt-2 text-xs text-gray-400">
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Clarifying Questions */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  {/* Questions List */}
                  {clarifyingQuestions.length > 0 && (
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
                                      {[0, 1, 2].map((dot) => (
                                        <motion.div
                                          key={dot}
                                          className="w-2 h-2 bg-purple-400 rounded-full"
                                          animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.4, 1, 0.4],
                                          }}
                                          transition={{
                                            duration: 1.5,
                                            repeat: Infinity,
                                            delay: dot * 0.2,
                                          }}
                                        />
                                      ))}
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
                                    src={item.card?.imagePath || '/images/placeholder.png'}
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
                                className={`text-center p-6 rounded-2xl border-2 ${
                                  (item.yesNoAnswer === 'Да' || (item.answer && item.answer.split('\n')[0].toUpperCase().includes('ДА')))
                                    ? 'bg-green-900/30 border-green-400/30'
                                    : 'bg-red-900/30 border-red-400/30'
                                }`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.8 }}
                              >
                                <div className="text-4xl mb-2">
                                  {(item.yesNoAnswer === 'Да' || (item.answer && item.answer.split('\n')[0].toUpperCase().includes('ДА'))) ? '✅' : '❌'}
                                </div>
                                <h2 className={`text-3xl font-bold mb-2 ${
                                  (item.yesNoAnswer === 'Да' || (item.answer && item.answer.split('\n')[0].toUpperCase().includes('ДА')))
                                    ? 'text-green-400' 
                                    : 'text-red-400'
                                }`}>
                                  {item.yesNoAnswer || (item.answer ? item.answer.split('\n')[0] : 'Нет')}
                                </h2>
                              </motion.div>

                              {/* Interpretation */}
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
                                    {item.answer.split('\n').length > 1 ? item.answer.split('\n').slice(1).join('\n') : 'Карты дают вам мудрый совет для решения вашего вопроса.'}
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
                  )}

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

                {/* New Reading Button */}
                <Button
                  onClick={resetReading}
                  className="w-full bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600/30 hover:to-purple-500/30 text-white border border-purple-400/30 rounded-xl py-3"
                >
                  Задать новый вопрос
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Validation Error Modal */}
      <AnimatePresence>
        {showValidationError && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowValidationError(false)}
          >
            <motion.div
              className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 max-w-sm w-full border border-slate-600/30 shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg text-white font-medium">Неверный формат вопроса</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Пожалуйста, сформулируйте осмысленный вопрос, который заканчивается знаком вопроса (?).
                Вопрос должен содержать реальные слова, быть понятным и содержать не менее 10 символов.
                <br /><br />
                Например: "Стоит ли мне принять это предложение?"
              </p>
              <Button
                onClick={() => setShowValidationError(false)}
                className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-400/30 rounded-lg"
              >
                Понятно
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно для подробного описания */}
      <AnimatePresence>
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
                  <ImageWithFallback
                    src={selectedCardForDescription.imagePath || '/images/placeholder.png'}
                    alt={selectedCardForDescription.name}
                    className="w-32 h-48 mx-auto rounded-lg object-cover"
                  />
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
