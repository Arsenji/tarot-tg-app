// Список Telegram ID заблокированных пользователей.
// Такие пользователи не могут пользоваться ботом и мини-приложением.
//
// Можно дополнительно задать список через переменную окружения
// BLOCKED_TELEGRAM_IDS="123,456" — значения объединяются с этим списком.
const HARDCODED_BLOCKED_IDS: number[] = [
  388599752,
];

function parseEnvBlockedIds(): number[] {
  const raw = process.env.BLOCKED_TELEGRAM_IDS;
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

const blockedIds = new Set<number>([
  ...HARDCODED_BLOCKED_IDS,
  ...parseEnvBlockedIds(),
]);

export function isUserBlocked(telegramId: number | undefined | null): boolean {
  if (telegramId == null) return false;
  return blockedIds.has(Number(telegramId));
}
