import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export declare const ErrorTypes: {
    VALIDATION_ERROR: string;
    AUTHENTICATION_ERROR: string;
    AUTHORIZATION_ERROR: string;
    NOT_FOUND_ERROR: string;
    DATABASE_ERROR: string;
    EXTERNAL_SERVICE_ERROR: string;
    RATE_LIMIT_ERROR: string;
    INTERNAL_SERVER_ERROR: string;
};
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFound: (req: Request, res: Response, next: NextFunction) => void;
export declare const handleUnhandledRejection: () => void;
export declare const handleUncaughtException: () => void;
//# sourceMappingURL=errorHandler.d.ts.map