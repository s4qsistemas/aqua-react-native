import prisma from "../../lib/prisma";
import { Estado } from "@prisma/client";

export async function listarTenantsService() {
    return prisma.tenant.findMany({
        include: { 
            plan: true,
            usuarios: {
                where: { rol: 'ADMIN' },
                orderBy: [
                    { isPrimary: 'desc' },
                    { createdAt: 'asc' }
                ]
            }
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function crearTenantService(nombre: string, planId: number) {
    return prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
            data: {
                nombre,
                estado: Estado.ACTIVO,
                planId: Number(planId),
            },
        });

        // Historial de activación inicial
        await tx.historialTenant.create({
            data: {
                tenantId: tenant.id,
                tipo: "ACTIVACION",
                estadoAntes: null,
                estadoNuevo: Estado.ACTIVO,
                nota: "Alta inicial de comunidad",
            },
        });

        // Historial de plan inicial
        await tx.historialTenant.create({
            data: {
                tenantId: tenant.id,
                tipo: "CAMBIO_PLAN",
                planAntesId: null,
                planNuevoId: Number(planId),
                nota: "Asignación de plan inicial",
            },
        });

        return tenant;
    });
}

export async function obtenerTenantService(id: number) {
    return prisma.tenant.findUnique({
        where: { id },
    });
}

export async function actualizarTenantService(id: number, nombre: string, planId?: number, adminId?: number | string, nota: string = "Actualización de datos") {
    return prisma.$transaction(async (tx) => {
        // 1. Obtener estado actual del tenant y admin actual
        const actual = await tx.tenant.findUnique({ 
            where: { id },
            include: { 
                usuarios: { where: { isPrimary: true } }
            }
        });
        if (!actual) throw new Error("Comunidad no encontrada");

        const adminActual = actual.usuarios[0];

        // 2. Actualizar el tenant
        const updated = await tx.tenant.update({
            where: { id },
            data: {
                nombre,
                planId: planId ? Number(planId) : undefined,
            },
        });

        // 3. Si el plan cambió, registrar en historial
        if (planId && Number(planId) !== actual.planId) {
            await tx.historialTenant.create({
                data: {
                    tenantId: id,
                    tipo: "CAMBIO_PLAN",
                    planAntesId: actual.planId,
                    planNuevoId: Number(planId),
                    nota: nota || "Cambio de plan desde edición general",
                },
            });
        }

        // 4. Gestionar administrador principal si cambió
        if (adminId && Number(adminId) !== adminActual?.id) {
            // Obtener el nuevo admin para la nota
            const nuevoAdmin = await tx.usuario.findUnique({ where: { id: Number(adminId) } });

            await tx.usuario.updateMany({
                where: { tenantId: id },
                data: { isPrimary: false },
            });

            await tx.usuario.update({
                where: { id: Number(adminId) },
                data: { isPrimary: true },
            });

            await tx.historialTenant.create({
                data: {
                    tenantId: id,
                    tipo: "CAMBIO_ADMIN",
                    nota: `Cambio de administrador: ${adminActual?.nombre || "Ninguno"} -> ${nuevoAdmin?.nombre || "Desconocido"}`,
                },
            });
        }

        return updated;
    });
}

// NUEVO: Transacción segura para cambio de estado + auditoría
export async function cambiarEstadoTenantService(id: number, estado: Estado, nota: string, tenantActual: any) {
    return prisma.$transaction(async (tx) => {
        const updated = await tx.tenant.update({
            where: { id },
            data: { estado },
        });

        await tx.historialTenant.create({
            data: {
                tenantId: id,
                tipo: estado === "ACTIVO" ? "ACTIVACION" : "DESACTIVACION",
                estadoAntes: tenantActual.estado,
                estadoNuevo: estado,
                nota,
            },
        });

        return updated;
    });
}

// NUEVO: Transacción segura para cambio de plan + auditoría
export async function cambiarPlanTenantService(id: number, planId: number | null, nota: string, tenantActual: any) {
    return prisma.$transaction(async (tx) => {
        const updated = await tx.tenant.update({
            where: { id },
            data: { planId },
        });

        await tx.historialTenant.create({
            data: {
                tenantId: id,
                tipo: "CAMBIO_PLAN",
                planAntesId: tenantActual.planId,
                planNuevoId: planId,
                nota,
            },
        });

        return updated;
    });
}