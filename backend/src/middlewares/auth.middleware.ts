import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Rol } from "@prisma/client";

// Validamos estrictamente la variable de entorno antes de arrancar
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definido en el archivo .env.");
    process.exit(1); // Detenemos la app para evitar brechas de seguridad
}

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedToken {
    id: number;
    rol: Rol;
    tenantId: number | null;
}

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Token no proporcionado o formato inválido" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

        // Asignación segura gracias a nuestra nueva interfaz, ¡adiós al 'any'!
        req.user = decoded;

        next();
    } catch (error) {
        res.status(403).json({ error: "Token inválido o expirado" });
    }
};