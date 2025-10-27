import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';

export interface YooKassaPayment {
  id: string;
  status: string;
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: string;
    confirmation_url: string;
  };
  created_at: string;
  description: string;
  metadata: {
    userId: string;
    plan: string;
  };
}

export interface PaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: string;
    return_url: string;
    cancel_url?: string;
  };
  description: string;
  metadata: {
    userId: string;
    plan: string;
  };
  receipt?: {
    customer: {
      email: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: {
        value: string;
        currency: string;
      };
      vat_code: number;
      payment_mode: string;
      payment_subject: string;
    }>;
  };
}

export const SUBSCRIPTION_PLANS = {
  weekly: {
    name: 'Недельная подписка',
    price: '99.00',
    duration: 7
  },
  monthly: {
    name: 'Месячная подписка',
    price: '299.00',
    duration: 30
  },
  quarterly: {
    name: 'Квартальная подписка',
    price: '799.00',
    duration: 90
  },
  yearly: {
    name: 'Годовая подписка',
    price: '2990.00',
    duration: 365
  }
};

export class YooKassaService {
  private shopId: string;
  private secretKey: string;
  private baseUrl = 'https://api.yookassa.ru/v3';

  constructor(shopId: string, secretKey: string) {
    this.shopId = shopId;
    this.secretKey = secretKey;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`;
  }

  async createPayment(
    userId: string,
    plan: keyof typeof SUBSCRIPTION_PLANS,
    returnUrl: string,
    cancelUrl?: string
  ): Promise<YooKassaPayment | null> {
    try {
      const planConfig = SUBSCRIPTION_PLANS[plan];
      
      const paymentData: PaymentRequest = {
        amount: {
          value: planConfig.price,
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: returnUrl
        },
        description: `Подписка на Таро-бот: ${planConfig.name}`,
        metadata: {
          userId,
          plan
        },
        receipt: {
          customer: {
            email: `${userId}@tarot-bot.local`
          },
          items: [{
            description: planConfig.name,
            quantity: '1',
            amount: {
              value: planConfig.price,
              currency: 'RUB'
            },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service'
          }]
        }
      };

      if (cancelUrl) {
        paymentData.confirmation.cancel_url = cancelUrl;
      }

      logger.info('Creating YooKassa payment', {
        userId,
        plan,
        amount: planConfig.price,
        returnUrl,
        cancelUrl
      });

      const response: AxiosResponse<YooKassaPayment> = await axios.post(
        `${this.baseUrl}/payments`,
        paymentData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotence-Key': `${userId}-${plan}-${Date.now()}`
          }
        }
      );

      logger.info('YooKassa payment created successfully', {
        paymentId: response.data.id,
        userId,
        plan,
        status: response.data.status
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create YooKassa payment', {
        error: error.response?.data || error.message,
        userId,
        plan,
        returnUrl,
        cancelUrl
      });
      return null;
    }
  }

  async getPayment(paymentId: string): Promise<YooKassaPayment | null> {
    try {
      const response: AxiosResponse<YooKassaPayment> = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get YooKassa payment', {
        error: error.response?.data || error.message,
        paymentId
      });
      return null;
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotence-Key': `cancel-${paymentId}-${Date.now()}`
          }
        }
      );

      logger.info('YooKassa payment cancelled', { paymentId });
      return true;
    } catch (error: any) {
      logger.error('Failed to cancel YooKassa payment', {
        error: error.response?.data || error.message,
        paymentId
      });
      return false;
    }
  }
}
