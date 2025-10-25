import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
  className?: string;
  animated?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  padding = 'medium',
  className = '',
  animated = true,
  hover = false,
  onClick,
  ...props
}) => {
  const baseClasses = 'transition-all duration-200';

  const variantClasses = {
    default: 'bg-slate-800/90 backdrop-blur-sm border border-slate-600/30',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20',
    elevated: 'bg-slate-800/95 backdrop-blur-sm border border-slate-600/30 shadow-2xl',
    outlined: 'bg-transparent border-2 border-slate-600/50'
  };

  const sizeClasses = {
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl'
  };

  const paddingClasses = {
    none: '',
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6'
  };

  const hoverClasses = hover ? 'hover:bg-slate-700/90 hover:border-slate-500/50 cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const cardClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${paddingClasses[padding]}
    ${hoverClasses}
    ${clickableClasses}
    ${className}
  `.trim();

  const cardContent = (
    <div
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );

  if (animated && hover) {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};

export default Card;
