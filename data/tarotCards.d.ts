export interface TarotCard {
    name: string;
    imagePath?: string;
    meaning: string;
    advice: string;
    keywords: string;
    isMajorArcana: boolean;
    suit: string;
    number: number;
    detailedDescription?: {
        general: string;
        love: string;
        career: string;
        personal: string;
        reversed?: string;
    };
}
export declare const majorArcana: TarotCard[];
export declare const minorArcana: TarotCard[];
export declare const allCards: TarotCard[];
export declare const getRandomCard: () => TarotCard;
export declare const getCardsByCategory: (category: "love" | "career" | "personal") => TarotCard[];
//# sourceMappingURL=tarotCards.d.ts.map