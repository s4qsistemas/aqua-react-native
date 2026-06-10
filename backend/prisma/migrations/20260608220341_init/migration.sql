-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'ADMIN', 'SUPERVISOR', 'TECNICO');

-- CreateEnum
CREATE TYPE "TipoEstacion" AS ENUM ('POZO', 'PLANTA', 'ESTANQUE', 'SALA_BOMBAS');

-- CreateEnum
CREATE TYPE "TipoDispositivo" AS ENUM ('GATEWAY', 'PLC', 'SENSOR');

-- CreateEnum
CREATE TYPE "EstadoDispositivo" AS ENUM ('CONECTADO', 'DESCONECTADO', 'ERROR');

-- CreateEnum
CREATE TYPE "SeveridadAlarma" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoAlarma" AS ENUM ('ACTIVA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "TipoComando" AS ENUM ('START_BOMBA', 'STOP_BOMBA', 'RESET_ALARMA');

-- CreateEnum
CREATE TYPE "EstadoComando" AS ENUM ('PENDIENTE', 'ENVIADO', 'EJECUTADO', 'ERROR');

-- CreateEnum
CREATE TYPE "Plataforma" AS ENUM ('ANDROID');

-- CreateEnum
CREATE TYPE "TipoPlan" AS ENUM ('BASICO', 'PROFESIONAL', 'EMPRESARIAL');

-- CreateEnum
CREATE TYPE "TipoHistorialTenant" AS ENUM ('ACTIVACION', 'DESACTIVACION', 'CAMBIO_PLAN', 'CAMBIO_ADMIN');

