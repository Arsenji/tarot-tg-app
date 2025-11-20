import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportMessage extends Document {
  userId: string;
  telegramId: number;
  userName: string;
  userUsername: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  reply?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>({
  userId: {
    type: String,
    required: true
  },
  telegramId: {
    type: Number,
    required: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userUsername: {
    type: String,
    default: '',
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved'],
    default: 'new'
  },
  reply: {
    type: String,
    default: '',
    maxlength: 2000
  },
  repliedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
SupportMessageSchema.index({ userId: 1 });
SupportMessageSchema.index({ telegramId: 1 });
SupportMessageSchema.index({ status: 1 });
SupportMessageSchema.index({ createdAt: -1 });

export const SupportMessage = mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);
