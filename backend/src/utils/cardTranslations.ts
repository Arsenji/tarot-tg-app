// Маппинг английских названий карт Таро на русские
export const cardNameTranslations: Record<string, string> = {
  'The Fool': 'Шут',
  'The Magician': 'Маг',
  'The High Priestess': 'Жрица',
  'The Empress': 'Императрица',
  'The Emperor': 'Император',
  'The Hierophant': 'Иерофант',
  'The Lovers': 'Влюбленные',
  'The Chariot': 'Колесница',
  'Strength': 'Сила',
  'The Hermit': 'Отшельник',
  'Wheel of Fortune': 'Колесо Фортуны',
  'Justice': 'Справедливость',
  'The Hanged Man': 'Повешенный',
  'Death': 'Смерть',
  'Temperance': 'Умеренность',
  'The Devil': 'Дьявол',
  'The Tower': 'Башня',
  'The Star': 'Звезда',
  'The Moon': 'Луна',
  'The Sun': 'Солнце',
  'Judgement': 'Суд',
  'The World': 'Мир'
};

// Получить русское название карты
export function getRussianCardName(englishName: string): string {
  return cardNameTranslations[englishName] || englishName;
}

// Получить путь к изображению карты
export function getCardImagePath(cardName: string, isReversed: boolean = false): string {
  const normalizedName = cardName.toLowerCase().replace(/\s+/g, '_');
  const basePath = `/images/rider-waite-tarot/major_arcana_${normalizedName}`;
  return isReversed ? `${basePath}_reversed.png` : `${basePath}.png`;
}

