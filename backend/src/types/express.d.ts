import { Rol } from "@prisma/client";

declare global {
    namespace Express {
        export interface Request {
            user?: {
                id: number;
                rol: Rol;
                tenantId: number | null;
            };
        }
    }
}