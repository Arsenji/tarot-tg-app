'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { allCards } from '@/data/tarotCards';

interface FloatingCard {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
  duration: number;
  opacity: number;
  isVisible: boolean;
  cardName: string;
  imagePath: string;
}

const RealisticBackgroundCards: React.FC = () => {
  const [cards, setCards] = useState<FloatingCard[]>([]);

  const generateCard = (id: string): FloatingCard => {
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    return {
      id,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: (Math.random() - 0.5) * 60, // -30 до 30 градусов
      scale: 0.3 + Math.random() * 0.2, // 0.3 до 0.5
      delay: Math.random() * 2,
      duration: 12 + Math.random() * 6, // 12-18 секунд
      opacity: 0,
      isVisible: false,
      cardName: randomCard.name,
      imagePath: randomCard.imagePath,
    };
  };

  useEffect(() => {
    const initialCards = Array.from({ length: 6 }, (_, i) => 
      generateCard(`card-${i}`)
    );
    setCards(initialCards);

    initialCards.forEach((card, index) => {
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, isVisible: true, opacity: 1 } : c
        ));
      }, card.delay * 1000);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCards(prev => {
        return prev.map(card => {
          if (card.isVisible && Math.random() < 0.2) { // Вероятность скрытия
            return { ...card, isVisible: false };
          }
          return card;
        }).concat(
          prev.filter(card => !card.isVisible).length < 4 && Math.random() < 0.5 ? // Вероятность появления
            [generateCard(`card-${Date.now()}-${Math.random()}`)] : []
        );
      });
    }, 2500); // Интервал для появления новых карт

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {cards.map((card) => (
          card.isVisible && (
            <motion.div
              key={card.id}
              className="absolute"
              style={{
                left: `${card.x}%`,
                top: `${card.y}%`,
              }}
              initial={{ 
                opacity: 0, 
                scale: 0,
                rotate: card.rotation,
                y: 30,
                x: 0
              }}
              animate={{ 
                opacity: card.opacity,
                scale: card.scale,
                rotate: card.rotation + (Math.random() - 0.5) * 8,
                y: [0, -12, 0],
                x: [0, 0, 0] // Убрано случайное смещение по X
              }}
              exit={{ 
                opacity: 0, 
                scale: 0,
                rotate: card.rotation + 90,
                y: -30,
                x: 0
              }}
              transition={{
                duration: card.duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: [0.4, 0.0, 0.2, 1], // Плавная кривая
                opacity: {
                  duration: 3,
                  ease: [0.4, 0.0, 0.2, 1]
                },
                scale: {
                  duration: 2,
                  ease: [0.4, 0.0, 0.2, 1]
                },
                rotate: {
                  duration: card.duration * 1.2,
                  ease: "easeInOut"
                },
                y: {
                  duration: card.duration * 0.8,
                  ease: [0.4, 0.0, 0.2, 1]
                }
              }}
            >
              {/* Карта Райдера-Уэйта */}
              <div className="relative w-24 h-36 rounded-lg shadow-lg border border-amber-200/50 overflow-hidden">
                {/* Изображение карты */}
                <img 
                  src={card.imagePath} 
                  alt={card.cardName}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                
                {/* Fallback карта */}
                <div className="hidden w-full h-full bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-200">
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    <div className="text-amber-800 text-xs font-semibold text-center mb-1">
                      {card.cardName}
                    </div>
                    <div className="w-8 h-8 bg-amber-300 rounded-full flex items-center justify-center">
                      <span className="text-amber-800 text-lg">✦</span>
                    </div>
                    <div className="mt-1 w-full h-1 bg-amber-200 rounded"></div>
                    <div className="mt-1 flex space-x-1">
                      <div className="w-1 h-1 bg-amber-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-amber-300 rounded-full"></div>
                      <div className="w-1 h-1 bg-amber-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        ))}
      </AnimatePresence>
    </div>
  );
};

export default RealisticBackgroundCards;
