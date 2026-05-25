import axios, { AxiosResponse } from 'axios';
import logger from '../utils/logger';
import { TOKEN_PACKAGES, TokenPackageId } from '../constants/tokens';

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
    tokenPackage: string;
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
    tokenPackage: string;
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

export { TOKEN_PACKAGES };

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

  async createTokenPayment(
    userId: string,
    packageId: TokenPackageId,
    returnUrl: string,
    cancelUrl?: string
  ): Promise<YooKassaPayment | null> {
    try {
      const pkg = TOKEN_PACKAGES[packageId];

      const paymentData: PaymentRequest = {
        amount: {
          value: pkg.price,
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: returnUrl,
        },
        description: `Покупка токенов: ${pkg.name}`,
        metadata: {
          userId,
          tokenPackage: String(packageId),
        },
        receipt: {
          customer: {
            email: `${userId}@tarot-bot.local`,
          },
          items: [{
            description: pkg.name,
            quantity: '1',
            amount: {
              value: pkg.price,
              currency: 'RUB',
            },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          }],
        },
      };

      if (cancelUrl) {
        paymentData.confirmation.cancel_url = cancelUrl;
      }

      logger.info('Creating YooKassa token payment', {
        userId,
        tokenPackage: packageId,
        amount: pkg.price,
        returnUrl,
        cancelUrl,
      });

      const response: AxiosResponse<YooKassaPayment> = await axios.post(
        `${this.baseUrl}/payments`,
        paymentData,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotence-Key': `${userId}-tokens-${packageId}-${Date.now()}`,
          },
        }
      );

      logger.info('YooKassa token payment created', {
        paymentId: response.data.id,
        userId,
        tokenPackage: packageId,
        status: response.data.status,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create YooKassa token payment', {
        error: error.response?.data || error.message,
        userId,
        packageId,
        returnUrl,
        cancelUrl,
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
            Authorization: this.getAuthHeader(),
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get YooKassa payment', {
        error: error.response?.data || error.message,
        paymentId,
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
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotence-Key': `cancel-${paymentId}-${Date.now()}`,
          },
        }
      );

      logger.info('YooKassa payment cancelled', { paymentId });
      return true;
    } catch (error: any) {
      logger.error('Failed to cancel YooKassa payment', {
        error: error.response?.data || error.message,
        paymentId,
      });
      return false;
    }
  }
}
