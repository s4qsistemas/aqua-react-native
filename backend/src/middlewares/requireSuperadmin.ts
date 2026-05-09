import { Request, Response, NextFunction } from "express";

export const requireSuperadmin = (req: Request, res: Response, next: NextFunction): void => {
    // ¡Adiós al (req as any)! Ahora TypeScript autocompleta req.user
    const usuario = req.user;

    if (!usuario) {
        res.status(401).json({ message: "No autenticado" });
        return;
    }

    if (usuario.rol !== "SUPERADMIN") {
        res.status(403).json({ message: "Acceso solo para superadmin" });
        return;
    }

    next();
};