import Joi from 'joi';
export declare const schemas: {
    singleCardReading: Joi.ObjectSchema<any>;
    threeCardsReading: Joi.ObjectSchema<any>;
    yesNoReading: Joi.ObjectSchema<any>;
    telegramAuth: Joi.ObjectSchema<any>;
    createInvoice: Joi.ObjectSchema<any>;
};
export declare const validate: (schema: Joi.ObjectSchema) => (req: any, res: any, next: any) => any;
export declare const sanitizeInput: (req: any, res: any, next: any) => void;
//# sourceMappingURL=validation.d.ts.map