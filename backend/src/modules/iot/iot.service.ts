import { EventHubConsumerClient } from "@azure/event-hubs";
import prisma from "../../lib/prisma";
type UuidV4Generator = (...args: any[]) => string;

let uuidv4: UuidV4Generator | null = null;
const loadUuid = async () => {
    if (!uuidv4) {
        const uuidModule = await import("uuid");
        uuidv4 = uuidModule.v4;
    }
    return uuidv4!;
};

// --- 1. NORMALIZADOR DE DATOS (Frontend-compatible) ---

const normalizarRegistroParaFrontend = (registros: any[]): any => {
    // Consolidar múltiples registros en un solo objeto
    const consolidated: any = {
        timestamp: new Date().toISOString(),
    };

    // console.log(`🔄 Normalizando ${registros.length} registros...`);

    registros.forEach((registro, idx) => {
        // console.log(`  [${idx}] metric=${registro.metric}, value=${registro.valueFloat}`);
        
        consolidated.tenantId = registro.tenantId || 1;
        consolidated.tenantCode = registro.tenantCode;
        consolidated.sensorCode = registro.sensorCode;
        consolidated.capturedAt = registro.capturedAt || new Date().toISOString();
        consolidated.fechaLectura = registro.capturedAt || new Date().toISOString();

        // Mapear métricas al formato que el frontend espera
        if (registro.metric === 'level') {
            consolidated.nivelEstanquePorcentaje = registro.valueFloat;
            // console.log(`    ✓ nivelEstanquePorcentaje = ${registro.valueFloat}`);
        } else if (registro.metric === 'volume') {
            consolidated.volumenEstanqueLitros = registro.valueFloat;
            // console.log(`    ✓ volumenEstanqueLitros = ${registro.valueFloat}`);
        } else if (registro.metric === 'flow') {
            consolidated.caudalLps = registro.valueFloat;
            consolidated.flujo = registro.valueFloat;
            // console.log(`    ✓ flujo = ${registro.valueFloat}`);
        } else if (registro.metric === 'status') {
            consolidated.bomba1Activa = registro.valueFloat === 1;
            // console.log(`    ✓ bomba1Activa = ${registro.valueFloat === 1}`);
        }
    });

    // console.log(`📊 Objeto consolidado:`, consolidated);
    return consolidated;
};

// --- 2. PROCESADOR CENTRAL (POSTGRES + SOCKET.IO) ---

