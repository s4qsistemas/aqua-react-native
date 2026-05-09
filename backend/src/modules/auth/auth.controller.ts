import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definido en el archivo .env.");
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const getTempPassword = () => (process.env.DEFAULT_TEMP_PASSWORD || "AquaTemporal2026!").trim();

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: "Faltan credenciales" });
            return;
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email },
            include: { 
                tenant: {
                    include: { plan: true }
                } 
            }
        });

        if (!usuario) {
            res.status(401).json({ error: "Credenciales inválidas" });
            return;
        }

        if (usuario.estado !== "ACTIVO") {
            res.status(403).json({ error: "Usuario inactivo" });
            return;
        }

        if (usuario.tenant && usuario.tenant.estado !== "ACTIVO") {
            res.status(403).json({ error: "Tu comunidad se encuentra inactiva. Contacta al administrador." });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, usuario.passwordHash);

        if (!isPasswordValid) {
            res.status(401).json({ error: "Credenciales inválidas" });
            return;
        }

        // Detectar si está usando la contraseña genérica (comparando hashes para máxima seguridad)
        const isTempPassword = await bcrypt.compare(getTempPassword(), usuario.passwordHash);

        const token = jwt.sign(
            {
                id: usuario.id,
                rol: usuario.rol,
                tenantId: usuario.tenantId
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        const { passwordHash, ...userWithoutPassword } = usuario;

        res.status(200).json({
            token,
            user: userWithoutPassword,
            requirePasswordChange: isTempPassword // <-- ¡NUEVA BANDERA!
        });

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// NUEVO ENDPOINT: Cambio de contraseña obligatorio
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { newPassword } = req.body;

        if (!userId) {
            res.status(401).json({ error: "No autenticado" });
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
            return;
        }

        // Hasheamos la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Actualizamos en la base de datos
        await prisma.usuario.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash }
        });

        res.status(200).json({ message: "Contraseña actualizada exitosamente" });

    } catch (error) {
        console.error("Error en changePassword:", error);
        res.status(500).json({ error: "Error interno del servidor al cambiar contraseña" });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    // ... tu código de getMe se mantiene exactamente igual que antes
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: "No autenticado" });
            return;
        }

        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            include: { 
                tenant: {
                    include: { plan: true }
                }
            }
        });

        if (!usuario) {
            res.status(404).json({ error: "Usuario no encontrado" });
            return;
        }

        const { passwordHash, ...userWithoutPassword } = usuario;
        
        // También verificamos aquí por si acaso el usuario ya tiene sesión pero su clave fue reseteada
        const isTempPassword = await bcrypt.compare(getTempPassword(), usuario.passwordHash);
        
        res.status(200).json({
            ...userWithoutPassword,
            requirePasswordChange: isTempPassword
        });

    } catch (error) {
        console.error("Error en getMe:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};