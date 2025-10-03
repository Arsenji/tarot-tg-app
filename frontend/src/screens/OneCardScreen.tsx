'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { FloatingCard } from '@/components/FloatingCard';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { tarotCards } from '@/data/tarotCards';
import { apiService } from '@/services/api';

// Фоновые карты для атмосферы
const backgroundCards = [
  {
    src: "https://images.unsplash.com/photo-1632986248827-5bfc9101c24d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YXJvdCUyMGNhcmQlMjBteXN0aWNhbCUyMG9ybmF0ZSUyMGRlc2lnbnxlbnwxfHx8fDE3NTc3NjcyNDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    alt: "Mystical Tarot Card"
  }
];

interface TarotLoaderProps {
  message?: string;
}

export function TarotLoader({ message = "Перемешиваем карты..." }: TarotLoaderProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const messages = [
    "Перемешиваем карты...",
    "Настраиваемся на энергию...",
    "Раскладываем карты...",
    "Читаем символы..."
  ];

  // Определяем, мобильное ли устройство
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Оптимизируем количество карт для мобильных устройств
  const cards = Array.from({ length: isMobile ? 4 : 8 }, (_, i) => i);

  return (
    <div className="text-center">
      {/* Контейнер для карт */}
      <div className="relative w-24 h-36 mx-auto mb-6">
        {/* Основная колода */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-purple-600 to-purple-800 rounded-2xl border-2 border-yellow-400/50 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            boxShadow: '0 0 40px rgba(168, 85, 247, 0.5), inset 0 0 20px rgba(255, 215, 0, 0.2)',
          }}
          animate={{
            rotateY: [0, 5, -5, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        >
          {/* Узор на задней стороне карты */}
          <div className="absolute inset-2 bg-gradient-to-br from-yellow-400/20 to-purple-400/20 rounded-xl">
            <div className="absolute inset-0 bg-repeat opacity-30" 
                 style={{
                   backgroundImage: `radial-gradient(circle at 20% 20%, #ffd700 2px, transparent 2px),
                                    radial-gradient(circle at 80% 80%, #ffd700 1px, transparent 1px)`,
                   backgroundSize: '20px 20px'
                 }}
            />
            {/* Центральный символ */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-8 h-8 border-2 border-yellow-400 rounded-full flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Анимированные карты для эффекта перемешивания */}
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card}
              className="absolute inset-0 bg-gradient-to-b from-purple-600 to-purple-800 rounded-2xl border border-yellow-400/30"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                zIndex: card,
              }}
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
                opacity: 0.8,
              }}
              animate={isMobile ? {
                // Упрощенная анимация для мобильных устройств
                y: [0, -5, 0],
                rotate: [0, (card % 2 === 0 ? 3 : -3), 0],
                scale: [1, 0.98, 1],
                opacity: [0.8, 0.6, 0.8],
              } : {
                // Полная анимация для десктопа
                x: [0, Math.sin(card * 0.5) * 15, 0],
                y: [0, Math.cos(card * 0.5) * 10, 0],
                rotate: [0, (card % 2 === 0 ? 8 : -8), 0],
                scale: [1, 0.95, 1],
                opacity: [0.8, 0.4, 0.8],
              }}
              transition={{
                duration: isMobile ? 1.5 + (card * 0.05) : 2 + (card * 0.1),
                repeat: Infinity,
                delay: card * 0.1,
                ease: "easeInOut",
              }}
            />
          ))}
        </AnimatePresence>

        {/* Магические частицы вокруг карт */}
        {Array.from({ length: isMobile ? 3 : 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: `${50 + Math.sin(i * 0.5) * 60}px`,
              top: `${50 + Math.cos(i * 0.5) * 50}px`,
            }}
            animate={isMobile ? {
              // Упрощенная анимация частиц для мобильных
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            } : {
              // Полная анимация для десктопа
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: [0, Math.sin(i * 2) * 10, 0],
              y: [0, Math.cos(i * 2) * 10, 0],
            }}
            transition={{
              duration: isMobile ? 2 : 3,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Текст загрузки */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence mode="wait">
          <motion.h3
            key={currentMessage}
            className="text-lg text-yellow-300 mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {messages[currentMessage]}
          </motion.h3>
        </AnimatePresence>
        
        <motion.p 
          className="text-purple-200 text-sm opacity-80"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Карты готовят для вас особое послание
        </motion.p>
      </motion.div>

      {/* Анимированные точки загрузки */}
      <div className="flex space-x-2 mt-4 justify-center">
        {[0, 1, 2].map((dot) => (
          <motion.div
            key={dot}
            className="w-2 h-2 bg-yellow-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
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
    </div>
  );
}

interface OneCardScreenProps {
  onBack: () => void;
}

export function OneCardScreen({ onBack }: OneCardScreenProps) {
  const [selectedCard, setSelectedCard] = useState<typeof tarotCards[0] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [showDeck, setShowDeck] = useState(true); // Новое состояние для показа колоды
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedCardForDescription, setSelectedCardForDescription] = useState<any>(null);

  // Функции для модального окна подробного описания
  const openDescriptionModal = (card: any) => {
    setSelectedCardForDescription(card);
    setShowDescriptionModal(true);
  };

  const closeDescriptionModal = () => {
    setShowDescriptionModal(false);
    setSelectedCardForDescription(null);
  };

  // Функция для вытягивания случайной карты с AI советом
  const drawCard = async () => {
    setIsDrawing(true);
    setShowCard(false);
    setShowDeck(false); // Скрываем колоду
    setSelectedCard(null);
    setAiAdvice('');
    
    // Минимальное время показа лоадера (2 секунды)
    const minLoadingTime = 2000;
    const startTime = Date.now();
    
    try {
      // Получаем совет от AI
      const response = await apiService.getDailyAdvice();
      
      if (response.success && response.data) {
        // Преобразуем карту из API в формат локальных карт
        const apiCard = response.data.card;
        const localCard = {
          ...apiCard,
          image: apiCard.image || '/images/placeholder.png'
        };
        setSelectedCard(localCard);
        setAiAdvice(response.data.advice);
      } else {
        
        // Fallback к случайной карте, если API недоступен
        const randomCard = tarotCards[Math.floor(Math.random() * tarotCards.length)];
        setSelectedCard(randomCard);
        setAiAdvice(randomCard.advice);
      }
    } catch (error) {
      console.error('Error getting AI advice:', error);
      // Fallback к случайной карте
      const randomCard = tarotCards[Math.floor(Math.random() * tarotCards.length)];
      setSelectedCard(randomCard);
      setAiAdvice(randomCard.advice);
    }
    
    // Ждем минимальное время показа лоадера
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
    
    setTimeout(() => {
      setIsDrawing(false);
      
      setTimeout(() => {
        setShowCard(true);
      }, 300);
    }, remainingTime);
  };

  // Функция для сброса к начальному состоянию
  const resetToDeck = () => {
    setShowCard(false);
    setShowDeck(true);
    setSelectedCard(null);
    setAiAdvice('');
  };

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
        ].map((sparkle, i) => (
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

      {/* Background floating cards */}
      <FloatingCard
        src={backgroundCards[0].src}
        alt={backgroundCards[0].alt}
        delay={0.5}
        duration={6}
        x={5}
        y={10}
        rotation={-25}
        scale={0.3}
      />
      <FloatingCard
        src={backgroundCards[0].src}
        alt={backgroundCards[0].alt}
        delay={2}
        duration={5}
        x={90}
        y={15}
        rotation={30}
        scale={0.25}
      />
      <FloatingCard
        src={backgroundCards[0].src}
        alt={backgroundCards[0].alt}
        delay={1.5}
        duration={7}
        x={85}
        y={75}
        rotation={-20}
        scale={0.2}
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
            Совет дня
          </motion.h1>

          <motion.button
            onClick={resetToDeck}
            disabled={isDrawing}
            className="p-3 bg-amber-600/20 hover:bg-amber-600/30 rounded-2xl border border-amber-400/30 transition-all duration-300 disabled:opacity-50"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className="w-5 h-5 text-amber-400" />
          </motion.button>
        </motion.div>

        {/* Card Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Deck Display */}
          {showDeck && !isDrawing && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {/* Deck of cards */}
              <div className="relative w-24 h-36 mx-auto mb-8">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-20 h-32 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-amber-400/20 shadow-lg"
                    style={{
                      left: `${i * 1.5}px`,
                      top: `${i * 0.5}px`,
                      zIndex: 8 - i,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {/* Card back pattern */}
                    <div className="w-full h-full bg-gradient-to-br from-purple-600/30 to-amber-600/30 rounded-lg relative overflow-hidden">
                      {/* Card pattern lines */}
                      <div className="absolute inset-0">
                        <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/20 rounded-full"></div>
                        <div className="absolute top-4 left-2 right-2 h-0.5 bg-white/20 rounded-full"></div>
                        <div className="absolute top-6 left-2 right-2 h-0.5 bg-white/20 rounded-full"></div>
                        <div className="absolute bottom-6 left-2 right-2 h-0.5 bg-white/20 rounded-full"></div>
                        <div className="absolute bottom-4 left-2 right-2 h-0.5 bg-white/20 rounded-full"></div>
                        <div className="absolute bottom-2 left-2 right-2 h-0.5 bg-white/20 rounded-full"></div>
                      </div>
                      {/* Center symbol */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400/60 to-purple-400/60 rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 bg-white/30 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <motion.p
                className="text-white text-lg mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Колода карт готова к гаданию
              </motion.p>
            </motion.div>
          )}

          {/* Drawing Animation */}
          {isDrawing && (
            <TarotLoader message="Тасуем карты..." />
          )}

          {/* Selected Card */}
          {selectedCard && showCard && (
            <motion.div
              className="w-full max-w-sm text-center"
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              {/* Card Image */}
              <motion.div
                className="relative mx-auto mb-6"
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <div className="w-48 h-72 mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-50 to-amber-100">
                  <ImageWithFallback
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Magical glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl bg-amber-400/20"
                  animate={{
                    opacity: [0, 0.3, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* Card Name */}
              <motion.h2
                className="text-2xl text-amber-400 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {selectedCard.name}
              </motion.h2>

              {/* Кнопка подробного описания */}
              <motion.button
                className="w-full bg-slate-700/20 rounded-md p-1.5 border border-slate-500/10 cursor-pointer hover:bg-slate-600/30 transition-colors text-gray-400 text-xs mb-4"
                onClick={() => openDescriptionModal(selectedCard)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span className="text-xs">ℹ️</span>
                  <span>Подробнее</span>
                </div>
              </motion.button>

              {/* Keywords */}
              <motion.p
                className="text-amber-300/80 text-sm mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                {selectedCard.keywords}
              </motion.p>

              {/* Advice */}
              <motion.div
                className="bg-slate-800/50 rounded-2xl p-4 border border-slate-600/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <div className="flex items-center justify-center mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400 mr-2" />
                  <span className="text-amber-400 text-sm">Толкование</span>
                  <Sparkles className="w-4 h-4 text-amber-400 ml-2" />
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {aiAdvice || selectedCard.advice}
                </p>
              </motion.div>

              {/* Mystical decoration */}
              <motion.div
                className="text-2xl text-amber-400/60 mt-6"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 1, delay: 1.2 }}
              >
                ✦ ❋ ✦
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Bottom Action - Show only when deck is visible */}
        {showDeck && !isDrawing && (
          <motion.div
            className="px-4 pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            <Button
              onClick={drawCard}
              className="w-full h-12 bg-gradient-to-r from-amber-600/20 to-amber-500/20 hover:from-amber-600/30 hover:to-amber-500/30 text-white border-2 border-amber-400/30 rounded-2xl shadow-xl transition-all duration-300"
            >
              Вытянуть карту
            </Button>
          </motion.div>
        )}
      </div>

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
                    src={selectedCardForDescription.image || '/images/placeholder.png'}
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

export default OneCardScreen;
