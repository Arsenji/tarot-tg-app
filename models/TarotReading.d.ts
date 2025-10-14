import mongoose, { Document } from 'mongoose';
export interface ITarotReading extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'single' | 'three_cards' | 'yes_no';
    category?: 'love' | 'career' | 'personal';
    userQuestion?: string;
    clarifyingQuestions?: Array<{
        question: string;
        card: {
            name: string;
            meaning: string;
            advice: string;
            keywords: string;
            imagePath?: string;
        };
        interpretation: string;
        timestamp: Date;
    }>;
    cards: Array<{
        name: string;
        position?: 'past' | 'present' | 'future';
        meaning: string;
        advice: string;
        keywords: string;
        imagePath?: string;
        detailedDescription?: {
            general: string;
            love: string;
            career: string;
            personal: string;
            reversed?: string;
        };
    }>;
    interpretation: string;
    createdAt: Date;
}
export declare const TarotReading: mongoose.Model<ITarotReading, {}, {}, {}, mongoose.Document<unknown, {}, ITarotReading, {}, {}> & ITarotReading & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=TarotReading.d.ts.map