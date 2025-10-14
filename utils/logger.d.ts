import winston from 'winston';
declare const logger: winston.Logger;
export declare const requestLogger: (req: any, res: any, next: any) => void;
export declare const logError: (error: Error, context?: any) => void;
export declare const logSecurityEvent: (event: string, details: any) => void;
export declare const logBusinessEvent: (event: string, details: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map