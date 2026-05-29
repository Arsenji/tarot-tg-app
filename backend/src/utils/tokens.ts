import { User, IUser } from '../models/User';
import logger from './logger';
import {
  FREE_YES_NO_LIFETIME,
  FREE_THREE_CARDS_LIFETIME,
  YES_NO_TOKEN_COST,
  THREE_CARDS_TOKEN_COST,
  TokenPackageId,
  getTokenPackageTokens,
} from '../constants/tokens';
import { getFreeUsageCooldowns } from './subscription';

export type WalletSnapshot = {
  tokensBalance: number;
  freeYesNoUsed: number;
  freeThreeCardsUsed: number;
  freeYesNoRemaining: number;
  freeThreeCardsRemaining: number;
  yesNoTokenCost: number;
  threeCardsTokenCost: number;
  canUseDailyAdvice: boolean;
  cooldowns: Awaited<ReturnType<typeof getFreeUsageCooldowns>>;
};

export type ConsumeSuccess = {
  ok: true;
  usedFree: boolean;
  tokensSpent: number;
  tokensBalance: number;
  freeYesNoUsed: number;
  freeThreeCardsUsed: number;
};

export type ConsumeFailure = {
  ok: false;
  code: 'INSUFFICIENT_TOKENS';
  required: number;
  balance: number;
};

export type ConsumeResult = ConsumeSuccess | ConsumeFailure;

/** Normalize legacy boolean freeYesNoUsed to lifetime count. */
export function normalizeFreeCount(value: unknown): number {
  if (value === true) return 1;
  if (value === false || value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  return 0;
}

export function walletFromUser(
  user: Pick<IUser, 'tokensBalance' | 'freeYesNoUsed' | 'freeThreeCardsUsed'> | null | undefined,
  cooldowns: Awaited<ReturnType<typeof getFreeUsageCooldowns>>,
  isAdmin: boolean
): WalletSnapshot {
  const freeYesNoUsed = normalizeFreeCount(user?.freeYesNoUsed);
  const freeThreeCardsUsed = normalizeFreeCount(user?.freeThreeCardsUsed);
  const tokensBalance = user?.tokensBalance ?? 0;
  const dailyBlocked = cooldowns.dailyAdviceMsRemaining > 0;

  return {
    tokensBalance,
    freeYesNoUsed,
    freeThreeCardsUsed,
    freeYesNoRemaining: Math.max(0, FREE_YES_NO_LIFETIME - freeYesNoUsed),
    freeThreeCardsRemaining: Math.max(0, FREE_THREE_CARDS_LIFETIME - freeThreeCardsUsed),
    yesNoTokenCost: YES_NO_TOKEN_COST,
    threeCardsTokenCost: THREE_CARDS_TOKEN_COST,
    canUseDailyAdvice: isAdmin || !dailyBlocked,
    cooldowns,
  };
}

export async function buildWalletSnapshot(
  telegramId: number,
  isAdmin = false
): Promise<WalletSnapshot | null> {
  const user = await User.findOne({ telegramId })
    .select('tokensBalance freeYesNoUsed freeThreeCardsUsed')
    .lean();
  if (!user) return null;
  const cooldowns = await getFreeUsageCooldowns(telegramId);
  return walletFromUser(
    {
      tokensBalance: user.tokensBalance ?? 0,
      freeYesNoUsed: user.freeYesNoUsed,
      freeThreeCardsUsed: user.freeThreeCardsUsed,
    },
    cooldowns,
    isAdmin
  );
}

export async function creditTokens(
  telegramId: number,
  amount: number
): Promise<number | null> {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const updated = await User.findOneAndUpdate(
    { telegramId },
    { $inc: { tokensBalance: amount } },
    { new: true }
  );
  if (!updated) return null;
  logger.info('Tokens credited', { telegramId, amount, tokensBalance: updated.tokensBalance });
  return updated.tokensBalance;
}

export async function creditTokenPackage(
  telegramId: number,
  packageId: TokenPackageId
): Promise<number | null> {
  return creditTokens(telegramId, getTokenPackageTokens(packageId));
}

async function consumeYesNoInternal(telegramId: number): Promise<ConsumeResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await User.findOne({ telegramId });
    if (!user) {
      return { ok: false, code: 'INSUFFICIENT_TOKENS', required: YES_NO_TOKEN_COST, balance: 0 };
    }

    const used = normalizeFreeCount(user.freeYesNoUsed);
    if (used < FREE_YES_NO_LIFETIME) {
      const updated = await User.findOneAndUpdate(
        { telegramId, _id: user._id, freeYesNoUsed: user.freeYesNoUsed },
        { $set: { freeYesNoUsed: used + 1 } },
        { new: true }
      );
      if (updated) {
        return {
          ok: true,
          usedFree: true,
          tokensSpent: 0,
          tokensBalance: updated.tokensBalance ?? 0,
          freeYesNoUsed: normalizeFreeCount(updated.freeYesNoUsed),
          freeThreeCardsUsed: normalizeFreeCount(updated.freeThreeCardsUsed),
        };
      }
      continue;
    }

    const balance = user.tokensBalance ?? 0;
    if (balance < YES_NO_TOKEN_COST) {
      return {
        ok: false,
        code: 'INSUFFICIENT_TOKENS',
        required: YES_NO_TOKEN_COST,
        balance,
      };
    }

    const updated = await User.findOneAndUpdate(
      { telegramId, _id: user._id, tokensBalance: { $gte: YES_NO_TOKEN_COST } },
      { $inc: { tokensBalance: -YES_NO_TOKEN_COST } },
      { new: true }
    );

    if (updated) {
      return {
        ok: true,
        usedFree: false,
        tokensSpent: YES_NO_TOKEN_COST,
        tokensBalance: updated.tokensBalance ?? 0,
        freeYesNoUsed: normalizeFreeCount(updated.freeYesNoUsed),
        freeThreeCardsUsed: normalizeFreeCount(updated.freeThreeCardsUsed),
      };
    }
  }

  const user = await User.findOne({ telegramId });
  return {
    ok: false,
    code: 'INSUFFICIENT_TOKENS',
    required: YES_NO_TOKEN_COST,
    balance: user?.tokensBalance ?? 0,
  };
}

