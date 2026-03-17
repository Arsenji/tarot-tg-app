import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  userId: string;
  status: 'pending' | 'succeeded' | 'canceled';
  subscriptionActivated: boolean;
  plan?: string;
  returnRef?: string; // ref из return_url для lookup после редиректа
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'canceled'],
    default: 'pending',
  },
  subscriptionActivated: {
    type: Boolean,
    default: false,
  },
  plan: {
    type: String,
    default: null,
  },
  returnRef: {
    type: String,
    sparse: true,
    index: true,
  },
}, {
  timestamps: true,
});

PaymentSchema.index({ paymentId: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ returnRef: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
