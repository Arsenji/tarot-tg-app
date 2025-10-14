"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const textProcessor_1 = require("../utils/textProcessor");
let openai = null;
// Простое кэширование для ускорения повторных запросов
const interpretationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const cacheTimestamps = new Map();
const getOpenAI = () => {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        console.log('🔑 OpenAI API Key check:', {
            exists: !!apiKey,
            length: apiKey?.length || 0,
            starts: apiKey?.substring(0, 7) || 'undefined'
        });
        if (!apiKey) {
            console.error('❌ OPENAI_API_KEY не установлен в environment variables!');
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        openai = new openai_1.default({
            apiKey,
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        });
        console.log('✅ OpenAI клиент инициализирован');
    }
    return openai;
};
const generateCacheKey = (question, cards) => {
    const cardsKey = cards.map(card => `${card.name}`).join('|');
    return `${question}|${cardsKey}`;
};
const isCacheValid = (key) => {
    const timestamp = cacheTimestamps.get(key);
    if (!timestamp)
        return false;
    return Date.now() - timestamp < CACHE_TTL;
};
class OpenAIService {
    static async interpretReading(request) {
        try {
            // Проверяем кэш
            const cacheKey = generateCacheKey(request.question, request.cards);
            if (isCacheValid(cacheKey)) {
                const cachedInterpretation = interpretationCache.get(cacheKey);
                if (cachedInterpretation) {
                    console.log('Using cached interpretation');
                    return { interpretation: cachedInterpretation };
                }
            }
            // Формируем описание карт для отправки в OpenAI
            const cardsDescription = request.cards.map((card, index) => {
                const position = request.cards.length === 3
                    ? (index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее')
                    : '';
                return `${position ? `${position}: ` : ''}${card.name} - ${card.meaning}`;
            }).join('\n');
            const response = await getOpenAI().chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Ты — опытный таролог с многолетней практикой, глубоко знакомый с традициями и современными подходами Таро. Веди себя как живой практикующий таролог: говори от первого лица, не упоминай, что ты ИИ, и не используй технические пояснения о своей природе.\n\nЗадача: проанализировать вопрос пользователя и выпавшие карты, дать развернутое, глубокое и полезное толкование, связанное с контекстом вопроса.\n\nОбщие правила:\n1. Пиши развернуто, ясно и эмпатично. Минимальная длина ответа — ~250 слов; для сложных раскладов — 300–700 слов.\n2. Не используй символы \"###\" или \"**\" для форматирования. Пиши обычным текстом, разделяя блоки пустой строкой и заголовками в простом виде (например: КАРТЫ РАСКЛАДА:, ОБЩАЯ ТРАКТОВКА:, ПРАКТИЧЕСКИЕ СОВЕТЫ:).\n3. Не давай категоричных утверждений по вопросам здоровья, права или финансов. В случае таких тем вставь короткое предупреждение и порекомендуй обратиться к профильному специалисту.\n4. Формулируй предположения условно: используй «возможно», «вероятно», «это может означать», «рекомендую», — вместо абсолютных прогнозов.\n5. Учитывай ориентацию карт (прямые/перевернутые) и позиции (Прошлое, Настоящее, Будущее), если они указаны.\n6. Если в описании карт есть дополнительные пометки (ориентация, позиция, расположение), обязательно включи их в трактовку.\n\nСтруктура ответа (обязательно соблюдай):\n1) Краткая вводная (1–2 предложения) — создаёт атмосферу и настраивает пользователя.\n2) КАРТЫ РАСКЛАДА: для каждой карты — на отдельной строке: название карты, ориентация (прям./перевёрнуто), позиция (если указана), затем 2–4 предложения толкования в контексте позиции/вопроса.\n3) ВЗАИМОСВЯЗЬ КАРТ: 2–5 предложений о том, как карты взаимодействуют, какие темы и динамики выделяются.\n4) ОБЩАЯ ТРАКТОВКА В КОНТЕКСТЕ ВОПРОСА: развёрнутый блок (4–8 предложений), где объясняешь, что расклад говорит конкретно про вопрос пользователя.\n5) ПРАКТИЧЕСКИЕ СОВЕТЫ: 3–5 конкретных, реалистичных шагов/рекомендаций (короткие пункты), которые пользователь может применить немедленно.\n6) ВОЗМОЖНЫЕ ПРЕПЯТСТВИЯ И ЧТО ИЗБЕЖАТЬ: 1–3 пункта о рисках или ловушках.\n7) КРАТКИЙ ИТОГ (1–2 предложения) — чёткая, запоминающаяся мысль.\n8) ОДНА ФРАЗА-НАСТАВЛЕНИЕ (1 предложение) — лаконичная «мантра» или совет.\n\nДополнительно:\n- Если карта перевёрнута — отдельно поясни, как её смысл меняется (ослабление, задержка, внутренняя работа и т.д.).\n- Если пользователь просит временные сроки и они уместны — указывай примерные ориентиры (неделя/месяц/3 месяца), но не давай жёстких дат.\n- Подчёркивай индивидуальность: старайся связывать значения карт с личной ситуацией спрашивающего, используя формулировки типа \"для вашей ситуации это может значить...\" или \"в контексте вашего вопроса карта указывает...\".\n- Сохраняй тон уважительным и поддерживающим, избегай моральных оценок."
                    },
                    {
                        role: "user",
                        content: `Вопрос пользователя: ${request.question}

Выпавшие карты:
${cardsDescription}

Составь развернутое толкование расклада, строго следуя указанным правилам и структуре.`
                    }
                ],
                max_tokens: 1200, // Увеличили для развернутых ответов по новой структуре
                temperature: 0.7, // Увеличили для более творческих ответов
            });
            const rawInterpretation = response.choices[0].message.content || 'Не удалось получить толкование.';
            // Очищаем и форматируем текст
            const cleanedInterpretation = textProcessor_1.TextProcessor.cleanAiText(rawInterpretation);
            const formattedInterpretation = textProcessor_1.TextProcessor.formatText(cleanedInterpretation);
            // Сохраняем в кэш
            interpretationCache.set(cacheKey, formattedInterpretation);
            cacheTimestamps.set(cacheKey, Date.now());
            return {
                interpretation: formattedInterpretation
            };
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error('Ошибка при обращении к OpenAI API');
        }
    }
    static async interpretYesNoClarifyingQuestion(request) {
        try {
            // Проверяем кэш для уточняющих вопросов Да/Нет
            const cacheKey = `yesno_clarifying_${request.clarifyingQuestion}|${request.clarifyingCard.name}`;
            if (isCacheValid(cacheKey)) {
                const cachedInterpretation = interpretationCache.get(cacheKey);
                if (cachedInterpretation) {
                    console.log('Using cached Yes/No clarifying interpretation');
                    return { interpretation: cachedInterpretation };
                }
            }
            const response = await getOpenAI().chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Ты — опытный таролог, который даёт чёткие ответы ДА/НЕТ на уточняющие вопросы. Отвечай кратко и по существу."
                    },
                    {
                        role: "user",
                        content: `Уточняющий вопрос: ${request.clarifyingQuestion}

Карта для уточнения: ${request.clarifyingCard.name}
Значение карты: ${request.clarifyingCard.meaning}
Совет карты: ${request.clarifyingCard.advice}
Ключевые слова: ${request.clarifyingCard.keywords}

Правила:
1. Ответь строго в формате JSON
2. Поле "answer" должно содержать либо "ДА", либо "НЕТ"
3. Поле "interpretation" должно быть кратким объяснением (2-3 предложения) почему выбран этот ответ
4. Используй только русский язык

Формат ответа:
{
  "answer": "ДА" или "НЕТ",
  "interpretation": "Краткое объяснение на основе значения карты"
}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200,
            });
            const rawResponse = response.choices[0].message?.content;
            if (!rawResponse) {
                throw new Error('OpenAI did not return a response.');
            }
            const parsedResponse = JSON.parse(rawResponse);
            // Проверяем, что ответ содержит и answer, и interpretation
            if (!parsedResponse.answer || !parsedResponse.interpretation) {
                throw new Error('Invalid response format from OpenAI');
            }
            // Форматируем ответ для отображения - сначала ответ, потом интерпретация
            const formattedAnswer = `${parsedResponse.answer}\n\n${parsedResponse.interpretation}`;
            // Сохраняем в кэш
            interpretationCache.set(cacheKey, formattedAnswer);
            cacheTimestamps.set(cacheKey, Date.now());
            return {
                interpretation: formattedAnswer
            };
        }
        catch (error) {
            console.error('OpenAI Yes/No clarifying question error:', error);
            throw new Error('Ошибка при обращении к OpenAI API для уточняющего вопроса Да/Нет');
        }
    }
    static async interpretClarifyingQuestion(request) {
        try {
            // Проверяем кэш для уточняющих вопросов
            const cacheKey = `clarifying_${request.clarifyingQuestion}|${request.originalQuestion}|${request.clarifyingCard.name}`;
            if (isCacheValid(cacheKey)) {
                const cachedInterpretation = interpretationCache.get(cacheKey);
                if (cachedInterpretation) {
                    console.log('Using cached clarifying interpretation');
                    return { interpretation: cachedInterpretation };
                }
            }
            // Формируем описание оригинальных карт
            const originalCardsDescription = request.originalCards.map((card, index) => {
                const position = request.originalCards.length === 3
                    ? (index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее')
                    : '';
                return `${position ? `${position}: ` : ''}${card.name} - ${card.meaning}`;
            }).join('\n');
            const response = await getOpenAI().chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Ты — опытный практикующий таролог с многолетней практикой. Говори от первого лица, как живой консультант; не упоминай, что ты ИИ. Твоя задача — дать развёрнутый, точный и полезный ответ на уточняющий вопрос к уже проведённому раскладу, учитывая контекст оригинального вопроса и значение уточняющей карты.\n\nВАЖНО: НЕ используй символы ### или ** для форматирования. Пиши обычным текстом, разделяя смысловые блоки пустой строкой. Отвечай на том языке, на котором задан уточняющий вопрос (чаще всего — русский).\n\nОбщие правила:\n1. Пиши развернуто и по существу. Минимальная длина ответа — ~150 слов; для сложных уточнений — 250–400 слов.\n2. Избегай категоричных утверждений; используй «возможно», «вероятно», «это может означать», «рекомендую».\n3. Если тема касается здоровья, права или финансов — дай короткое предостережение и посоветуй обратиться к профильному специалисту; не давай профессиональных рекомендаций в этих областях.\n4. Если ориентация/позиция карты или контекст не указаны — сделай обоснованные предположения и ясно пометь их словами «предположительно» или «возможно».\n5. Учитывай перевёрнутую карту отдельно: поясни, как меняется смысл (задержка, внутренние блоки, ослабление энергии и т.п.).\n6. Если пользователь просит временные ориентиры, используй общие рамки: неделя / месяц / 3 месяца; не называй точных дат.\n\nСтруктура ответа (обязательна):\n1) Короткое напоминание контекста (1–2 предложения): кратко верни суть оригинального вопроса и уточнения.\n2) КАРТА УТОЧНЕНИЯ: название, ориентация (если есть), 2–4 предложения ключевых значений карты в общем.\n3) КОНТЕКСТ В ОТНОШЕНИИ ИСХОДНОГО РАСКЛАДА: 4–7 предложений о том, как эта карта меняет/уточняет прежнюю интерпретацию, какие новые нюансы проявляются.\n4) ПРЯМОЙ ОТВЕТ НА УТОЧНЯЮЩИЙ ВОПРОС: 3–6 предложений, ясный и практичный вывод в контексте вопроса.\n5) ПРАКТИЧЕСКИЕ РЕКОМЕНДАЦИИ: 3 конкретных шага или советов, которые пользователь может применить немедленно.\n6) ВОЗМОЖНЫЕ ПРЕПЯТСТВИЯ И ЧТО ИЗБЕЖАТЬ: 1–3 кратких пункта о рисках/ловушках.\n7) КРАТКИЙ ИТОГ (1 предложение) и ОДНА ФРАЗА-НАСТАВЛЕНИЕ (1 предложение — мотивация/мантра).\n\nТон: уважительный, эмпатичный, уверенный, но не навязчивый. При давлении неопределённости — указывай степень уверенности и альтернативные сценарии. Используй эмодзи экономно, только если это уместно и по тону вопроса.\n\nЕсли данных явно не хватает — сделай лучшее возможное толкование, явно пометив предположения и причины, по которым ты к ним пришёл."
                    },
                    {
                        role: "user",
                        content: `Оригинальный вопрос: ${request.originalQuestion}

Оригинальные карты:
${originalCardsDescription}

Уточняющий вопрос: ${request.clarifyingQuestion}

Карта для уточнения: ${request.clarifyingCard.name} — ${request.clarifyingCard.meaning}

Дай развернутый ответ на уточняющий вопрос, строго следуя указанной структуре и правилам.`
                    }
                ],
                max_tokens: 800, // Увеличили для развернутых ответов по новой структуре
                temperature: 0.7, // Увеличили для более творческих ответов
            });
            const rawInterpretation = response.choices[0].message.content || 'Не удалось получить толкование.';
            console.log('Raw interpretation from OpenAI (clarifying):', rawInterpretation);
            console.log('Raw interpretation length:', rawInterpretation.length);
            // Очищаем и форматируем текст
            const cleanedInterpretation = textProcessor_1.TextProcessor.cleanAiText(rawInterpretation);
            const formattedInterpretation = textProcessor_1.TextProcessor.formatText(cleanedInterpretation);
            console.log('Cleaned interpretation:', cleanedInterpretation);
            console.log('Formatted interpretation:', formattedInterpretation);
            // Сохраняем в кэш
            interpretationCache.set(cacheKey, formattedInterpretation);
            cacheTimestamps.set(cacheKey, Date.now());
            return {
                interpretation: formattedInterpretation
            };
        }
        catch (error) {
            console.error('OpenAI clarifying question error:', error);
            throw new Error('Ошибка при обращении к OpenAI API для уточняющего вопроса');
        }
    }
    static async analyzeYesNoQuestion(request) {
        try {
            // Проверяем кэш для Да/Нет вопросов
            const cacheKey = `yesno_${request.question}|${request.card.name}`;
            if (isCacheValid(cacheKey)) {
                const cachedResult = interpretationCache.get(cacheKey);
                if (cachedResult) {
                    console.log('Using cached Yes/No analysis');
                    return JSON.parse(cachedResult);
                }
            }
            const openai = getOpenAI();
            const prompt = `Ты — опытный таролог с многолетней практикой, который даёт развёрнутые ответы на вопросы в формате ДА или НЕТ.
Отвечай строго в формате JSON, без дополнительного текста.

Контекст:
Пользователь задал вопрос: "${request.question}"

Выпала карта: ${request.card.name}
Значение карты: ${request.card.meaning}
Совет карты: ${request.card.advice}
Ключевые слова: ${request.card.keywords}

Правила:
1. Всегда возвращай ответ только в JSON-формате.
2. Поле "answer" должно содержать либо "ДА", либо "НЕТ".
3. Даже если карта имеет двойственное значение, ты обязан выбрать один вариант (ДА или НЕТ), основываясь на контексте карты и вопроса. 
   В таком случае в "interpretation" поясни нюансы.
4. Поле "interpretation" должно быть ОЧЕНЬ ПОДРОБНЫМ объяснением (7-10 предложений):
   - Почему выбран именно этот ответ
   - Как карта соотносится с вопросом
   - Детальный анализ ситуации
   - Конкретные практические советы (3-4 пункта)
   - Предупреждения о возможных препятствиях
   - Что нужно учитывать
   - Мотивирующее заключение
5. Используй только русский язык.

Формат ответа:
{
  "answer": "ДА" или "НЕТ",
  "interpretation": "ОЧЕНЬ подробное и развёрнутое объяснение (7-10 предложений) с детальным анализом, советами и рекомендациями"
}`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты опытный таролог с многолетней практикой, который дает развернутые ответы ДА/НЕТ с подробными объяснениями. Говори от первого лица, как живой консультант. Давай детальные советы с конкретными рекомендациями, предупреждениями и мотивацией.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 700 // Увеличили для ОЧЕНЬ развернутых интерпретаций
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('Пустой ответ от OpenAI');
            }
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response);
            }
            catch (parseError) {
                console.error('Failed to parse OpenAI response:', response);
                // Fallback response
                parsedResponse = {
                    answer: 'НЕТ',
                    interpretation: `Карта "${request.card.name}" советует: ${request.card.advice}. Это означает: ${request.card.meaning}.`
                };
            }
            // Валидируем ответ
            if (!['ДА', 'НЕТ'].includes(parsedResponse.answer)) {
                parsedResponse.answer = 'НЕТ';
            }
            if (!parsedResponse.interpretation) {
                parsedResponse.interpretation = `Карта "${request.card.name}" советует: ${request.card.advice}. Это означает: ${request.card.meaning}.`;
            }
            // Кэшируем результат
            interpretationCache.set(cacheKey, JSON.stringify(parsedResponse));
            cacheTimestamps.set(cacheKey, Date.now());
            return parsedResponse;
        }
        catch (error) {
            console.error('OpenAI Yes/No analysis error:', error);
            throw new Error('Ошибка при обращении к OpenAI API для анализа Да/Нет');
        }
    }
    static async generateDailyAdvice(request) {
        try {
            console.log(`OpenAI generateDailyAdvice called for card: ${request.card.name}`);
            const cacheKey = `daily_${request.card.name}`;
            if (isCacheValid(cacheKey)) {
                const cachedResult = interpretationCache.get(cacheKey);
                if (cachedResult) {
                    console.log('Using cached daily advice');
                    return JSON.parse(cachedResult);
                }
            }
            const openai = getOpenAI();
            console.log('OpenAI client initialized, making API call...');
            const prompt = `Ты — опытный таролог, который даёт КРАТКИЕ и чёткие советы на день.
Говори от первого лица, как живой консультант; не упоминай, что ты ИИ.

Сегодня выпала карта: ${request.card.name}
Значение карты: ${request.card.meaning}
Совет карты: ${request.card.advice}
Ключевые слова: ${request.card.keywords}

Правила:
- Ответ должен быть КРАТКИМ (2-3 предложения максимум)
- Только самое важное - без воды и длинных объяснений
- Один конкретный совет на день
- Используй живой, понятный язык
- Пиши на русском языке`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты опытный таролог, который дает КРАТКИЕ и чёткие советы на день. Говори от первого лица. Отвечай максимально кратко - 2-3 предложения, только самое важное.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 150 // Уменьшили для кратких советов
            });
            console.log('OpenAI API call completed successfully');
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('Пустой ответ от OpenAI');
            }
            const advice = response.trim();
            console.log(`OpenAI generated advice: ${advice}`);
            // Кэшируем результат
            interpretationCache.set(cacheKey, JSON.stringify({ advice }));
            cacheTimestamps.set(cacheKey, Date.now());
            return { advice };
        }
        catch (error) {
            console.error('OpenAI daily advice error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                status: error.status,
                code: error.code,
                type: error.type
            });
            // Пробрасываем ошибку наверх для правильного логирования
            throw error;
        }
    }
    static async interpretThreeCards(request) {
        try {
            const openai = getOpenAI();
            console.log('OpenAI client initialized for three cards interpretation...');
            const positions = {
                'past': 'Прошлое',
                'present': 'Настоящее',
                'future': 'Будущее'
            };
            const categoryNames = {
                'love': 'любви и отношений',
                'career': 'карьеры и бизнеса',
                'personal': 'личностного развития'
            };
            const prompt = `Ты — опытный таролог с многолетней практикой, который даёт подробные и практичные толкования раскладов. 
Говори от первого лица, как живой консультант; не упоминай, что ты ИИ.

Расклад на три карты в области ${categoryNames[request.category] || 'общих вопросов'}.
${request.userQuestion ? `Вопрос клиента: "${request.userQuestion}"` : ''}

Выпавшие карты:
${request.cards.map(card => `
${positions[card.position]}: ${card.name}
Значение: ${card.meaning}
Совет: ${card.advice}
Ключевые слова: ${card.keywords}
`).join('\n')}

Твоя задача — дать максимально развёрнутое и подробное толкование всего расклада, связав карты в единую историю.

Структура ответа:
1. Введение: что показывают карты в целом (2-3 предложения)
2. Прошлое: детальный анализ первой карты и её влияния на ситуацию (3-4 предложения)
3. Настоящее: глубокое толкование второй карты и текущего состояния (3-4 предложения)
4. Будущее: подробное описание третьей карты и перспектив (3-4 предложения)
5. Связь между картами: как они взаимодействуют и дополняют друг друга (2-3 предложения)
6. Практические рекомендации: конкретные шаги и действия (3-4 предложения)
7. Предупреждения и возможности: что важно учесть (2-3 предложения)

Правила:
- Ответ должен быть очень объёмным (20-25 предложений минимум)
- Свяжи карты в единую логическую историю с глубоким анализом
- Давай максимально конкретные практические советы
- Используй живой, понятный язык с примерами
- Пиши на русском языке
- Будь позитивным, но реалистичным
- Учитывай контекст вопроса клиента, если он задан
- Добавляй детали и нюансы для полного понимания ситуации`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Ты опытный таролог с многолетней практикой, который дает подробные толкования раскладов. Говори от первого лица, как живой консультант. Связывай карты в единую историю и давай практические советы.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 1500
            });
            console.log('OpenAI three cards API call completed successfully');
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('Пустой ответ от OpenAI');
            }
            const interpretation = response.trim();
            console.log(`OpenAI generated three cards interpretation: ${interpretation}`);
            return { interpretation };
        }
        catch (error) {
            console.error('OpenAI three cards interpretation error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                status: error.status,
                code: error.code,
                type: error.type
            });
            // Пробрасываем ошибку наверх для правильного логирования
            throw error;
        }
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openai.js.map