export const processIncomingHubMessages = async (messages: any[], io?: any) => {
    try {
        if (!messages || messages.length === 0) {
            // console.log("⚠️  No hay mensajes para procesar");
            return;
        }

        console.log(`\n🚀 [${new Date().toLocaleTimeString()}] Procesando ${messages.length} métricas...`);
        // console.log(`📥 Socket.io disponible: ${io ? 'SÍ' : 'NO'}`);

        const uuidv4Func = await loadUuid();
        
        // Agrupar por tenantId para consolidar registros
        const registrosPorTenant: { [key: number]: any[] } = {};

        // Procesamos los mensajes en paralelo para escalar a miles de eventos por segundo
        const promesas = messages.map(async (payload) => {
            try {
                // 1. Extraer los datos.
                const messageId = payload.id || payload.messageId || `azure-auto-${uuidv4Func()}`;

                const {
                    tenantCode, siteCode, stationCode, deviceCode, sensorCode,
                    metric, value, unit, capturedAt
                } = payload;

                // Convertir valor a número PRIMERO
                const valorNumerico = typeof value === 'number' ? value : parseFloat(value);

                // 2. Buscar las relaciones reales en la DB
                const sensor = await prisma.sensorScada.findFirst({
                    where: {
                        codigo: sensorCode,
                        dispositivo: { codigo: deviceCode },
                        tenant: { nombre: tenantCode }
                    },
                    include: {
                        dispositivo: true,
                        estacion: true,
                        recinto: true,
                        tenant: true
                    }
                });

                // Si no existe el sensor, emitir igual para testing (sin guardar en BD)
                if (!sensor) {
                    console.warn(` ⚠️  [${tenantCode}] Sensor no encontrado: ${sensorCode}. Emitiendo sin persistencia...`);
                    
                    // Crear objeto temporal solo para emitir
                    const tempRegistro: any = {
                        tenantCode,
                        sensorCode,
                        metric,
                        valueFloat: valorNumerico,
                        capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
                        messageType: "telemetry"
                    };
                    
                    // Extraer tenantId del mock si es posible
                    // Fallback: usar un tenantId genérico para simulación
                    const tempTenantId = 1; // Para desarrollo local
                    
                    if (!registrosPorTenant[tempTenantId]) {
                        registrosPorTenant[tempTenantId] = [];
                    }
                    registrosPorTenant[tempTenantId].push(tempRegistro);
                    
                    // const fuente = messageId.startsWith('mock-') ? '🤖 Sim' : '☁️ Azure';
                    // console.log(` ✅ [${fuente}] [${tenantCode}] ${sensorCode} (${metric}): ${valorNumerico} ${unit || ''} [SIN_BD]`);
                    return;
                }

                const fechaCaptura = capturedAt ? new Date(capturedAt) : new Date();

                // 3. Guardar el historial en RegistroScada
                const nuevoRegistro = await prisma.registroScada.create({
                    data: {
                        externalMessageId: messageId,
                        tenantId: sensor.tenant.id,
                        recintoId: sensor.recinto.id,
                        estacionId: sensor.estacion.id,
                        dispositivoId: sensor.dispositivo.id,
                        sensorId: sensor.id,
                        tenantCode,
                        siteCode,
                        stationCode: stationCode || sensor.estacion.codigo,
                        deviceCode,
                        sensorCode,
                        metric,
                        valueFloat: valorNumerico,
                        unit: unit || sensor.unit,
                        capturedAt: fechaCaptura,
                        rawPayload: payload
                    }
                });

                // 4. Actualizar la tabla de Estado Actual
                await prisma.estadoActualScada.upsert({
                    where: {
                        sensorId_metric: { sensorId: sensor.id, metric: metric }
                    },
                    update: {
                        valueFloat: valorNumerico,
                        updatedAt: new Date(),
                        capturedAt: fechaCaptura
                    },
                    create: {
                        tenantId: sensor.tenant.id,
                        recintoId: sensor.recinto.id,
                        estacionId: sensor.estacion.id,
                        dispositivoId: sensor.dispositivo.id,
                        sensorId: sensor.id,
                        metric,
                        unit: unit || sensor.unit,
                        valueFloat: valorNumerico,
                        capturedAt: fechaCaptura,
                    }
                });

                // Agrupar para emitir después
                if (!registrosPorTenant[sensor.tenant.id]) {
                    registrosPorTenant[sensor.tenant.id] = [];
                }
                registrosPorTenant[sensor.tenant.id].push(nuevoRegistro);

                // const fuente = messageId.startsWith('mock-') ? '🤖 Sim' : '☁️ Azure';
                // console.log(` ✅ [${fuente}] [${tenantCode}] ${sensorCode} (${metric}): ${valorNumerico} ${unit || ''}`);

            } catch (err) {
                console.error(`❌ Error procesando mensaje individual: ${err}`);
                // Continuamos con el siguiente en lugar de bloquear todo
            }
        });

        // Esperar a que todos se procesen
        await Promise.all(promesas);

        // 5. Emitir registros consolidados por tenant
        if (io) {
            const tenantIds = Object.keys(registrosPorTenant);
            if (tenantIds.length > 0) {
                tenantIds.forEach((tenantId) => {
                    const registros = registrosPorTenant[tenantId as any];
                    const registroNormalizado = normalizarRegistroParaFrontend(registros);
                    const room = `tenant_${tenantId}`;
                    console.log(`🚀 EMITIENDO a sala "${room}": ${registros.length} registros consolidados`);
                    // console.log(`📦 Payload:`, registroNormalizado);
                    io.to(room).emit('actualizacion_sensores', registroNormalizado);
                });
            } else {
                // console.log("⚠️  No hay registros para emitir en este batch");
            }
        } else {
            console.warn("⚠️  Socket.io no está disponible");
        }

    } catch (error) {
        console.error("❌ Error en procesamiento IoT:", error);
    }
};

