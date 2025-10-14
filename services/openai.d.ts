import { TarotCard } from '../data/tarotCards';
export interface InterpretationRequest {
    question: string;
    cards: TarotCard[];
}
export interface InterpretationResponse {
    interpretation: string;
}
export interface ClarifyingQuestionRequest {
    clarifyingQuestion: string;
    originalQuestion: string;
    originalCards: TarotCard[];
    clarifyingCard: TarotCard;
}
export interface ClarifyingQuestionResponse {
    interpretation: string;
}
export interface YesNoAnalysisRequest {
    question: string;
    card: TarotCard;
}
export interface YesNoAnalysisResponse {
    answer: 'ДА' | 'НЕТ';
    interpretation: string;
}
export interface DailyAdviceRequest {
    card: TarotCard;
}
export interface DailyAdviceResponse {
    advice: string;
}
export interface ThreeCardsRequest {
    cards: Array<{
        name: string;
        meaning: string;
        advice: string;
        keywords: string;
        position: string;
    }>;
    category: string;
    userQuestion?: string;
}
export interface ThreeCardsResponse {
    interpretation: string;
}
export declare class OpenAIService {
    static interpretReading(request: InterpretationRequest): Promise<InterpretationResponse>;
    static interpretYesNoClarifyingQuestion(request: ClarifyingQuestionRequest): Promise<ClarifyingQuestionResponse>;
    static interpretClarifyingQuestion(request: ClarifyingQuestionRequest): Promise<ClarifyingQuestionResponse>;
    static analyzeYesNoQuestion(request: YesNoAnalysisRequest): Promise<YesNoAnalysisResponse>;
    static generateDailyAdvice(request: DailyAdviceRequest): Promise<DailyAdviceResponse>;
    static interpretThreeCards(request: ThreeCardsRequest): Promise<ThreeCardsResponse>;
}
//# sourceMappingURL=openai.d.ts.map