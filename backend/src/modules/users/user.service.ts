import prisma from '../../lib/prisma';
import bcrypt from 'bcryptjs';

const DEFAULT_TEMP_PASSWORD = process.env.DEFAULT_TEMP_PASSWORD || "AquaTemporal2026!";

export const crearUsuario = async (data: any) => {
    const { tenantId, nombre, email, rol } = data;

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) throw new Error('El correo electrónico ya está registrado.');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_TEMP_PASSWORD, salt);

    return prisma.$transaction(async (tx) => {
        let isPrimary = false;
        let adminActual = null;

        if (rol === 'ADMIN' && tenantId) {
            isPrimary = true;
            // Buscar si ya había un admin principal
            adminActual = await tx.usuario.findFirst({
                where: { tenantId: Number(tenantId), isPrimary: true }
            });

            // Quitar el rol principal a los demás
            if (adminActual) {
                await tx.usuario.updateMany({
                    where: { tenantId: Number(tenantId), isPrimary: true },
                    data: { isPrimary: false }
                });
            }
        }

        const nuevoUsuario = await tx.usuario.create({
            data: {
                tenantId: tenantId ? Number(tenantId) : null,
                nombre,
                email,
                passwordHash,
                rol: rol,
                estado: 'ACTIVO',
                isPrimary
            },
            select: { id: true, nombre: true, email: true, rol: true, tenantId: true }
        });

        // Registrar en historial si es un nuevo admin principal
        if (isPrimary && tenantId) {
            const nota = adminActual 
                ? `Cambio de administrador principal: ${adminActual.nombre} -> ${nuevoUsuario.nombre}`
                : `Primer administrador principal registrado: ${nuevoUsuario.nombre}`;

            await tx.historialTenant.create({
                data: {
                    tenantId: Number(tenantId),
                    tipo: "CAMBIO_ADMIN",
                    nota
                }
            });
        }

        // Retornamos el usuario junto con la clave genérica
        return { ...nuevoUsuario, tempPassword: DEFAULT_TEMP_PASSWORD };
    });
};

export const actualizarUsuario = async (id: number, data: any) => {
    const { tenantId, nombre, email, rol } = data;

    // Verificar si el email ya lo usa otro usuario
    const emailExistente = await prisma.usuario.findFirst({
        where: { email, NOT: { id } }
    });
    if (emailExistente) throw new Error('El correo electrónico ya está en uso por otro usuario.');

    return await prisma.usuario.update({
        where: { id },
        data: {
            tenantId: Number(tenantId),
            nombre,
            email,
            rol
        },
        select: { id: true, nombre: true, email: true, rol: true, estado: true, tenantId: true }
    });
};

export const cambiarEstadoUsuario = async (id: number, estado: "ACTIVO" | "INACTIVO") => {
    return await prisma.usuario.update({
        where: { id },
        data: { estado },
        select: { id: true, nombre: true, estado: true }
    });
};

export const resetearPasswordUsuario = async (id: number) => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_TEMP_PASSWORD, salt);

    await prisma.usuario.update({
        where: { id },
        data: { passwordHash }
    });

    return { message: "Contraseña reseteada", tempPassword: DEFAULT_TEMP_PASSWORD };
};

export const listarUsuarios = async (tenantId?: number) => {
    return await prisma.usuario.findMany({
        where: tenantId ? { tenantId } : {},
        select: { 
            id: true, 
            nombre: true, 
            email: true, 
            rol: true, 
            estado: true, 
            tenantId: true,
            createdAt: true 
        },
        orderBy: { createdAt: 'desc' }
    });
};