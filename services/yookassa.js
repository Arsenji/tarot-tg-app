"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_PLANS = exports.YooKassaService = void 0;
const axios_1 = __importDefault(require("axios"));
class YooKassaService {
    constructor(shopId, secretKey) {
        this.baseUrl = 'https://api.yookassa.ru/v3';
        this.shopId = shopId;
        this.secretKey = secretKey;
    }
    getAuthHeader() {
        return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`;
    }
    async createPayment(amount, description, userId, planType, returnUrl) {
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
                }
            };
            
            console.log('💳 Creating YooKassa payment:', {
                amount: paymentData.amount,
                description: paymentData.description,
                userId,
                planType,
                returnUrl
            });
            
            const response = await axios_1.default.post(`${this.baseUrl}/payments`, paymentData, {
                headers: {
                    'Authorization': this.getAuthHeader(),
                    'Content-Type': 'application/json',
                    'Idempotence-Key': `${userId}_${planType}_${Date.now()}`
                }
            });
            
            console.log('✅ YooKassa payment created:', {
                paymentId: response.data.id,
                status: response.data.status,
                confirmation_url: response.data.confirmation?.confirmation_url
            });
            
            return response.data;
        }
        catch (error) {
            console.error('❌ YooKassa payment creation error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error('Failed to create payment');
        }
    }
    async getPaymentStatus(paymentId) {
        try {
            console.log('🔍 Checking YooKassa payment status:', paymentId);
            
            const response = await axios_1.default.get(`${this.baseUrl}/payments/${paymentId}`, {
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });
            
            console.log('📊 YooKassa payment status:', {
                paymentId: response.data.id,
                status: response.data.status,
                paid: response.data.paid,
                amount: response.data.amount
            });
            
            return response.data;
        }
        catch (error) {
            console.error('❌ YooKassa payment status error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw new Error('Failed to get payment status');
        }
    }
    async processWebhook(webhookData) {
        try {
            console.log('🔔 Processing YooKassa webhook:', {
                event: webhookData.event,
                paymentId: webhookData.object?.id
            });
            
            const { event, object } = webhookData;
            if (event === 'payment.succeeded') {
                const { metadata } = object;
                const { userId, planType } = metadata;
                
                console.log('✅ Payment succeeded:', {
                    userId,
                    planType,
                    paymentId: object.id,
                    amount: object.amount
                });
                
                return true;
            }
            
            console.log('⚠️ Webhook event not handled:', event);
            return false;
        }
        catch (error) {
            console.error('❌ YooKassa webhook processing error:', error);
            console.error('Error details:', {
                message: error.message,
                webhookData
            });
            return false;
        }
    }
}
exports.YooKassaService = YooKassaService;
// Тарифы подписки
exports.SUBSCRIPTION_PLANS = {
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
//# sourceMappingURL=yookassa.js.map