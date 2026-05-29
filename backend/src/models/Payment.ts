import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  userId: string;
  status: 'pending' | 'succeeded' | 'canceled';
  /** @deprecated legacy subscription flag */
  subscriptionActivated: boolean;
  tokensCredited: boolean;
  processed: boolean;
  /** @deprecated legacy subscription plan id */
  plan?: string;
  tokenPackage?: string;
  returnRef?: string;
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
  tokensCredited: {
    type: Boolean,
    default: false,
  },
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },
  plan: {
    type: String,
    default: null,
  },
  tokenPackage: {
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

PaymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
