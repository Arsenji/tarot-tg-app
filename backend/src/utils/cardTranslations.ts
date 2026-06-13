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

// Регэксп для замены английских названий: длинные имена первыми, чтобы
// "The Emperor" не подменялся раньше "The Empress" и т.п.
const englishCardNameRegex = new RegExp(
  Object.keys(cardNameTranslations)
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'gi'
);

/**
 * Заменяет любые английские названия карт в тексте на русские.
 * Страховка: модель иногда игнорирует инструкцию и пишет имена по-английски.
 */
export function localizeCardNames(text: string): string {
  if (!text) return text;
  return text.replace(englishCardNameRegex, (match) => {
    // Нормализуем регистр ключа (ключи словаря — в исходном регистре).
    const key = Object.keys(cardNameTranslations).find(
      (k) => k.toLowerCase() === match.toLowerCase()
    );
    return key ? cardNameTranslations[key] : match;
  });
}

// Получить путь к изображению карты
export function getCardImagePath(cardName: string, isReversed: boolean = false): string {
  // Маппинг английских названий на имена файлов (соответствует реальным файлам в папке)
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
    'Wheel of Fortune': 'fortune', // Файл: major_arcana_fortune.png
    'Justice': 'justice',
    'The Hanged Man': 'hanged', // Файл: major_arcana_hanged.png
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
  
  // Если карта перевернута, но нет файла _reversed, используем обычный файл
  // (в проекте пока нет отдельных файлов для перевернутых карт)
  return `${basePath}.png`;
}

