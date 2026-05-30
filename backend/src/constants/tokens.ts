export const FREE_YES_NO_LIFETIME = 1;
export const FREE_THREE_CARDS_LIFETIME = 1;
export const YES_NO_TOKEN_COST = 5;
export const THREE_CARDS_TOKEN_COST = 10;

export const TOKEN_PACKAGES = {
  '10': {
    tokens: 10,
    price: '100.00',
    name: '10 токенов',
  },
  '25': {
    tokens: 25,
    price: '225.00',
    name: '25 токенов',
  },
  '50': {
    tokens: 50,
    price: '400.00',
    name: '50 токенов',
  },
  '100': {
    tokens: 100,
    price: '700.00',
    name: '100 токенов',
  },
} as const;

export type TokenPackageId = keyof typeof TOKEN_PACKAGES;

export function isTokenPackageId(value: string): value is TokenPackageId {
  return value in TOKEN_PACKAGES;
}

export function getTokenPackageTokens(packageId: TokenPackageId): number {
  return TOKEN_PACKAGES[packageId].tokens;
}
