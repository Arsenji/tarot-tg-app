/**
 * Глобальный стор статуса подписки/доступности раскладов.
 *
 * Требования:
 * - Один запрос /api/tarot/subscription-status на старт приложения (shared in-flight Promise)
 * - Pessimistic locking: пока loaded=false — UI обязан быть заблокирован
 * - Без setTimeout/костылей: только deterministic state + shared promise
 */
import { apiService } from '@/services/api';
import { useEffect, useState } from 'react';

export type SubscriptionInfo = any;

export type SubscriptionState = {
  loaded: boolean;
  loading: boolean;
  error?: string;
  subscriptionInfo: SubscriptionInfo;
};

const LOCKED_DEFAULT: SubscriptionInfo = {
  hasSubscription: false,
  canUseDailyAdvice: false,
  canUseYesNo: false,
  canUseThreeCards: false,
  remainingDailyAdvice: 0,
  remainingYesNo: 0,
  remainingThreeCards: 0,
};

let state: SubscriptionState = {
  loaded: false,
  loading: false,
  subscriptionInfo: LOCKED_DEFAULT,
};

const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function emit() {
  for (const l of listeners) l();
}

function safeGetCachedInfo(): SubscriptionInfo | null {
  try {
    if (typeof window === 'undefined') return null;
    const cached = localStorage.getItem('subscriptionStatusCache');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed?.subscriptionInfo ?? null;
  } catch {
    return null;
  }
}

function safeSetCachedInfo(info: SubscriptionInfo) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem('subscriptionStatusCache', JSON.stringify({ ts: Date.now(), subscriptionInfo: info }));
  } catch {
    // ignore cache errors
  }
}

export function getSubscriptionSnapshot(): SubscriptionState {
  return state;
}

export function subscribeSubscription(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(partial: Partial<SubscriptionState>) {
  state = { ...state, ...partial };
  emit();
}

/**
 * Стартует загрузку статуса подписки (если ещё не стартовало).
 * Возвращает shared Promise, чтобы исключить дублирующиеся запросы.
 */
export function bootstrapSubscriptionStatus(): Promise<void> {
  if (inFlight) return inFlight;

  // Можем показать кэш (для UX), но НЕ считаем loaded=true — доступ всё равно запрещён до ответа backend.
  const cached = safeGetCachedInfo();
  if (cached) {
    setState({ subscriptionInfo: cached });
  }

  setState({ loading: true });
  inFlight = (async () => {
    const resp = await apiService.getTarotSubscriptionStatus();

    const info = (resp as any).subscriptionInfo ?? (resp.data as any)?.subscriptionInfo;
    if (resp.success && info) {
      safeSetCachedInfo(info);
      setState({ subscriptionInfo: info, loaded: true, loading: false, error: undefined });
      return;
    }

    // Safe-mode: блокируем доступ, но отмечаем loaded=true чтобы UI не висел бесконечно
    setState({
      subscriptionInfo: LOCKED_DEFAULT,
      loaded: true,
      loading: false,
      error: resp.error || 'Failed to load subscription status',
    });
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/**
 * Принудительно обновляет статус (например, после использования расклада).
 * Внутри всё равно используется shared in-flight Promise (не будет параллельных дублей).
 */
export function refreshSubscriptionStatus(): Promise<void> {
  // если уже грузим — переиспользуем текущий запрос
  if (inFlight) return inFlight;
  // сбрасываем loaded, чтобы UI снова ушёл в pessimistic lock до свежего ответа
  setState({ loaded: false });
  return bootstrapSubscriptionStatus();
}

export function useSubscriptionStatus(): SubscriptionState {
  const [snap, setSnap] = useState<SubscriptionState>(getSubscriptionSnapshot());

  useEffect(() => {
    return subscribeSubscription(() => setSnap(getSubscriptionSnapshot()));
  }, []);

  return snap;
}

