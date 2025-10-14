"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextProcessor = void 0;
class TextProcessor {
    /**
     * Очищает текст от форматирования AI и улучшает его читаемость
     */
    static cleanAiText(text) {
        if (!text)
            return text;
        let cleanedText = text;
        // 1. Убираем символы ### и заменяем на новую строку
        cleanedText = cleanedText.replace(/###\s*/g, '\n\n');
        // 2. Убираем символы ** и делаем текст обычным (не жирным)
        cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '$1');
        // 3. Убираем одиночные символы * в начале строк
        cleanedText = cleanedText.replace(/^\s*\*\s*/gm, '');
        // 4. Убираем лишние пробелы и переносы строк
        cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n');
        cleanedText = cleanedText.replace(/[ \t]+/g, ' ');
        // 5. Убираем пустые строки в начале и конце
        cleanedText = cleanedText.trim();
        // 6. Убираем символы ### в середине текста
        cleanedText = cleanedText.replace(/###/g, '');
        // 7. Убираем символы ## если они есть
        cleanedText = cleanedText.replace(/##\s*/g, '\n\n');
        // 8. Убираем символы # если они есть
        cleanedText = cleanedText.replace(/#\s*/g, '\n\n');
        // 9. Убираем лишние переносы строк в конце
        cleanedText = cleanedText.replace(/\n+$/, '');
        return cleanedText;
    }
    /**
     * Форматирует текст для лучшей читаемости
     */
    static formatText(text) {
        if (!text)
            return text;
        let formattedText = text;
        // Добавляем переносы строк после точек, если строка слишком длинная
        formattedText = formattedText.replace(/\.\s+/g, '.\n\n');
        // Убираем лишние переносы строк
        formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
        return formattedText.trim();
    }
}
exports.TextProcessor = TextProcessor;
//# sourceMappingURL=textProcessor.js.map