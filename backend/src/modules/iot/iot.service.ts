import { EventHubConsumerClient } from "@azure/event-hubs";
import prisma from "../../lib/prisma";

// ----------------------------------------------------------------------
// 1. EL NÚCLEO (CORE) - Esta lógica la usarán tanto Azure como el Simulador
// ----------------------------------------------------------------------
const procesarDatoTelemetria = async (datosDelSensor: any, io: any) => {
    console.log("Llegó un nuevo dato:", datosDelSensor);

    try {
        // Verificar si el tenant existe antes de guardar
        const tenantExiste = await prisma.tenant.findUnique({
            where: { id: Number(datosDelSensor.tenantId) }
        });

        if (!tenantExiste) {
            console.warn(`⚠️ Datos recibidos para Tenant ID ${datosDelSensor.tenantId} que no existe.`);
            return;
        }

        const nuevoRegistro = await prisma.telemetria.create({
            data: {
                tenantId: Number(datosDelSensor.tenantId),
                nivelEstanque: Number(datosDelSensor.nivel),
                bombaActiva: Boolean(datosDelSensor.bomba_activa),
                fechaLectura: new Date()
            }
        });

        // Disparamos la actualización al celular del cliente por Socket.io
        io.to(`tenant_${datosDelSensor.tenantId}`).emit('actualizacion_sensores', nuevoRegistro);

    } catch (error) {
        console.error("Error guardando en BD:", error);
    }
};

// ----------------------------------------------------------------------
// 2. EL SIMULADOR LOCAL - Inyecta datos falsos cada X segundos
// ----------------------------------------------------------------------
const iniciarSimuladorIoT = (io: any) => {
    console.log("🧪 Iniciando SIMULADOR LOCAL de IoT (Sin Azure)...");

    // Ejecutamos esta función cada 5 segundos (5000 milisegundos)
    setInterval(() => {
        // Inventamos un dato falso
        const datoFalso = {
            tenantId: 1, // IMPORTANTE: Asegúrate de tener una comunidad con ID 1 en tu base de datos
            nivel: Math.floor(Math.random() * 100), // Nivel aleatorio entre 0 y 100
            bomba_activa: Math.random() > 0.5 // true o false aleatorio
        };

        // Se lo pasamos a nuestra función central
        procesarDatoTelemetria(datoFalso, io);

    }, 5000);
};


// ----------------------------------------------------------------------
// 3. EL DIRECTOR - Decide si usar Azure, el Simulador o Apagar
// ----------------------------------------------------------------------
export const iniciarEscuchaIoT = (io: any) => {

    // Leemos el valor exacto de la variable de entorno
    const mockMode = process.env.USE_MOCK_IOT;

    // ESTADO 1: "null" -> Sistema IoT apagado (Ni nube, ni simulador)
    if (mockMode === 'null') {
        console.log("⏸️ Servicio IoT en modo 'null'. Sistema pausado, no se enviarán ni recibirán datos.");
        return; // Detenemos la ejecución aquí
    }

    // ESTADO 2: "true" -> Encendemos el robot simulador local
    if (mockMode === 'true') {
        iniciarSimuladorIoT(io);
        return; // Detenemos la ejecución aquí
    }

    // ESTADO 3: "false" (o cualquier otra cosa) -> LÓGICA DE AZURE EN PRODUCCIÓN
    const connectionString = process.env.IOT_HUB_EVENT_HUB_CONNECTION_STRING || "";

    // Validación de seguridad para que no explote si la clave es de ejemplo
    if (!connectionString || connectionString.includes("tuhub")) {
        console.error("❌ ERROR: Intentaste usar Azure, pero la credencial en .env es falsa o está vacía.");
        console.warn("💡 Sugerencia: Cambia USE_MOCK_IOT='true' en tu .env para simular, o 'null' para apagarlo.");
        return;
    }

    const consumerClient = new EventHubConsumerClient(
        "$Default",
        connectionString
    );

    console.log("📡 Backend conectado a Azure IoT Hub. Esperando telemetría...");

    consumerClient.subscribe({
        processEvents: async (events, context) => {
            for (const event of events) {
                // Azure le pasa los datos reales a nuestro núcleo
                await procesarDatoTelemetria(event.body, io);
            }
        },
        processError: async (err, context) => {
            console.error(`Error en la conexión con IoT Hub: ${err.message}`);
        }
    });
};