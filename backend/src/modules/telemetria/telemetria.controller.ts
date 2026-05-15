// c:\dev\aqua\backend\src\modules\telemetria\telemetria.controller.ts

import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const getHistorialTelemetria = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tenantId } = req.params;
        const horas = Number(req.query.horas) || 24;

        const fechaInicio = new Date();
        fechaInicio.setHours(fechaInicio.getHours() - horas);

        // 1. Traemos todos los registros del periodo sin filtrar por una sola métrica
        const registros = await prisma.registroScada.findMany({
            where: {
                tenantId: Number(tenantId),
                capturedAt: { gte: fechaInicio }
            },
            orderBy: { capturedAt: 'asc' }
        });

        // 2. Agrupamos por estampa de tiempo para reconstruir el objeto que la App espera
        const historialMap: Record<string, any> = {};

        registros.forEach(reg => {
            const timestamp = reg.capturedAt.toISOString();

            if (!historialMap[timestamp]) {
                historialMap[timestamp] = {
                    id: reg.id,
                    fechaLectura: reg.capturedAt,
                    nivelEstanquePorcentaje: 0,
                    volumenEstanqueLitros: 0,
                    bomba1Activa: false
                };
            }

            // Mapeamos cada métrica a su campo correspondiente en la App
            if (reg.metric === 'level') historialMap[timestamp].nivelEstanquePorcentaje = reg.valueFloat;
            if (reg.metric === 'volume') historialMap[timestamp].volumenEstanqueLitros = reg.valueFloat;
            if (reg.metric === 'status') historialMap[timestamp].bomba1Activa = reg.valueFloat === 1;
        });

        // Convertimos el mapa de nuevo a un array para la respuesta
        res.status(200).json(Object.values(historialMap));
    } catch (error) {
        console.error("❌ Error obteniendo historial de telemetría:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
