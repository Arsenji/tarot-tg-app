import React from 'react';
import { motion } from 'motion/react';

interface TarotLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
}

export const TarotLogo: React.FC<TarotLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  animated = false 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  const LogoIcon = () => (
    <motion.div
      className={`${sizeClasses[size]} bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg`}
      animate={animated ? {
        rotate: [0, 5, -5, 0],
        scale: [1, 1.05, 1],
      } : {}}
      transition={animated ? {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    >
      <span className="text-white text-lg font-bold">🔮</span>
    </motion.div>
  );

  if (!showText) {
    return <LogoIcon />;
  }

  return (
    <div className="flex items-center space-x-3">
      <LogoIcon />
      <div>
        <h1 className={`${textSizeClasses[size]} text-white font-bold`}>Таро</h1>
        <p className="text-xs text-gray-300">Гадание</p>
      </div>
    </div>
  );
};
