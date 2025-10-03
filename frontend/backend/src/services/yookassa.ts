import axios from 'axios';

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
}

export interface YooKassaPayment {
  id: string;
  status: string;
  paid: boolean;
  amount: {
    value: string;
    currency: string;
  };
  created_at: string;
  description: string;
  metadata: {
    userId: string;
    planType: string;
  };
  confirmation: {
    type: string;
    confirmation_url: string;
  };
}

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
    amount: number,
    description: string,
    userId: string,
    planType: string,
    returnUrl: string
  ): Promise<YooKassaPayment> {
    try {
      const paymentData = {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: returnUrl
        },
        capture: true,
        description,
        metadata: {
          userId,
          planType
        },
        receipt: {
          customer: {
            email: `user_${userId}@tarolog.app`
          },
          items: [
            {
              description: `Подписка "${planType}"`,
              quantity: '1',
              amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
              },
              vat_code: '1'
            }
          ]
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/payments`,
        paymentData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotence-Key': `${userId}_${planType}_${Date.now()}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('YooKassa payment creation error:', error);
      throw new Error('Failed to create payment');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<YooKassaPayment> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('YooKassa payment status error:', error);
      throw new Error('Failed to get payment status');
    }
  }

  async processWebhook(webhookData: any): Promise<boolean> {
    try {
      const { event, object } = webhookData;

      if (event === 'payment.succeeded') {
        const { metadata } = object;
        const { userId, planType } = metadata;

        // Здесь можно добавить логику обновления подписки пользователя
        console.log(`Payment succeeded for user ${userId}, plan ${planType}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('YooKassa webhook processing error:', error);
      return false;
    }
  }
}

// Тарифы подписки
export const SUBSCRIPTION_PLANS: Record<string, PaymentPlan> = {
  weekly: {
    id: 'weekly',
    name: '1 неделя',
    price: 99,
    duration: 7,
    description: 'Полный доступ ко всем функциям на 7 дней'
  },
  monthly: {
    id: 'monthly',
    name: '1 месяц',
    price: 299,
    duration: 30,
    description: 'Полный доступ ко всем функциям на 30 дней'
  },
  quarterly: {
    id: 'quarterly',
    name: '3 месяца',
    price: 699,
    duration: 90,
    description: 'Полный доступ ко всем функциям на 90 дней (скидка 22%)'
  },
  yearly: {
    id: 'yearly',
    name: '12 месяцев',
    price: 2799,
    duration: 365,
    description: 'Полный доступ ко всем функциям на 365 дней (скидка 22%)'
  }
};
