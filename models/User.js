"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    telegramId: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        default: ''
    },
    username: {
        type: String,
        default: ''
    },
    languageCode: {
        type: String,
        default: 'ru'
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    premiumExpiresAt: {
        type: Date,
        default: null
    },
    subscriptionStatus: {
        type: Number,
        enum: [0, 1],
        default: 0
    },
    subscriptionExpiry: {
        type: Date,
        default: null
    },
    subscriptionActivatedAt: {
        type: Date,
        default: null
    },
    freeDailyAdviceUsed: {
        type: Boolean,
        default: false
    },
    freeYesNoUsed: {
        type: Boolean,
        default: false
    },
    freeThreeCardsUsed: {
        type: Boolean,
        default: false
    },
    lastDailyAdviceDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});
// Indexes (telegramId уже имеет index: true в схеме)
UserSchema.index({ isPremium: 1 });
UserSchema.index({ subscriptionStatus: 1 });
UserSchema.index({ subscriptionExpiry: 1 });
exports.User = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map