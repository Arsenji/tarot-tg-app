import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'medium',
  animated = true,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    default: 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500',
    filled: 'bg-slate-700 border-0 text-white placeholder-gray-400 focus:ring-purple-500',
    outlined: 'bg-transparent border-2 border-slate-600/50 text-white placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500'
  };

  const sizeClasses = {
    small: 'px-3 py-2 text-sm rounded-md',
    medium: 'px-4 py-3 text-base rounded-lg',
    large: 'px-5 py-4 text-lg rounded-xl'
  };

  const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';

  const inputClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${errorClasses}
    ${className}
  `.trim();

  const iconSizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  const iconPaddingClasses = {
    small: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '',
    medium: leftIcon ? 'pl-12' : rightIcon ? 'pr-12' : '',
    large: leftIcon ? 'pl-14' : rightIcon ? 'pr-14' : ''
  };

  const inputWithIcons = (
    <div className="relative">
      {leftIcon && (
        <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${iconSizeClasses[size]}`}>
          {leftIcon}
        </div>
      )}
      
      <input
        ref={ref}
        className={`${inputClasses} ${iconPaddingClasses[size]}`}
        {...props}
      />
      
      {rightIcon && (
        <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${iconSizeClasses[size]}`}>
          {rightIcon}
        </div>
      )}
    </div>
  );

  const inputElement = leftIcon || rightIcon ? inputWithIcons : (
    <input
      ref={ref}
      className={inputClasses}
      {...props}
    />
  );

  const content = (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      
      {animated ? (
        <motion.div
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          {inputElement}
        </motion.div>
      ) : (
        inputElement
      )}
      
      {error && (
        <motion.p
          className="mt-2 text-sm text-red-400"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.p>
      )}
      
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );

  return content;
});

Input.displayName = 'Input';

export default Input;
