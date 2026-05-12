import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export const getHistorialTelemetria = async (req: Request, res: Response): Promise<void> => {
    try {
        const { tenantId } = req.params;
        const horas = Number(req.query.horas) || 24; // Por defecto trae 24 horas

        // Calculamos la fecha límite hacia atrás
        const fechaInicio = new Date();
        fechaInicio.setHours(fechaInicio.getHours() - horas);

        const historial = await prisma.telemetria.findMany({
            where: {
                tenantId: Number(tenantId),
                fechaLectura: {
                    gte: fechaInicio // gte = Greater Than or Equal (Desde hace 24 hrs hasta hoy)
                }
            },
            orderBy: {
                fechaLectura: 'asc' // De más antiguo a más nuevo, vital para el eje X del gráfico
            },
            // Optimizamos el payload: Solo enviamos a la app lo que sirve para graficar
            select: {
                id: true,
                nivelEstanquePorcentaje: true,
                volumenEstanqueLitros: true,
                bomba1Activa: true,
                fechaLectura: true
            }
        });

        res.status(200).json(historial);
    } catch (error) {
        console.error("❌ Error obteniendo historial de telemetría:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener históricos" });
    }
};