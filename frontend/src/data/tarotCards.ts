export interface TarotCard {
  name: string;
  image: string;
  keywords: string;
  advice: string;
  meaning: string;
  isMajorArcana: boolean;
  suit?: string;
  number?: number;
}

export const tarotCards: TarotCard[] = [
  // Major Arcana
  {
    name: "Шут",
    image: "/rider-waite-tarot/major_arcana_fool.png",
    keywords: "Начало, спонтанность, невинность, новые возможности",
    advice: "Доверьтесь интуиции и будьте открыты новым возможностям. Сегодня идеальный день для начала чего-то нового.",
    meaning: "Карта новых начинаний и невинной радости",
    isMajorArcana: true,
    number: 0
  },
  {
    name: "Маг",
    image: "/rider-waite-tarot/major_arcana_magician.png",
    keywords: "Воля, концентрация, мастерство, проявление",
    advice: "У вас есть все необходимые инструменты для достижения цели. Сосредоточьтесь на своих намерениях.",
    meaning: "Карта силы воли и способности воплощать мечты в реальность",
    isMajorArcana: true,
    number: 1
  },
  {
    name: "Жрица",
    image: "/rider-waite-tarot/major_arcana_priestess.png",
    keywords: "Интуиция, тайна, внутренняя мудрость, подсознание",
    advice: "Прислушайтесь к своей интуиции. Ответы придут изнутри, когда вы будете готовы их услышать.",
    meaning: "Карта внутренней мудрости и интуитивного знания",
    isMajorArcana: true,
    number: 2
  },
  {
    name: "Императрица",
    image: "/rider-waite-tarot/major_arcana_empress.png",
    keywords: "Плодородие, творчество, материнство, изобилие",
    advice: "Сегодня день творчества и изобилия. Позвольте себе наслаждаться красотой и плодами своих трудов.",
    meaning: "Карта плодородия, творчества и материнской энергии",
    isMajorArcana: true,
    number: 3
  },
  {
    name: "Император",
    image: "/rider-waite-tarot/major_arcana_emperor.png",
    keywords: "Власть, структура, авторитет, стабильность",
    advice: "Проявите лидерские качества и возьмите ответственность на себя. Структура и порядок принесут успех.",
    meaning: "Карта власти, структуры и лидерства",
    isMajorArcana: true,
    number: 4
  },
  {
    name: "Иерофант",
    image: "/rider-waite-tarot/major_arcana_hierophant.png",
    keywords: "Традиция, духовность, обучение, наставничество",
    advice: "Ищите мудрость в традициях и знаниях. Сегодня хороший день для обучения и духовного роста.",
    meaning: "Карта духовного наставничества и традиционной мудрости",
    isMajorArcana: true,
    number: 5
  },
  {
    name: "Влюбленные",
    image: "/rider-waite-tarot/major_arcana_lovers.png",
    keywords: "Любовь, выбор, гармония, отношения",
    advice: "Делайте выбор сердцем, а не разумом. Любовь и гармония должны быть вашими проводниками.",
    meaning: "Карта любви, выбора и гармоничных отношений",
    isMajorArcana: true,
    number: 6
  },
  {
    name: "Колесница",
    image: "/rider-waite-tarot/major_arcana_chariot.png",
    keywords: "Контроль, направление, победа, движение",
    advice: "Сохраняйте контроль над ситуацией и двигайтесь к цели с решимостью. Победа близка.",
    meaning: "Карта контроля, направления и победы",
    isMajorArcana: true,
    number: 7
  },
  {
    name: "Сила",
    image: "/rider-waite-tarot/major_arcana_strength.png",
    keywords: "Внутренняя сила, терпение, сострадание, контроль",
    advice: "Ваша внутренняя сила поможет преодолеть любые препятствия. Проявите терпение и сострадание.",
    meaning: "Карта внутренней силы и духовного контроля",
    isMajorArcana: true,
    number: 8
  },
  {
    name: "Отшельник",
    image: "/rider-waite-tarot/major_arcana_hermit.png",
    keywords: "Поиск, самоанализ, внутренний свет, мудрость",
    advice: "Время для внутреннего поиска и самоанализа. Ваш внутренний свет покажет путь.",
    meaning: "Карта внутреннего поиска и духовной мудрости",
    isMajorArcana: true,
    number: 9
  },
  {
    name: "Колесо Фортуны",
    image: "/rider-waite-tarot/major_arcana_fortune.png",
    keywords: "Судьба, циклы, изменения, удача",
    advice: "Принимайте изменения как часть жизненного цикла. Удача повернется в вашу сторону.",
    meaning: "Карта судьбы, циклов и жизненных изменений",
    isMajorArcana: true,
    number: 10
  },
  {
    name: "Справедливость",
    image: "/rider-waite-tarot/major_arcana_justice.png",
    keywords: "Баланс, справедливость, правда, карма",
    advice: "Стремитесь к балансу и справедливости во всех делах. Правда восторжествует.",
    meaning: "Карта справедливости, баланса и кармического воздаяния",
    isMajorArcana: true,
    number: 11
  },
  {
    name: "Повешенный",
    image: "/rider-waite-tarot/major_arcana_hanged.png",
    keywords: "Жертва, ожидание, новый взгляд, отпускание",
    advice: "Иногда нужно остановиться и посмотреть на ситуацию с другой стороны. Примите период ожидания.",
    meaning: "Карта жертвы, ожидания и смены перспективы",
    isMajorArcana: true,
    number: 12
  },
  {
    name: "Смерть",
    image: "/rider-waite-tarot/major_arcana_death.png",
    keywords: "Трансформация, окончание, возрождение, изменения",
    advice: "Примите необходимость перемен. Старое должно уйти, чтобы дать место новому.",
    meaning: "Карта трансформации и кардинальных изменений",
    isMajorArcana: true,
    number: 13
  },
  {
    name: "Умеренность",
    image: "/rider-waite-tarot/major_arcana_temperance.png",
    keywords: "Баланс, терпение, гармония, исцеление",
    advice: "Ищите баланс во всех аспектах жизни. Терпение и гармония принесут исцеление.",
    meaning: "Карта баланса, терпения и гармоничного исцеления",
    isMajorArcana: true,
    number: 14
  },
  {
    name: "Дьявол",
    image: "/rider-waite-tarot/major_arcana_devil.png",
    keywords: "Искушение, зависимость, материализм, освобождение",
    advice: "Остерегайтесь искушений и зависимостей. Освободитесь от того, что держит вас в плену.",
    meaning: "Карта искушений, зависимостей и необходимости освобождения",
    isMajorArcana: true,
    number: 15
  },
  {
    name: "Башня",
    image: "/rider-waite-tarot/major_arcana_tower.png",
    keywords: "Разрушение, откровение, освобождение, внезапные изменения",
    advice: "Примите разрушение старого как возможность для нового. Внезапные изменения ведут к освобождению.",
    meaning: "Карта разрушения старых структур и внезапных откровений",
    isMajorArcana: true,
    number: 16
  },
  {
    name: "Звезда",
    image: "/rider-waite-tarot/major_arcana_star.png",
    keywords: "Надежда, вдохновение, духовность, исцеление",
    advice: "Держитесь за надежду и вдохновение. Ваши мечты сбудутся, если вы будете верить.",
    meaning: "Карта надежды, вдохновения и духовного исцеления",
    isMajorArcana: true,
    number: 17
  },
  {
    name: "Луна",
    image: "/rider-waite-tarot/major_arcana_moon.png",
    keywords: "Иллюзии, подсознание, интуиция, страхи",
    advice: "Не все то, что кажется, является правдой. Доверьтесь интуиции, но будьте осторожны с иллюзиями.",
    meaning: "Карта иллюзий, подсознания и интуитивного знания",
    isMajorArcana: true,
    number: 18
  },
  {
    name: "Солнце",
    image: "/rider-waite-tarot/major_arcana_sun.png",
    keywords: "Радость, успех, жизненная сила, оптимизм",
    advice: "Сегодня день радости и успеха! Ваша жизненная сила на пике, наслаждайтесь моментом.",
    meaning: "Карта радости, успеха и жизненной силы",
    isMajorArcana: true,
    number: 19
  },
  {
    name: "Суд",
    image: "/rider-waite-tarot/major_arcana_judgement.png",
    keywords: "Возрождение, прощение, новый этап, призвание",
    advice: "Время для возрождения и нового этапа в жизни. Простите прошлое и примите свое призвание.",
    meaning: "Карта возрождения, прощения и нового жизненного этапа",
    isMajorArcana: true,
    number: 20
  },
  {
    name: "Мир",
    image: "/rider-waite-tarot/major_arcana_world.png",
    keywords: "Завершение, успех, достижение, целостность",
    advice: "Вы достигли важной вехи в жизни. Наслаждайтесь успехом и готовьтесь к новым целям.",
    meaning: "Карта завершения, успеха и достижения целей",
    isMajorArcana: true,
    number: 21
  }
];