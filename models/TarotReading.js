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
exports.TarotReading = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TarotReadingSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['single', 'three_cards', 'yes_no'],
        required: true
    },
    category: {
        type: String,
        enum: ['love', 'career', 'personal'],
        default: null
    },
    userQuestion: {
        type: String,
        default: null
    },
    clarifyingQuestions: [{
            question: {
                type: String,
                required: true
            },
            card: {
                name: {
                    type: String,
                    required: true
                },
                meaning: {
                    type: String,
                    required: true
                },
                advice: {
                    type: String,
                    required: true
                },
                keywords: {
                    type: String,
                    required: true
                },
                imagePath: {
                    type: String,
                    default: null
                }
            },
            interpretation: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }],
    cards: [{
            name: {
                type: String,
                required: true
            },
            position: {
                type: String,
                enum: ['past', 'present', 'future'],
                default: null
            },
            meaning: {
                type: String,
                required: true
            },
            advice: {
                type: String,
                required: true
            },
            keywords: {
                type: String,
                required: true
            },
            imagePath: {
                type: String,
                default: null
            },
            detailedDescription: {
                general: {
                    type: String,
                    default: null
                },
                love: {
                    type: String,
                    default: null
                },
                career: {
                    type: String,
                    default: null
                },
                personal: {
                    type: String,
                    default: null
                },
                reversed: {
                    type: String,
                    default: null
                }
            }
        }],
    interpretation: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});
// Indexes
TarotReadingSchema.index({ userId: 1, createdAt: -1 });
TarotReadingSchema.index({ type: 1 });
TarotReadingSchema.index({ category: 1 });
exports.TarotReading = mongoose_1.default.model('TarotReading', TarotReadingSchema);
//# sourceMappingURL=TarotReading.js.map