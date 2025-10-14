"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// Create payment invoice
router.post('/create-invoice', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { plan } = req.body; // 'monthly' or 'yearly'
        const user = await User_1.User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isPremium) {
            return res.status(400).json({ error: 'User already has premium access' });
        }
        const prices = {
            monthly: 299, // 299 rubles
            yearly: 2990 // 2990 rubles (2 months free)
        };
        const price = prices[plan];
        if (!price) {
            return res.status(400).json({ error: 'Invalid plan' });
        }
        // In production, integrate with actual payment provider
        // For now, we'll create a mock invoice
        const invoice = {
            id: `invoice_${Date.now()}`,
            title: plan === 'monthly' ? 'Месячная подписка' : 'Годовая подписка',
            description: plan === 'monthly'
                ? 'Неограниченные расклады на 1 месяц'
                : 'Неограниченные расклады на 1 год',
            currency: 'RUB',
            prices: [{
                    label: plan === 'monthly' ? 'Месячная подписка' : 'Годовая подписка',
                    amount: price * 100 // Amount in kopecks
                }],
            payload: JSON.stringify({
                userId: user?._id?.toString() || '',
                plan,
                telegramId: user.telegramId
            })
        };
        res.json({ invoice });
    }
    catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});
// Handle successful payment
router.post('/payment-success', async (req, res) => {
    try {
        const { payload } = req.body;
        if (!payload) {
            return res.status(400).json({ error: 'Payload is required' });
        }
        const paymentData = JSON.parse(payload);
        const user = await User_1.User.findById(paymentData.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Calculate expiration date
        const now = new Date();
        const expirationDate = new Date(now);
        if (paymentData.plan === 'monthly') {
            expirationDate.setMonth(expirationDate.getMonth() + 1);
        }
        else if (paymentData.plan === 'yearly') {
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        }
        // Update user premium status
        user.isPremium = true;
        user.premiumExpiresAt = expirationDate;
        await user.save();
        res.json({
            success: true,
            message: 'Premium access activated',
            expiresAt: expirationDate
        });
    }
    catch (error) {
        console.error('Payment success error:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});
// Check premium status
router.get('/premium-status', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const user = await User_1.User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if premium has expired
        if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
            user.isPremium = false;
            user.premiumExpiresAt = undefined;
            await user.save();
        }
        res.json({
            isPremium: user.isPremium,
            expiresAt: user.premiumExpiresAt
        });
    }
    catch (error) {
        console.error('Premium status error:', error);
        res.status(500).json({ error: 'Failed to check premium status' });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map