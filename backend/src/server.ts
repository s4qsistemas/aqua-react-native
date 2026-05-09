import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { iniciarEscuchaIoT } from './modules/iot/iot.service';
// 1. Crear el servidor HTTP envolviendo la aplicación Express ya configurada
const httpServer = createServer(app);

// 2. Inicializar y exportar Socket.io
export const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
});

// 3. Manejar conexiones
io.on("connection", (socket) => {
    console.log(`🔌 Nuevo cliente conectado: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;

// 4. Iniciar el servidor e IoT listener
httpServer.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    iniciarEscuchaIoT(io);
});