'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { X, Crown, Star, Calendar, Sparkles } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  showHistoryMessage?: boolean;
}

export function SubscriptionModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  showHistoryMessage = false 
}: SubscriptionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-slate-600/30 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-600/20 rounded-xl border border-amber-400/30">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-white text-lg font-semibold">{title}</h3>
              </div>
              <Button
                onClick={onClose}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <p className="text-gray-200 text-sm leading-relaxed">
                {message}
              </p>

              {showHistoryMessage && (
                <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-500/30">
                  <p className="text-gray-300 text-sm">
                    История доступна только по подписке. Оформите её прямо сейчас!
                  </p>
                </div>
              )}

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-amber-600/20 rounded-lg">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-gray-300 text-sm">Неограниченные расклады "Совет дня"</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-emerald-600/20 rounded-lg">
                    <Star className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300 text-sm">Неограниченные расклады "Да/Нет"</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-purple-600/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-gray-300 text-sm">Неограниченные расклады "3 карты"</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-blue-600/20 rounded-lg">
                    <Crown className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300 text-sm">Полная история всех раскладов</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={onClose}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-gray-300 border border-slate-400/30 rounded-lg text-sm font-medium transition-all duration-300"
              >
                Закрыть
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}