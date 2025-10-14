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
export declare class YooKassaService {
    private shopId;
    private secretKey;
    private baseUrl;
    constructor(shopId: string, secretKey: string);
    private getAuthHeader;
    createPayment(amount: number, description: string, userId: string, planType: string, returnUrl: string): Promise<YooKassaPayment>;
    getPaymentStatus(paymentId: string): Promise<YooKassaPayment>;
    processWebhook(webhookData: any): Promise<boolean>;
}
export declare const SUBSCRIPTION_PLANS: Record<string, PaymentPlan>;
//# sourceMappingURL=yookassa.d.ts.map