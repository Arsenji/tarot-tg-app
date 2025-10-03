export interface TarotCard {
  name: string;
  imagePath?: string;
  image?: string;
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
    displayDescription?: string;
  };
}

export interface TarotCardData {
  name: string;
  interpretation: string;
  imageUrl: string;
}

export interface CategoryData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
}

export type ReadingCategory = 'love' | 'career' | 'personal';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ThreeCardsResponse {
  readingId: string;
  cards: TarotCard[];
  interpretation: string;
  category: ReadingCategory;
}

export interface ClarifyingQuestionRequest {
  readingId: string;
  clarifyingQuestion: string;
  clarifyingCard: TarotCard;
}

export interface YesNoResponse {
  answer: 'ДА' | 'НЕТ';
  interpretation: string;
}
