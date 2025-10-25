import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'medium',
  animated = true,
  resize = 'vertical',
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

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  };

  const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';

  const textareaClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${resizeClasses[resize]}
    ${errorClasses}
    ${className}
  `.trim();

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
          <textarea
            ref={ref}
            className={textareaClasses}
            {...props}
          />
        </motion.div>
      ) : (
        <textarea
          ref={ref}
          className={textareaClasses}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

export default Textarea;
