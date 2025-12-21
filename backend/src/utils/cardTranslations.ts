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
  // Маппинг английских названий на имена файлов
  const cardFileMap: Record<string, string> = {
    'The Fool': 'fool',
    'The Magician': 'magician',
    'The High Priestess': 'priestess',
    'The Empress': 'empress',
    'The Emperor': 'emperor',
    'The Hierophant': 'hierophant',
    'The Lovers': 'lovers',
    'The Chariot': 'chariot',
    'Strength': 'strength',
    'The Hermit': 'hermit',
    'Wheel of Fortune': 'wheel_of_fortune',
    'Justice': 'justice',
    'The Hanged Man': 'hanged_man',
    'Death': 'death',
    'Temperance': 'temperance',
    'The Devil': 'devil',
    'The Tower': 'tower',
    'The Star': 'star',
    'The Moon': 'moon',
    'The Sun': 'sun',
    'Judgement': 'judgement',
    'The World': 'world'
  };
  
  const fileName = cardFileMap[cardName] || cardName.toLowerCase().replace(/\s+/g, '_');
  const basePath = `/images/rider-waite-tarot/major_arcana_${fileName}`;
  return isReversed ? `${basePath}_reversed.png` : `${basePath}.png`;
}

