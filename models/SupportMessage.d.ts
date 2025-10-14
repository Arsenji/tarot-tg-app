import mongoose, { Document } from 'mongoose';
export interface ISupportMessage extends Document {
    userId: string;
    telegramId: number;
    userName: string;
    userUsername?: string;
    message: string;
    status: 'new' | 'in_progress' | 'resolved';
    adminResponse?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupportMessage: mongoose.Model<ISupportMessage, {}, {}, {}, mongoose.Document<unknown, {}, ISupportMessage, {}, {}> & ISupportMessage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SupportMessage.d.ts.map