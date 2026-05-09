import { Request, Response } from "express";
import {
    crearTenantService,
    listarTenantsService,
    obtenerTenantService,
    actualizarTenantService,
    cambiarEstadoTenantService,
    cambiarPlanTenantService
} from "./tenant.service";
import prisma from "../../lib/prisma";
import { io } from "../../server";


export async function listarTenants(req: Request, res: Response) {
    try {
        const tenants = await listarTenantsService();
        res.json(tenants);
    } catch (error) {
        res.status(500).json({ message: "Error al listar comunidades" });
    }
}

export async function crearTenant(req: Request, res: Response) {
    try {
        const { nombre, planId } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: "El nombre es obligatorio" });
        }

        if (!planId) {
            return res.status(400).json({ message: "El plan es obligatorio" });
        }

        const tenant = await crearTenantService(nombre, planId);
        
        // Notificar a los clientes vía WebSocket
        io.emit('comunidades_actualizadas');
        
        res.status(201).json(tenant);
    } catch (error) {
        res.status(500).json({ message: "Error al crear la comunidad" });
    }
}

export async function obtenerTenant(req: Request, res: Response) {
    try {
        const tenant = await obtenerTenantService(Number(req.params.id));

        if (!tenant) {
            return res.status(404).json({ message: "Comunidad no encontrada" });
        }

        res.json(tenant);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener la comunidad" });
    }
}

export async function actualizarTenant(req: Request, res: Response) {
    try {
        const { nombre, planId, adminId, nota } = req.body;
        const tenant = await actualizarTenantService(Number(req.params.id), nombre, planId, adminId, nota);
        
        // Notificar a los clientes vía WebSocket
        io.emit('comunidades_actualizadas');
        
        res.json(tenant);
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar la comunidad" });
    }
}

export async function cambiarEstadoTenant(req: Request, res: Response) {
    try {
        const { estado, nota } = req.body;
        const id = Number(req.params.id);

        if (!nota) {
            return res.status(400).json({ message: "La nota es obligatoria" });
        }

        const tenant = await obtenerTenantService(id);
        if (!tenant) {
            return res.status(404).json({ message: "Comunidad no encontrada" });
        }

        const updated = await cambiarEstadoTenantService(id, estado, nota, tenant);

        // Notificar a los clientes vía WebSocket
        io.emit('comunidades_actualizadas');
        io.emit("tenant_estado_actualizado", { id, estado });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error al cambiar el estado" });
    }
}

export async function cambiarPlanTenant(req: Request, res: Response) {
    try {
        const { planId, nota } = req.body;
        const id = Number(req.params.id);

        if (!nota) {
            return res.status(400).json({ message: "La nota es obligatoria" });
        }

        const tenant = await obtenerTenantService(id);
        if (!tenant) {
            return res.status(404).json({ message: "Comunidad no encontrada" });
        }

        const updated = await cambiarPlanTenantService(id, planId, nota, tenant);
        
        // Notificar a los clientes vía WebSocket
        io.emit('comunidades_actualizadas');
        
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error al cambiar el plan" });
    }
}

export async function getHistorial(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const data = await prisma.historialTenant.findMany({
            where: { tenantId: id },
            include: {
                planAntes: true,
                planNuevo: true,
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el historial" });
    }
}

export async function listarPlanes(req: Request, res: Response) {
    try {
        const planes = await prisma.plan.findMany({
            where: { estado: "ACTIVO" }
        });
        res.json(planes);
    } catch (error) {
        res.status(500).json({ message: "Error al listar los planes" });
    }
}