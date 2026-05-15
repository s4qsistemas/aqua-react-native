import { EventHubConsumerClient } from "@azure/event-hubs";
import prisma from "../../lib/prisma";

// ============================================================================
// 1. EL NÚCLEO (CORE) - Guarda en la base de datos columna por columna
// ============================================================================
const procesarDatoTelemetria = async (datosDelSensor: any, io: any) => {
    if (datosDelSensor.messageType !== "telemetry") return;

    try {
        // Buscamos el Tenant por su código (ej. APR_SAN_ISIDRO)
        const tenantExiste = await prisma.tenant.findUnique({
            where: { nombre: datosDelSensor.tenantCode }
        });

        if (!tenantExiste) {
            console.warn(`⚠️ Omitiendo: Tenant '${datosDelSensor.tenantCode}' no existe en BD.`);
            return;
        }

        // Guardamos todo mapeado a sus columnas individuales
        const nuevoRegistro = await prisma.telemetria.create({
            data: {
                tenantId: tenantExiste.id,
                siteCode: datosDelSensor.siteCode,
                gatewayCode: datosDelSensor.gatewayCode,
                plcCode: datosDelSensor.plcCode,
                secuencia: datosDelSensor.sequence,

                nivelEstanquePorcentaje: datosDelSensor.process.tankLevelPercent,
                nivelEstanqueMetros: datosDelSensor.process.tankLevelMeters,
                volumenEstanqueLitros: datosDelSensor.process.tankVolumeLiters,
                bomba1Activa: datosDelSensor.process.pump1Running,
                bomba2Activa: datosDelSensor.process.pump2Running,
                booster1Activo: datosDelSensor.process.booster1Running,
                booster2Activo: datosDelSensor.process.booster2Running,
                valvulaEntradaAbierta: datosDelSensor.process.inletValveOpen,
                valvulaSalidaAbierta: datosDelSensor.process.outletValveOpen,
                modoOperacion: datosDelSensor.process.mode,
                controlRemotoHabilitado: datosDelSensor.process.remoteControlEnabled,

                plcEnLinea: datosDelSensor.communications.plcOnline,
                nubeConectada: datosDelSensor.communications.cloudConnected,
                tipoWan: datosDelSensor.communications.wanType,
                latenciaMs: datosDelSensor.communications.latencyMs,

                fechaLectura: new Date(datosDelSensor.timestampUtc)
            }
        });

        // Emitimos al Frontend para que se muevan las animaciones en vivo
        io.to(`tenant_${tenantExiste.id}`).emit('actualizacion_sensores', nuevoRegistro);

    } catch (error) {
        console.error("❌ Error guardando telemetría en BD:", error);
    }
};

// ============================================================================
// 2. EL SIMULADOR COHERENTE PARA 3 COMUNIDADES
// ============================================================================
// Variables de estado para que el simulador tenga memoria y sea realista
const estadoComunidades = [
    { tenantCode: "APR_SAN_ISIDRO", nivel: 65, capMaxLitros: 500000, alturaMaxMetros: 5.0, llenando: true },
    { tenantCode: "APR_LOS_ROMEROS", nivel: 30, capMaxLitros: 250000, alturaMaxMetros: 3.5, llenando: false },
    { tenantCode: "APR_VALLE_HERMOSO", nivel: 85, capMaxLitros: 100000, alturaMaxMetros: 4.0, llenando: true }
];

let sequenceCounter = 1000;

const iniciarSimuladorIoT = (io: any) => {
    console.log("🤖 Simulador IoT Multi-Comunidad Iniciado. Generando datos realistas...");

    setInterval(() => {
        estadoComunidades.forEach(comunidad => {
            // LÓGICA FÍSICA: Si está llenando, el nivel sube un poco (ej. +1.5%). Si no, baja por el consumo de la gente (ej. -0.8%)
            if (comunidad.llenando) {
                comunidad.nivel += (Math.random() * 1.5 + 0.5);
            } else {
                comunidad.nivel -= (Math.random() * 1.0 + 0.2);
            }

            // LÍMITES: Que no pase de 100 ni baje de 0
            if (comunidad.nivel >= 98) comunidad.llenando = false; // Se llenó, apagamos la bomba
            if (comunidad.nivel <= 20) comunidad.llenando = true;  // Nivel crítico, encendemos la bomba

            // CALCULO MATEMÁTICO REALISTA BASADO EN EL PORCENTAJE
            const currentMeters = (comunidad.nivel / 100) * comunidad.alturaMaxMetros;
            const currentLiters = (comunidad.nivel / 100) * comunidad.capMaxLitros;

            // ARMADO DEL JSON EXACTO QUE ESPERAS
            const payloadSimulado = {
                messageType: "telemetry",
                tenantCode: comunidad.tenantCode,
                siteCode: "RECINTO_01",
                gatewayCode: `GW-${comunidad.tenantCode.split('_')[1]}`, // Ej: GW-SAN
                plcCode: "PLC-01",
                timestampUtc: new Date().toISOString(),
                sequence: sequenceCounter++,
                process: {
                    tankLevelPercent: parseFloat(comunidad.nivel.toFixed(2)),
                    tankLevelMeters: parseFloat(currentMeters.toFixed(2)),
                    tankVolumeLiters: Math.floor(currentLiters),
                    pump1Running: comunidad.llenando, // La bomba está activa si el estanque se está llenando
                    pump2Running: false,
                    booster1Running: true, // Asumimos que un presurizador está mandando agua al pueblo siempre
                    booster2Running: false,
                    inletValveOpen: comunidad.llenando,
                    outletValveOpen: true,
                    mode: "AUTO",
                    remoteControlEnabled: true
                },
                communications: {
                    plcOnline: true,
                    cloudConnected: true,
                    wanType: "STARLINK",
                    latencyMs: Math.floor(Math.random() * (120 - 40 + 1) + 40) // Latencia fluctuando entre 40 y 120ms
                }
            };

            // Enviar al core para guardar
            procesarDatoTelemetria(payloadSimulado, io);
        });

    }, 5000); // Genera datos cada 5 segundos
};

// ============================================================================
// 3. EL DIRECTOR (INICIA EL MODO CORRECTO SEGÚN .ENV)
// ============================================================================
export const iniciarServicioIoT = (io: any) => {
    const mockMode = process.env.USE_MOCK_IOT;

    if (mockMode === 'null') {
        console.log("⏸️ Modo IoT en 'null'. Sistema pausado.");
        return;
    }

    if (mockMode === 'true') {
        iniciarSimuladorIoT(io);
        return;
    }

    // LÓGICA DE PRODUCCIÓN AZURE (Oculta por simplicidad en esta respuesta, pero es la misma que ya tenías)
};