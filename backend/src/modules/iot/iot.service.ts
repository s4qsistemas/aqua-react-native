// c:\dev\aqua\backend\src\modules\iot\iot.service.ts

import { EventHubConsumerClient } from "@azure/event-hubs";
import { ingestTelemetry } from '../../functions/src/telemetry/telemetryIngestor';
import prisma from "../../lib/prisma";

// --- 1. PROCESADOR CENTRAL (POSTGRES + SOCKET.IO) ---

export const processIncomingHubMessages = async (messages: any[], io?: any) => {
    try {
        const readings = ingestTelemetry(messages);
        if (readings.length === 0) return;

        const tenantCodes = [...new Set(readings.map(r => r.tenant_id))];
        const tenants = await prisma.tenant.findMany({
            where: { nombre: { in: tenantCodes } },
            select: { id: true, nombre: true }
        });

        const tenantMap = new Map(tenants.map(t => [t.nombre, t.id]));

        // Guardamos en RegistroScada
        await prisma.registroScada.createMany({
            data: readings.map(r => {
                const tenantId = tenantMap.get(r.tenant_id);
                if (!tenantId) return null;
                return {
                    externalMessageId: r.id,
                    tenantId: tenantId,
                    tenantCode: r.tenant_id,
                    siteCode: r.site_id,
                    deviceCode: r.device_id,
                    sensorCode: r.sensor_id,
                    metric: r.metric,
                    unit: r.unit,
                    valueFloat: r.value,
                    capturedAt: new Date(r.captured_at),
                    rawPayload: r as any
                };
            }).filter(Boolean) as any[],
            skipDuplicates: true
        });

        // Ensamblamos un objeto por Tenant con la estructura que espera el frontend
        if (io) {
            const byTenant = new Map<number, any>();

            readings.forEach(r => {
                const tId = tenantMap.get(r.tenant_id);
                if (!tId) return;

                if (!byTenant.has(tId)) {
                    byTenant.set(tId, {
                        fechaLectura: r.captured_at,
                        nivelEstanquePorcentaje: 0,
                        volumenEstanqueLitros: 0,
                        bomba1Activa: false
                    });
                }

                const obj = byTenant.get(tId);
                if (r.metric === 'level')  obj.nivelEstanquePorcentaje  = r.value;
                if (r.metric === 'volume') obj.volumenEstanqueLitros     = r.value;
                if (r.metric === 'status') obj.bomba1Activa              = r.value === 1;
            });

            // Emitimos un solo objeto por Tenant con el nombre que reports.tsx ya escucha
            byTenant.forEach((payload, tId) => {
                io.to(`tenant_${tId}`).emit('actualizacion_sensores', payload);
            });
        }

        // Log detallado de cada registro insertado
        console.log(`\n🚀 [${new Date().toLocaleTimeString()}] ${readings.length} métricas procesadas:`);
        readings.forEach(r => {
            const tId = tenantMap.get(r.tenant_id);
            if (tId) {
                console.log(`  ✅ [${r.tenant_id}] sensor=${r.sensor_id} metric=${r.metric} value=${r.value} ${r.unit} @ ${r.captured_at}`);
            } else {
                console.warn(`  ⚠️  [${r.tenant_id}] Tenant no encontrado en DB — omitido`);
            }
        });

    } catch (error) {
        console.error("❌ Error en procesamiento IoT:", error);
    }
};

// --- 2. SIMULADOR MULTI-COMUNIDAD (CADA 60 SEG) ---

const comunidades = [
    { code: "APR_SAN_ISIDRO", nivel: 75, bomba: false, flow: 12.5 },
    { code: "APR_LOS_ROMEROS", nivel: 40, bomba: true, flow: 45.2 },
    { code: "APR_VALLE_HERMOSO", nivel: 15, bomba: true, flow: 50.0 }
];

const iniciarSimuladorIoT = (io: any) => {
    console.log("🤖 MODO SIMULACIÓN: Generando datos realistas para 3 comunidades...");

    setInterval(async () => {
        const batch: any[] = [];

        comunidades.forEach(c => {
            // Lógica de simulación física
            if (c.bomba) c.nivel += 1.5; else c.nivel -= 0.5;
            if (c.nivel >= 95) c.bomba = false;
            if (c.nivel <= 15) c.bomba = true;

            const ts = Date.now();
            const common = { tenant_id: c.code, site_id: "Sede_Principal", device_id: "GW-MOCK-01", timestamp: new Date(ts).toISOString() };
            const volumenCalculado = (c.nivel / 100) * 500000;

            batch.push(
                { ...common, id: `mock-${c.code}-TNK_01-${ts}`, sensor_id: "TNK_01", metric: "level",  unit: "%",     value: parseFloat(c.nivel.toFixed(2)) },
                { ...common, id: `mock-${c.code}-VOL_01-${ts}`, sensor_id: "VOL_01", metric: "volume", unit: "L",     value: Math.floor(volumenCalculado) },
                { ...common, id: `mock-${c.code}-FLW_01-${ts}`, sensor_id: "FLW_01", metric: "flow",   unit: "m3/h",  value: c.bomba ? c.flow : 0 },
                { ...common, id: `mock-${c.code}-PMP_01-${ts}`, sensor_id: "PMP_01", metric: "status", unit: "bool",  value: c.bomba ? 1 : 0 }
            );

        });

        await processIncomingHubMessages(batch, io);
    }, 60000); // 60 segundos
};

// --- 3. CONECTOR AZURE (PRODUCCIÓN) ---

const iniciarAzureIoT = (io: any) => {
    const connectionString = process.env.IOT_HUB_EVENT_HUB_CONNECTION_STRING;
    if (!connectionString) return console.error("❌ Error: Falta IOT_HUB_EVENT_HUB_CONNECTION_STRING");

    const consumerClient = new EventHubConsumerClient("$Default", connectionString);
    console.log("📡 MODO PRODUCCIÓN: Conectado a Azure IoT Hub...");

    consumerClient.subscribe({
        processEvents: async (events) => {
            const messages = events.map(e => e.body);
            await processIncomingHubMessages(messages, io);
        },
        processError: async (err) => console.error("❌ Error EventHub:", err)
    });
};

// --- 4. DIRECTOR DE SERVICIO ---

export const iniciarServicioIoT = (io: any) => {
    const mode = process.env.USE_MOCK_IOT;

    switch (mode) {
        case "true":
            iniciarSimuladorIoT(io);
            break;
        case "false":
            iniciarAzureIoT(io);
            break;
        default:
            console.log("⏸️ MODO PAUSA: El backend no está recibiendo métricas (USE_MOCK_IOT='null').");
    }
};
