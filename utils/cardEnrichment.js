"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichCardWithDetailedDescription = exports.getCardDescriptionByName = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Функция для сопоставления названий карт с файлом значений
const getCardNameMapping = (cardName) => {
    const mapping = {
        // Major Arcana
        'Дурак': 'The Fool',
        'Маг': 'The Magician',
        'Верховная Жрица': 'The High Priestess',
        'Императрица': 'The Empress',
        'Император': 'The Emperor',
        'Иерофант': 'The Hierophant',
        'Влюблённые': 'The Lovers',
        'Колесница': 'The Chariot',
        'Сила': 'Strength',
        'Отшельник': 'The Hermit',
        'Колесо Фортуны': 'Wheel of Fortune',
        'Справедливость': 'Justice',
        'Повешенный': 'The Hanged Man',
        'Смерть': 'Death',
        'Умеренность': 'Temperance',
        'Дьявол': 'The Devil',
        'Башня': 'The Tower',
        'Звезда': 'The Star',
        'Луна': 'The Moon',
        'Солнце': 'The Sun',
        'Суд': 'Judgement',
        'Мир': 'The World',
        // Minor Arcana - Cups
        'Туз Кубков': 'Ace of Cups',
        'Двойка Кубков': 'Two of Cups',
        'Тройка Кубков': 'Three of Cups',
        'Четверка Кубков': 'Four of Cups',
        'Пятерка Кубков': 'Five of Cups',
        'Шестерка Кубков': 'Six of Cups',
        'Семерка Кубков': 'Seven of Cups',
        'Восьмерка Кубков': 'Eight of Cups',
        'Девятка Кубков': 'Nine of Cups',
        'Десятка Кубков': 'Ten of Cups',
        'Паж Кубков': 'Page of Cups',
        'Рыцарь Кубков': 'Knight of Cups',
        'Королева Кубков': 'Queen of Cups',
        'Король Кубков': 'King of Cups',
        // Minor Arcana - Swords
        'Туз Мечей': 'Ace of Swords',
        'Двойка Мечей': 'Two of Swords',
        'Тройка Мечей': 'Three of Swords',
        'Четверка Мечей': 'Four of Swords',
        'Пятерка Мечей': 'Five of Swords',
        'Шестерка Мечей': 'Six of Swords',
        'Семерка Мечей': 'Seven of Swords',
        'Восьмерка Мечей': 'Eight of Swords',
        'Девятка Мечей': 'Nine of Swords',
        'Десятка Мечей': 'Ten of Swords',
        'Паж Мечей': 'Page of Swords',
        'Рыцарь Мечей': 'Knight of Swords',
        'Королева Мечей': 'Queen of Swords',
        'Король Мечей': 'King of Swords',
        // Minor Arcana - Wands
        'Туз Жезлов': 'Ace of Wands',
        'Двойка Жезлов': 'Two of Wands',
        'Тройка Жезлов': 'Three of Wands',
        'Четверка Жезлов': 'Four of Wands',
        'Пятерка Жезлов': 'Five of Wands',
        'Шестерка Жезлов': 'Six of Wands',
        'Семерка Жезлов': 'Seven of Wands',
        'Восьмерка Жезлов': 'Eight of Wands',
        'Девятка Жезлов': 'Nine of Wands',
        'Десятка Жезлов': 'Ten of Wands',
        'Паж Жезлов': 'Page of Wands',
        'Рыцарь Жезлов': 'Knight of Wands',
        'Королева Жезлов': 'Queen of Wands',
        'Король Жезлов': 'King of Wands',
        // Minor Arcana - Pentacles
        'Туз Пентаклей': 'Ace of Pentacles',
        'Двойка Пентаклей': 'Two of Pentacles',
        'Тройка Пентаклей': 'Three of Pentacles',
        'Четверка Пентаклей': 'Four of Pentacles',
        'Пятерка Пентаклей': 'Five of Pentacles',
        'Шестерка Пентаклей': 'Six of Pentacles',
        'Семерка Пентаклей': 'Seven of Pentacles',
        'Восьмерка Пентаклей': 'Eight of Pentacles',
        'Девятка Пентаклей': 'Nine of Pentacles',
        'Десятка Пентаклей': 'Ten of Pentacles',
        'Паж Пентаклей': 'Page of Pentacles',
        'Рыцарь Пентаклей': 'Knight of Pentacles',
        'Королева Пентаклей': 'Queen of Pentacles',
        'Король Пентаклей': 'King of Pentacles',
    };
    return mapping[cardName] || cardName;
};
// Функция для загрузки данных из JSON файла
const loadTarotData = () => {
    try {
        const dataPath = path.join(__dirname, '../../../tarot_rider_waite_full.json');
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error loading tarot data:', error);
        return {};
    }
};
// Кэшируем данные
let tarotDataCache = null;
// Функция для получения данных карты из JSON
const getCardDataFromJSON = (cardName) => {
    if (!tarotDataCache) {
        tarotDataCache = loadTarotData();
    }
    return tarotDataCache[cardName] || null;
};
// Функция для получения подробного описания карты по названию и категории
const getCardDescriptionByName = (cardName, category) => {
    // Преобразуем русское название в английское
    const englishName = getCardNameMapping(cardName);
    const cardData = getCardDataFromJSON(englishName);
    // Определяем категорию для отображения
    const categoryKey = category === 'love' ? 'love' :
        category === 'work' ? 'work' :
            category === 'personal' ? 'personal' : 'general';
    // Возвращаем описание для выбранной категории
    if (cardData && cardData[categoryKey]) {
        return cardData[categoryKey];
    }
    // Fallback описания по категориям
    const fallbackDescriptions = {
        love: `В любовных отношениях карта "${cardName}" символизирует надежду, вдохновение и духовное исцеление. Она говорит о том, что даже в трудные времена есть место для веры в лучшее будущее.`,
        work: `В карьере карта "${cardName}" указывает на период вдохновения и творческого подхода. Она советует не терять надежду и продолжать двигаться к своим целям.`,
        personal: `В личном развитии карта "${cardName}" символизирует духовный рост и внутреннее исцеление. Она напоминает о важности веры в себя и свои возможности.`
    };
    return fallbackDescriptions[categoryKey] || `Карта "${cardName}" символизирует надежду и вдохновение.`;
};
exports.getCardDescriptionByName = getCardDescriptionByName;
// Функция для обогащения карты подробными описаниями
const enrichCardWithDetailedDescription = (card, category) => {
    const cardData = getCardDataFromJSON(card.name);
    // Определяем категорию для отображения
    const categoryKey = category === 'love' ? 'love' :
        category === 'career' ? 'work' :
            category === 'personal' ? 'personal' : 'general';
    // Создаем подробное описание на основе данных из JSON
    const detailedDescription = {
        general: card.meaning,
        love: cardData?.love || `В любовных отношениях: ${card.meaning}. Совет: ${card.advice}`,
        career: cardData?.work || `В карьере: ${card.meaning}. Совет: ${card.advice}`,
        personal: cardData?.personal || `В личном развитии: ${card.meaning}. Совет: ${card.advice}`,
        reversed: undefined,
        // Добавляем поле для отображения только выбранной категории
        displayDescription: cardData?.[categoryKey] || card.meaning
    };
    return {
        ...card,
        detailedDescription
    };
};
exports.enrichCardWithDetailedDescription = enrichCardWithDetailedDescription;
//# sourceMappingURL=cardEnrichment.js.map