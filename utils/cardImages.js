"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiderWaiteImagePath = void 0;
// Утилита для получения пути к изображению карты в бэкенде
const getRiderWaiteImagePath = (cardName) => {
    // Маппинг названий карт к именам файлов изображений
    const cardImageMapping = {
        // Старшие арканы
        'Дурак': 'major_arcana_fool',
        'Маг': 'major_arcana_magician',
        'Верховная Жрица': 'major_arcana_priestess',
        'Императрица': 'major_arcana_empress',
        'Император': 'major_arcana_emperor',
        'Иерофант': 'major_arcana_hierophant',
        'Влюбленные': 'major_arcana_lovers',
        'Колесница': 'major_arcana_chariot',
        'Сила': 'major_arcana_strength',
        'Отшельник': 'major_arcana_hermit',
        'Колесо Фортуны': 'major_arcana_fortune',
        'Справедливость': 'major_arcana_justice',
        'Повешенный': 'major_arcana_hanged',
        'Смерть': 'major_arcana_death',
        'Умеренность': 'major_arcana_temperance',
        'Дьявол': 'major_arcana_devil',
        'Башня': 'major_arcana_tower',
        'Звезда': 'major_arcana_star',
        'Луна': 'major_arcana_moon',
        'Солнце': 'major_arcana_sun',
        'Суд': 'major_arcana_judgement',
        'Мир': 'major_arcana_world',
        // Младшие арканы - Жезлы
        'Туз Жезлов': 'minor_arcana_wands_ace',
        'Двойка Жезлов': 'minor_arcana_wands_2',
        'Тройка Жезлов': 'minor_arcana_wands_3',
        'Четверка Жезлов': 'minor_arcana_wands_4',
        'Пятерка Жезлов': 'minor_arcana_wands_5',
        'Шестерка Жезлов': 'minor_arcana_wands_6',
        'Семерка Жезлов': 'minor_arcana_wands_7',
        'Восьмерка Жезлов': 'minor_arcana_wands_8',
        'Девятка Жезлов': 'minor_arcana_wands_9',
        'Десятка Жезлов': 'minor_arcana_wands_10',
        'Паж Жезлов': 'minor_arcana_wands_page',
        'Рыцарь Жезлов': 'minor_arcana_wands_knight',
        'Королева Жезлов': 'minor_arcana_wands_queen',
        'Король Жезлов': 'minor_arcana_wands_king',
        // Младшие арканы - Кубки
        'Туз Кубков': 'minor_arcana_cups_ace',
        'Двойка Кубков': 'minor_arcana_cups_2',
        'Тройка Кубков': 'minor_arcana_cups_3',
        'Четверка Кубков': 'minor_arcana_cups_4',
        'Пятерка Кубков': 'minor_arcana_cups_5',
        'Шестерка Кубков': 'minor_arcana_cups_6',
        'Семерка Кубков': 'minor_arcana_cups_7',
        'Восьмерка Кубков': 'minor_arcana_cups_8',
        'Девятка Кубков': 'minor_arcana_cups_9',
        'Десятка Кубков': 'minor_arcana_cups_10',
        'Паж Кубков': 'minor_arcana_cups_page',
        'Рыцарь Кубков': 'minor_arcana_cups_knight',
        'Королева Кубков': 'minor_arcana_cups_queen',
        'Король Кубков': 'minor_arcana_cups_king',
        // Младшие арканы - Мечи
        'Туз Мечей': 'minor_arcana_swords_ace',
        'Двойка Мечей': 'minor_arcana_swords_2',
        'Тройка Мечей': 'minor_arcana_swords_3',
        'Четверка Мечей': 'minor_arcana_swords_4',
        'Пятерка Мечей': 'minor_arcana_swords_5',
        'Шестерка Мечей': 'minor_arcana_swords_6',
        'Семерка Мечей': 'minor_arcana_swords_7',
        'Восьмерка Мечей': 'minor_arcana_swords_8',
        'Девятка Мечей': 'minor_arcana_swords_9',
        'Десятка Мечей': 'minor_arcana_swords_10',
        'Паж Мечей': 'minor_arcana_swords_page',
        'Рыцарь Мечей': 'minor_arcana_swords_knight',
        'Королева Мечей': 'minor_arcana_swords_queen',
        'Король Мечей': 'minor_arcana_swords_king',
        // Младшие арканы - Пентакли
        'Туз Пентаклей': 'minor_arcana_pentacles_ace',
        'Двойка Пентаклей': 'minor_arcana_pentacles_2',
        'Тройка Пентаклей': 'minor_arcana_pentacles_3',
        'Четверка Пентаклей': 'minor_arcana_pentacles_4',
        'Пятерка Пентаклей': 'minor_arcana_pentacles_5',
        'Шестерка Пентаклей': 'minor_arcana_pentacles_6',
        'Семерка Пентаклей': 'minor_arcana_pentacles_7',
        'Восьмерка Пентаклей': 'minor_arcana_pentacles_8',
        'Девятка Пентаклей': 'minor_arcana_pentacles_9',
        'Десятка Пентаклей': 'minor_arcana_pentacles_10',
        'Паж Пентаклей': 'minor_arcana_pentacles_page',
        'Рыцарь Пентаклей': 'minor_arcana_pentacles_knight',
        'Королева Пентаклей': 'minor_arcana_pentacles_queen',
        'Король Пентаклей': 'minor_arcana_pentacles_king'
    };
    const imageName = cardImageMapping[cardName] || 'major_arcana_fool';
    return `/images/rider-waite-tarot/${imageName}.png`;
};
exports.getRiderWaiteImagePath = getRiderWaiteImagePath;
//# sourceMappingURL=cardImages.js.map