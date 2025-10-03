'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { FloatingCard } from '@/components/FloatingCard';
import { TarotLogo } from '@/components/TarotLogo';
import { Sparkles, Moon, Star } from 'lucide-react';

const tarotCards = [
  {
    src: "/rider-waite-tarot/major_arcana_fool.png",
    alt: "Шут"
  },
  {
    src: "/rider-waite-tarot/major_arcana_magician.png",
    alt: "Маг"
  },
  {
    src: "/rider-waite-tarot/major_arcana_priestess.png",
    alt: "Жрица"
  },
  {
    src: "/rider-waite-tarot/major_arcana_empress.png",
    alt: "Императрица"
  }
];

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const handleStart = () => {
    onStart();
  };

  return (
    <div className="relative h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        
                {/* Animated Stars */}
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
                ].map((star, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${star.left}%`,
                      top: `${star.top}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: star.duration,
                      repeat: Infinity,
                      delay: star.delay,
                    }}
                  />
                ))}

        {/* Mystical Orbs */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-32 right-8 w-24 h-24 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      {/* Floating Tarot Cards */}
      <FloatingCard
        src={tarotCards[0].src}
        alt={tarotCards[0].alt}
        delay={0.5}
        duration={4}
        x={8}
        y={12}
        rotation={-12}
        scale={0.7}
      />
      <FloatingCard
        src={tarotCards[1].src}
        alt={tarotCards[1].alt}
        delay={1.5}
        duration={5}
        x={85}
        y={18}
        rotation={18}
        scale={0.6}
      />
      <FloatingCard
        src={tarotCards[0].src}
        alt={tarotCards[0].alt}
        delay={2.5}
        duration={4.5}
        x={88}
        y={68}
        rotation={-8}
        scale={0.5}
      />
      <FloatingCard
        src={tarotCards[1].src}
        alt={tarotCards[1].alt}
        delay={1}
        duration={5.5}
        x={3}
        y={78}
        rotation={22}
        scale={0.4}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-screen px-6 py-8 safe-area-inset">
        {/* Header with mystical elements */}
        <motion.div
          className="absolute top-16 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div className="flex items-center space-x-2 text-white/60">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">Таро Онлайн</span>
            <Star className="w-4 h-4" />
          </div>
        </motion.div>

        {/* Logo/Title Area */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            className="text-center px-6"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.8 }}
          >
            {/* Enhanced Logo */}
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 1.2, type: "spring", bounce: 0.4 }}
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                <span className="text-3xl font-bold text-white relative z-10">🔮</span>
              </div>
              
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-amber-400/50 to-orange-500/50 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              Таро Гадание
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-purple-200 mb-4 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.8 }}
            >
              Онлайн консультации
            </motion.p>

            {/* Description */}
            <motion.p
              className="text-base text-gray-300 max-w-sm mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2.1 }}
            >
              Погрузитесь в мир мистики и откройте тайны своей судьбы с помощью древних карт Таро
            </motion.p>

            {/* Features */}
            <motion.div
              className="flex justify-center space-x-6 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 2.4 }}
            >
              <div className="flex items-center space-x-2 text-purple-200">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">Точные предсказания</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-200">
                <Moon className="w-4 h-4" />
                <span className="text-sm">24/7 доступ</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          className="w-full max-w-sm px-6 pb-8"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 2.7 }}
        >
          {/* Enhanced Start Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleStart}
              className="w-full h-14 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500 text-white rounded-2xl shadow-2xl border border-white/20 transition-all duration-300 relative overflow-hidden group"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
              <span className="text-lg font-semibold relative z-10 flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Начать гадание</span>
              </span>
            </Button>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