// --- 2. SIMULADOR MULTI-COMUNIDAD (CADA 60 SEG) ---

// Se agregan los códigos relacionales obligatorios para probar la jerarquía
const comunidades = [
    { code: "APR_SAN_ISIDRO", site: "Sede_Principal", station: "EST_01", device: "GW-MOCK-01", nivel: 75, bomba: false, flow: 12.5 },
    { code: "APR_LOS_ROMEROS", site: "Sede_Principal", station: "EST_01", device: "GW-MOCK-01", nivel: 40, bomba: true, flow: 45.2 },
    { code: "APR_VALLE_HERMOSO", site: "Sede_Principal", station: "EST_01", device: "GW-MOCK-01", nivel: 15, bomba: true, flow: 50.0 }
];

const iniciarSimuladorIoT = (io: any) => {
    console.log("🤖 MODO SIMULACIÓN: Generando datos realistas (Formato v4.1)...");
    console.log("📤 Emitiendo cada 5 segundos para testing rápido...");

    let iteracion = 0;

    setInterval(async () => {
        iteracion++;
        // console.log(`\n[${'='.repeat(60)}]`);
        // console.log(`⏰ CICLO ${iteracion} - ${new Date().toLocaleTimeString()}`);
        // console.log(`[${'='.repeat(60)}]`);

        const batch: any[] = [];

        comunidades.forEach(c => {
            // Lógica de simulación física
            if (c.bomba) c.nivel += 1.5; else c.nivel -= 0.5;
            if (c.nivel >= 95) c.bomba = false;
            if (c.nivel <= 15) c.bomba = true;

            const now = new Date();
            const tsString = now.toISOString();
            const tsMillis = now.getTime();

            const common = {
                messageType: "telemetry",
                tenantCode: c.code,
                siteCode: c.site,
                stationCode: c.station,
                deviceCode: c.device,
                capturedAt: tsString
            };

            const volumenCalculado = (c.nivel / 100) * 500000;

            // Generamos registros desglosados (1 por métrica)
            batch.push(
                { ...common, id: `mock-${c.code}-TNK_01-${tsMillis}`, sensorCode: "TNK_01", metric: "level",  unit: "%",    value: parseFloat(c.nivel.toFixed(2)) },
                { ...common, id: `mock-${c.code}-VOL_01-${tsMillis}`, sensorCode: "VOL_01", metric: "volume", unit: "L",    value: Math.floor(volumenCalculado) },
                { ...common, id: `mock-${c.code}-FLW_01-${tsMillis}`, sensorCode: "FLW_01", metric: "flow",   unit: "m³/h", value: c.bomba ? c.flow : 0 },
                { ...common, id: `mock-${c.code}-PMP_01-${tsMillis}`, sensorCode: "PMP_01", metric: "status", unit: "bool", value: c.bomba ? 1 : 0 }
            );
        });

        // console.log(`📨 Batch de ${batch.length} eventos creado`);
        // batch.forEach((evt, i) => {
        //     console.log(`  [${i}] ${evt.tenantCode} - ${evt.sensorCode} (${evt.metric}): ${evt.value}`);
        // });

        // console.log(`🔄 Enviando al procesador...`);
        await processIncomingHubMessages(batch, io);
        // console.log(`✅ Ciclo completado\n`);
    }, 5000); // 5 segundos en lugar de 60
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