async function consumeThreeCardsInternal(telegramId: number): Promise<ConsumeResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await User.findOne({ telegramId });
    if (!user) {
      return { ok: false, code: 'INSUFFICIENT_TOKENS', required: THREE_CARDS_TOKEN_COST, balance: 0 };
    }

    const used = normalizeFreeCount(user.freeThreeCardsUsed);
    if (used < FREE_THREE_CARDS_LIFETIME) {
      const updated = await User.findOneAndUpdate(
        { telegramId, _id: user._id, freeThreeCardsUsed: user.freeThreeCardsUsed },
        { $set: { freeThreeCardsUsed: used + 1 } },
        { new: true }
      );
      if (updated) {
        return {
          ok: true,
          usedFree: true,
          tokensSpent: 0,
          tokensBalance: updated.tokensBalance ?? 0,
          freeYesNoUsed: normalizeFreeCount(updated.freeYesNoUsed),
          freeThreeCardsUsed: normalizeFreeCount(updated.freeThreeCardsUsed),
        };
      }
      continue;
    }

    const balance = user.tokensBalance ?? 0;
    if (balance < THREE_CARDS_TOKEN_COST) {
      return {
        ok: false,
        code: 'INSUFFICIENT_TOKENS',
        required: THREE_CARDS_TOKEN_COST,
        balance,
      };
    }

    const updated = await User.findOneAndUpdate(
      { telegramId, _id: user._id, tokensBalance: { $gte: THREE_CARDS_TOKEN_COST } },
      { $inc: { tokensBalance: -THREE_CARDS_TOKEN_COST } },
      { new: true }
    );

    if (updated) {
      return {
        ok: true,
        usedFree: false,
        tokensSpent: THREE_CARDS_TOKEN_COST,
        tokensBalance: updated.tokensBalance ?? 0,
        freeYesNoUsed: normalizeFreeCount(updated.freeYesNoUsed),
        freeThreeCardsUsed: normalizeFreeCount(updated.freeThreeCardsUsed),
      };
    }
  }

  const user = await User.findOne({ telegramId });
  return {
    ok: false,
    code: 'INSUFFICIENT_TOKENS',
    required: THREE_CARDS_TOKEN_COST,
    balance: user?.tokensBalance ?? 0,
  };
}

export async function tryConsumeYesNo(telegramId: number, isAdmin: boolean): Promise<ConsumeResult> {
  if (isAdmin) {
    const user = await User.findOne({ telegramId }).select('tokensBalance freeYesNoUsed freeThreeCardsUsed');
    return {
      ok: true,
      usedFree: true,
      tokensSpent: 0,
      tokensBalance: user?.tokensBalance ?? 0,
      freeYesNoUsed: normalizeFreeCount(user?.freeYesNoUsed),
      freeThreeCardsUsed: normalizeFreeCount(user?.freeThreeCardsUsed),
    };
  }
  return consumeYesNoInternal(telegramId);
}

export async function tryConsumeThreeCards(telegramId: number, isAdmin: boolean): Promise<ConsumeResult> {
  if (isAdmin) {
    const user = await User.findOne({ telegramId }).select('tokensBalance freeYesNoUsed freeThreeCardsUsed');
    return {
      ok: true,
      usedFree: true,
      tokensSpent: 0,
      tokensBalance: user?.tokensBalance ?? 0,
      freeYesNoUsed: normalizeFreeCount(user?.freeYesNoUsed),
      freeThreeCardsUsed: normalizeFreeCount(user?.freeThreeCardsUsed),
    };
  }
  return consumeThreeCardsInternal(telegramId);
}

export function canAffordYesNo(wallet: WalletSnapshot, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (wallet.freeYesNoRemaining > 0) return true;
  return wallet.tokensBalance >= YES_NO_TOKEN_COST;
}

export function canAffordThreeCards(wallet: WalletSnapshot, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (wallet.freeThreeCardsRemaining > 0) return true;
  return wallet.tokensBalance >= THREE_CARDS_TOKEN_COST;
}
