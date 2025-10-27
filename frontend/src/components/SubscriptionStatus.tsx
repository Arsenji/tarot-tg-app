'use client';

import { motion } from 'motion/react';
import { Crown, Star, Calendar, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionStatusProps {
  subscriptionInfo?: {
    hasSubscription: boolean;
    isExpired: boolean;
    canUseYesNo: boolean;
    canUseThreeCards: boolean;
    canUseDailyAdvice: boolean;
    historyLimit: number;
  };
  onUpgrade?: () => void;
  compact?: boolean;
}

export function SubscriptionStatus({ 
  subscriptionInfo, 
  onUpgrade, 
  compact = false 
}: SubscriptionStatusProps) {
  if (!subscriptionInfo) return null;

  const getStatusColor = () => {
    if (subscriptionInfo.hasSubscription && !subscriptionInfo.isExpired) {
      return 'text-emerald-400';
    }
    if (subscriptionInfo.isExpired) {
      return 'text-amber-400';
    }
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (subscriptionInfo.hasSubscription && !subscriptionInfo.isExpired) {
      return 'Активная подписка';
    }
    if (subscriptionInfo.isExpired) {
      return 'Подписка истекла';
    }
    return 'Бесплатный доступ';
  };

  const getStatusIcon = () => {
    if (subscriptionInfo.hasSubscription && !subscriptionInfo.isExpired) {
      return <Crown className="w-4 h-4 text-emerald-400" />;
    }
    if (subscriptionInfo.isExpired) {
      return <Crown className="w-4 h-4 text-amber-400" />;
    }
    return <Star className="w-4 h-4 text-gray-400" />;
  };

  if (compact) {
    return (
      <motion.div
        className="flex items-center space-x-2"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {!subscriptionInfo.hasSubscription && onUpgrade && (
          <Button
            onClick={onUpgrade}
            size="sm"
            className="ml-2 px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-400/30 rounded-lg text-xs"
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-600/30"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </h3>
            <p className="text-gray-400 text-sm">
              {subscriptionInfo.hasSubscription && !subscriptionInfo.isExpired
                ? 'Полный доступ ко всем функциям'
                : 'Ограниченный доступ к функциям'
              }
            </p>
          </div>
        </div>
        {!subscriptionInfo.hasSubscription && onUpgrade && (
          <Button
            onClick={onUpgrade}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-medium rounded-xl transition-all duration-300"
          >
            <Crown className="w-4 h-4 mr-2" />
            Оформить подписку
          </Button>
        )}
      </div>

      {/* Features Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className={`w-4 h-4 ${subscriptionInfo.canUseDailyAdvice ? 'text-emerald-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${subscriptionInfo.canUseDailyAdvice ? 'text-white' : 'text-gray-500'}`}>
            Совет дня
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Star className={`w-4 h-4 ${subscriptionInfo.canUseYesNo ? 'text-emerald-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${subscriptionInfo.canUseYesNo ? 'text-white' : 'text-gray-500'}`}>
            Да/Нет
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Calendar className={`w-4 h-4 ${subscriptionInfo.canUseThreeCards ? 'text-emerald-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${subscriptionInfo.canUseThreeCards ? 'text-white' : 'text-gray-500'}`}>
            3 карты
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className={`w-4 h-4 ${subscriptionInfo.historyLimit > 3 ? 'text-emerald-400' : 'text-gray-500'}`} />
          <span className={`text-sm ${subscriptionInfo.historyLimit > 3 ? 'text-white' : 'text-gray-500'}`}>
            История ({subscriptionInfo.historyLimit})
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Доступ к функциям</span>
          <span>
            {[
              subscriptionInfo.canUseDailyAdvice,
              subscriptionInfo.canUseYesNo,
              subscriptionInfo.canUseThreeCards,
              subscriptionInfo.historyLimit > 3
            ].filter(Boolean).length}/4
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${([
                subscriptionInfo.canUseDailyAdvice,
                subscriptionInfo.canUseYesNo,
                subscriptionInfo.canUseThreeCards,
                subscriptionInfo.historyLimit > 3
              ].filter(Boolean).length / 4) * 100}%` 
            }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default SubscriptionStatus;
