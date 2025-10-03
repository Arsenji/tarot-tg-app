import React from 'react';
import { motion } from 'motion/react';

interface FloatingCardProps {
  src: string;
  alt: string;
  delay: number;
  duration: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export const FloatingCard: React.FC<FloatingCardProps> = ({
  src,
  alt,
  delay,
  duration,
  x,
  y,
  rotation,
  scale
}) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ 
        opacity: 0, 
        scale: 0,
        rotate: rotation - 10
      }}
      animate={{ 
        opacity: [0, 0.7, 0.7, 0],
        scale: [0, scale, scale, 0],
        rotate: [rotation - 10, rotation, rotation, rotation + 10],
        y: [0, -20, -20, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="relative">
        <img
          src={src}
          alt={alt}
          className="w-20 h-32 object-cover rounded-lg shadow-2xl"
          style={{
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
          }}
        />
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)',
            backdropFilter: 'blur(1px)',
          }}
        />
      </div>
    </motion.div>
  );
};
