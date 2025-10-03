/**
 * Форматирует текст интерпретации таро, убирая капслок и исправляя нумерацию списков
 */
export const formatInterpretationText = (text: string): string => {
  if (!text) return '';
  
  // Убираем лишние символы и форматируем текст
  let formatted = text
    .replace(/\*\*/g, '') // Убираем **
    .replace(/\*/g, '') // Убираем *
    .replace(/### /g, '\n') // Заменяем ### на новую строку
    .replace(/## /g, '\n') // Заменяем ## на новую строку
    .replace(/# /g, '\n') // Заменяем # на новую строку
    .replace(/\n\n/g, '\n') // Убираем двойные переносы
    .trim();

  // Убираем капслок из заголовков - более универсальный подход
  formatted = formatted.replace(/^([А-ЯЁ\s]+):?\s*$/gm, (match) => {
    return match.toLowerCase().replace(/^./, (char) => char.toUpperCase());
  });
  
  // Обрабатываем строки с двоеточием в середине текста
  formatted = formatted.replace(/([А-ЯЁ\s]+):\s*/g, (match) => {
    return match.toLowerCase().replace(/^./, (char) => char.toUpperCase());
  });
  
  // Обрабатываем строки, которые начинаются с капслока и заканчиваются точкой
  formatted = formatted.replace(/^([А-ЯЁ\s]+)\.\s*$/gm, (match) => {
    return match.toLowerCase().replace(/^./, (char) => char.toUpperCase());
  });
  
  // Обрабатываем строки с капслоком в начале абзаца
  formatted = formatted.replace(/^([А-ЯЁ\s]+):\s*$/gm, (match) => {
    return match.toLowerCase().replace(/^./, (char) => char.toUpperCase());
  });

  // Исправляем нумерацию списков - убираем пустые строки после номеров
  formatted = formatted.replace(/^(\d+)\.\s*\n\s*/gm, '$1. ');
  
  // Убираем лишние переносы строк между элементами списка
  formatted = formatted.replace(/(\d+\.\s[^\n]+)\n\s*\n/gm, '$1\n');

  return formatted
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n'); // Добавляем абзацы
};

/**
 * Обрезает текст до указанной длины
 */
export const truncateText = (text: string, maxLength: number = 200): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
