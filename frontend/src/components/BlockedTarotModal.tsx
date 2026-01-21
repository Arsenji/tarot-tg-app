'use client';

import React, { useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { TarotType } from '@/state/subscriptionStore';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe?: () => void;
  tarotType: TarotType;
  nextAvailableAt?: Date;
};

function formatTime(date: Date): string {
  // Локальное время пользователя (Telegram WebApp / браузер)
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function BlockedTarotModal({ isOpen, onClose, onSubscribe, tarotType, nextAvailableAt }: Props) {
  const timeText = useMemo(() => {
    if (!nextAvailableAt) return null;
    return `Доступен снова: ${formatTime(nextAvailableAt)}`;
  }, [nextAvailableAt]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Расклад недоступен" closeOnOverlayClick closeOnEscape>
      <div className="space-y-4">
        <p className="text-gray-200 text-sm leading-relaxed">
          Этот расклад можно использовать только один раз в 24 часа.
        </p>

        {timeText ? (
          <p className="text-gray-200 text-sm leading-relaxed">{timeText}</p>
        ) : (
          <p className="text-gray-200 text-sm leading-relaxed">Он будет доступен снова через 24 часа.</p>
        )}

        <p className="text-gray-300 text-sm leading-relaxed">
          Оформите подписку, чтобы получать расклады без ограничений.
        </p>

        <div className="pt-2 flex items-center justify-end gap-3">
          {onSubscribe && (
            <Button
              onClick={onSubscribe}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-medium rounded-xl transition-all duration-300"
            >
              Оформить подписку
            </Button>
          )}
          <Button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-gray-200 border border-slate-400/30 rounded-xl text-sm font-medium transition-all duration-300"
          >
            Понятно
          </Button>
        </div>
      </div>
    </Modal>
  );
}

