import { JwtPayload } from 'jsonwebtoken';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                userId: string;
            };
        }
    }
}
export {};
//# sourceMappingURL=express.d.ts.map