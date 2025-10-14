"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// Telegram WebApp authentication
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            return res.status(400).json({ error: 'Init data is required' });
        }
        // In production, you should validate the initData signature
        // For now, we'll parse it directly
        const urlParams = new URLSearchParams(initData);
        const userData = JSON.parse(urlParams.get('user') || '{}');
        
        // 🔍 DEBUG: Log parsed user data
        console.log('🔍 AUTH: Parsed userData:', {
            id: userData.id,
            first_name: userData.first_name,
            username: userData.username
        });
        
        // Allow test user for development
        if (!userData.id && !initData.includes('test_hash')) {
            console.error('❌ AUTH: No user id in userData!');
            return res.status(400).json({ error: 'Invalid user data' });
        }
        
        // Find or create user
        console.log(`🔍 AUTH: Looking for user with telegramId: ${userData.id}`);
        let user = await User_1.User.findOne({ telegramId: userData.id });
        console.log(`🔍 AUTH: User found: ${user ? `YES (id: ${user._id})` : 'NO'}`);
        if (!user) {
            console.log('⚠️ AUTH: Creating NEW user!');
            user = new User_1.User({
                telegramId: userData.id,
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                username: userData.username || '',
                languageCode: userData.language_code || 'ru',
                isPremium: false
            });
            await user.save();
            console.log(`✅ AUTH: New user created with id: ${user._id}`);
        }
        else {
            console.log(`✅ AUTH: User exists, updating data for id: ${user._id}`);
            // Update user data
            user.firstName = userData.first_name || user.firstName;
            user.lastName = userData.last_name || user.lastName;
            user.username = userData.username || user.username;
            user.languageCode = userData.language_code || user.languageCode;
            await user.save();
        }
        // Generate JWT token
        console.log(`🔑 AUTH: Generating token for userId: ${user._id}, telegramId: ${user.telegramId}`);
        const token = jsonwebtoken_1.default.sign({ userId: user._id, telegramId: user.telegramId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });
        console.log(`✅ AUTH: Token generated successfully`);
        res.json({
            token,
            user: {
                id: user._id,
                telegramId: user.telegramId,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                languageCode: user.languageCode,
                isPremium: user.isPremium,
                premiumExpiresAt: user.premiumExpiresAt
            }
        });
    }
    catch (error) {
        console.error('Telegram auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});
// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User_1.User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user._id,
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            languageCode: user.languageCode,
            isPremium: user.isPremium,
            premiumExpiresAt: user.premiumExpiresAt
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map