-- CreateEnum
CREATE TYPE "TipoSensorScada" AS ENUM ('NIVEL', 'CAUDAL', 'PRESION', 'CLORO', 'TURBIDEZ', 'ENERGIA', 'ESTADO', 'ALARMA', 'OTRO');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER,
    "nombre" TEXT NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recinto" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "descripcion" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recinto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estacion" (
    "id" SERIAL NOT NULL,
    "recintoId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEstacion" NOT NULL,
    "descripcion" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispositivo" (
    "id" SERIAL NOT NULL,
    "estacionId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "azureDeviceId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoDispositivo" NOT NULL,
    "estado" "EstadoDispositivo" NOT NULL DEFAULT 'DESCONECTADO',
    "ultimaConexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorScada" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "recintoId" INTEGER NOT NULL,
    "estacionId" INTEGER NOT NULL,
    "dispositivoId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoSensorScada" NOT NULL DEFAULT 'OTRO',
    "metric" TEXT NOT NULL,
    "unit" TEXT,
    "descripcion" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "warningMin" DOUBLE PRECISION,
    "warningMax" DOUBLE PRECISION,
    "criticalMin" DOUBLE PRECISION,
    "criticalMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensorScada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroScada" (
    "id" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "tenantId" INTEGER NOT NULL,
    "recintoId" INTEGER,
    "estacionId" INTEGER,
    "dispositivoId" INTEGER,
    "sensorId" INTEGER,
    "messageType" TEXT NOT NULL DEFAULT 'telemetry',
    "tenantCode" TEXT NOT NULL,
    "siteCode" TEXT,
    "stationCode" TEXT,
    "deviceCode" TEXT,
    "gatewayCode" TEXT,
    "plcCode" TEXT,
    "sensorCode" TEXT,
    "metric" TEXT NOT NULL,
    "unit" TEXT,
    "valueFloat" DOUBLE PRECISION,
    "valueInt" INTEGER,
    "valueBoolean" BOOLEAN,
    "valueText" TEXT,
    "valueJson" JSONB,
    "quality" TEXT,
    "status" TEXT,
    "sequence" BIGINT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB NOT NULL,

    CONSTRAINT "RegistroScada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoActualScada" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "recintoId" INTEGER NOT NULL,
    "estacionId" INTEGER NOT NULL,
    "dispositivoId" INTEGER NOT NULL,
    "sensorId" INTEGER NOT NULL,
    "metric" TEXT NOT NULL,
    "unit" TEXT,
    "valueFloat" DOUBLE PRECISION,
    "valueInt" INTEGER,
    "valueBoolean" BOOLEAN,
    "valueText" TEXT,
    "valueJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "quality" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,

    CONSTRAINT "EstadoActualScada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alarma" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "recintoId" INTEGER,
    "estacionId" INTEGER NOT NULL,
    "dispositivoId" INTEGER,
    "sensorId" INTEGER,
    "registroId" TEXT,
    "tipo" TEXT NOT NULL,
    "severidad" "SeveridadAlarma" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoAlarma" NOT NULL DEFAULT 'ACTIVA',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),

    CONSTRAINT "Alarma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comando" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "recintoId" INTEGER,
    "estacionId" INTEGER,
    "dispositivoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoComando" NOT NULL,
    "estado" "EstadoComando" NOT NULL DEFAULT 'PENDIENTE',
    "payload" JSONB,
    "respuesta" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRespuesta" TIMESTAMP(3),

    CONSTRAINT "Comando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispositivoMovil" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "plataforma" "Plataforma" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispositivoMovil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "nombre" "TipoPlan" NOT NULL,
    "descripcion" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialTenant" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "tipo" "TipoHistorialTenant" NOT NULL,
    "estadoAntes" "Estado",
    "estadoNuevo" "Estado",
    "planAntesId" INTEGER,
    "planNuevoId" INTEGER,
    "nota" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_nombre_key" ON "Tenant"("nombre");

-- CreateIndex
CREATE INDEX "Tenant_estado_idx" ON "Tenant"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_tenantId_idx" ON "Usuario"("tenantId");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_estado_idx" ON "Usuario"("estado");

-- CreateIndex
CREATE INDEX "Recinto_tenantId_estado_idx" ON "Recinto"("tenantId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Recinto_tenantId_codigo_key" ON "Recinto"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Estacion_recintoId_estado_idx" ON "Estacion"("recintoId", "estado");

-- CreateIndex
CREATE INDEX "Estacion_tipo_idx" ON "Estacion"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Estacion_recintoId_codigo_key" ON "Estacion"("recintoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Dispositivo_azureDeviceId_key" ON "Dispositivo"("azureDeviceId");

-- CreateIndex
CREATE INDEX "Dispositivo_estacionId_estado_idx" ON "Dispositivo"("estacionId", "estado");

-- CreateIndex
CREATE INDEX "Dispositivo_tipo_idx" ON "Dispositivo"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Dispositivo_estacionId_codigo_key" ON "Dispositivo"("estacionId", "codigo");

-- CreateIndex
CREATE INDEX "SensorScada_tenantId_recintoId_estacionId_idx" ON "SensorScada"("tenantId", "recintoId", "estacionId");

-- CreateIndex
CREATE INDEX "SensorScada_dispositivoId_metric_idx" ON "SensorScada"("dispositivoId", "metric");

-- CreateIndex
CREATE INDEX "SensorScada_estado_idx" ON "SensorScada"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "SensorScada_dispositivoId_codigo_key" ON "SensorScada"("dispositivoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroScada_externalMessageId_key" ON "RegistroScada"("externalMessageId");

-- CreateIndex
CREATE INDEX "RegistroScada_tenantId_capturedAt_idx" ON "RegistroScada"("tenantId", "capturedAt");

-- CreateIndex
CREATE INDEX "RegistroScada_tenantId_recintoId_capturedAt_idx" ON "RegistroScada"("tenantId", "recintoId", "capturedAt");

-- CreateIndex
CREATE INDEX "RegistroScada_tenantId_recintoId_estacionId_capturedAt_idx" ON "RegistroScada"("tenantId", "recintoId", "estacionId", "capturedAt");

-- CreateIndex
CREATE INDEX "RegistroScada_dispositivoId_metric_capturedAt_idx" ON "RegistroScada"("dispositivoId", "metric", "capturedAt");

-- CreateIndex
CREATE INDEX "RegistroScada_sensorId_capturedAt_idx" ON "RegistroScada"("sensorId", "capturedAt");

-- CreateIndex
CREATE INDEX "RegistroScada_tenantCode_siteCode_deviceCode_capturedAt_idx" ON "RegistroScada"("tenantCode", "siteCode", "deviceCode", "capturedAt");

-- CreateIndex
CREATE INDEX "EstadoActualScada_tenantId_recintoId_idx" ON "EstadoActualScada"("tenantId", "recintoId");

-- CreateIndex
CREATE INDEX "EstadoActualScada_dispositivoId_idx" ON "EstadoActualScada"("dispositivoId");

-- CreateIndex
CREATE INDEX "EstadoActualScada_status_idx" ON "EstadoActualScada"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoActualScada_sensorId_metric_key" ON "EstadoActualScada"("sensorId", "metric");

-- CreateIndex
CREATE INDEX "Alarma_tenantId_estado_idx" ON "Alarma"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Alarma_estacionId_estado_idx" ON "Alarma"("estacionId", "estado");

-- CreateIndex
CREATE INDEX "Alarma_sensorId_estado_idx" ON "Alarma"("sensorId", "estado");

-- CreateIndex
CREATE INDEX "Comando_tenantId_estado_idx" ON "Comando"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Comando_dispositivoId_estado_idx" ON "Comando"("dispositivoId", "estado");

-- CreateIndex
CREATE INDEX "Comando_usuarioId_idx" ON "Comando"("usuarioId");

-- CreateIndex
CREATE INDEX "DispositivoMovil_usuarioId_activo_idx" ON "DispositivoMovil"("usuarioId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_nombre_key" ON "Plan"("nombre");

-- CreateIndex
CREATE INDEX "HistorialTenant_tenantId_createdAt_idx" ON "HistorialTenant"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "HistorialTenant_usuarioId_idx" ON "HistorialTenant"("usuarioId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recinto" ADD CONSTRAINT "Recinto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estacion" ADD CONSTRAINT "Estacion_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispositivo" ADD CONSTRAINT "Dispositivo_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "Estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorScada" ADD CONSTRAINT "SensorScada_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorScada" ADD CONSTRAINT "SensorScada_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorScada" ADD CONSTRAINT "SensorScada_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "Estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorScada" ADD CONSTRAINT "SensorScada_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroScada" ADD CONSTRAINT "RegistroScada_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroScada" ADD CONSTRAINT "RegistroScada_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroScada" ADD CONSTRAINT "RegistroScada_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "Estacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroScada" ADD CONSTRAINT "RegistroScada_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroScada" ADD CONSTRAINT "RegistroScada_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "SensorScada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoActualScada" ADD CONSTRAINT "EstadoActualScada_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoActualScada" ADD CONSTRAINT "EstadoActualScada_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoActualScada" ADD CONSTRAINT "EstadoActualScada_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "Estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoActualScada" ADD CONSTRAINT "EstadoActualScada_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoActualScada" ADD CONSTRAINT "EstadoActualScada_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "SensorScada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarma" ADD CONSTRAINT "Alarma_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarma" ADD CONSTRAINT "Alarma_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarma" ADD CONSTRAINT "Alarma_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "Estacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarma" ADD CONSTRAINT "Alarma_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarma" ADD CONSTRAINT "Alarma_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "SensorScada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alarma" ADD CONSTRAINT "Alarma_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "RegistroScada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comando" ADD CONSTRAINT "Comando_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comando" ADD CONSTRAINT "Comando_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comando" ADD CONSTRAINT "Comando_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "Estacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comando" ADD CONSTRAINT "Comando_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "Dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comando" ADD CONSTRAINT "Comando_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispositivoMovil" ADD CONSTRAINT "DispositivoMovil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTenant" ADD CONSTRAINT "HistorialTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTenant" ADD CONSTRAINT "HistorialTenant_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTenant" ADD CONSTRAINT "HistorialTenant_planAntesId_fkey" FOREIGN KEY ("planAntesId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialTenant" ADD CONSTRAINT "HistorialTenant_planNuevoId_fkey" FOREIGN KEY ("planNuevoId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
