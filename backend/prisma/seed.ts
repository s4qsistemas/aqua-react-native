import {
  Rol,
  Estado,
  TipoPlan,
  TipoHistorialTenant,
  TipoEstacion,
  TipoDispositivo,
  EstadoDispositivo,
  TipoSensorScada,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱 Iniciando seeding...");

  // 1. Crear Planes iniciales
  console.log("Planificando planes...");
  const planes = [
    { nombre: TipoPlan.BASICO, descripcion: "Plan básico para pequeñas estaciones" },
    { nombre: TipoPlan.PROFESIONAL, descripcion: "Plan profesional con analítica avanzada" },
    { nombre: TipoPlan.EMPRESARIAL, descripcion: "Plan empresarial con soporte 24/7 y control total" },
  ];

  for (const p of planes) {
    await prisma.plan.upsert({
      where: { nombre: p.nombre },
      update: { descripcion: p.descripcion },
      create: p,
    });
  }

  const planBasico = await prisma.plan.findUnique({
    where: { nombre: TipoPlan.BASICO },
  });

  if (!planBasico) {
    throw new Error("No se pudo crear/encontrar el plan BASICO.");
  }

  // 2. Crear las Comunidades (Tenants)
  console.log("Creando comunidades (Tenants)...");
  const comunidades = ["APR_SAN_ISIDRO", "APR_LOS_ROMEROS", "APR_VALLE_HERMOSO"];

  const tenantIds: Record<string, number> = {};

  for (const nombre of comunidades) {
    let tenant = await prisma.tenant.findUnique({ where: { nombre } });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          nombre,
          estado: Estado.ACTIVO,
          planId: planBasico.id,
        },
      });

      await prisma.historialTenant.create({
        data: {
          tenantId: tenant.id,
          tipo: TipoHistorialTenant.ACTIVACION,
          estadoNuevo: Estado.ACTIVO,
          planNuevoId: planBasico.id,
          nota: "Comunidad creada y activada por el sistema (Seed) con plan Básico inicial.",
        },
      });
    }

    tenantIds[nombre] = tenant.id;
  }

  // 3. Crear usuarios base
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  console.log("Creando usuario Superadmin global...");
  await prisma.usuario.upsert({
    where: { email: "sadmin@aqua.cl" },
    update: {
      tenantId: null,
      rol: Rol.SUPERADMIN,
      estado: Estado.ACTIVO,
    },
    create: {
      email: "sadmin@aqua.cl",
      nombre: "Administrador Sistema",
      passwordHash,
      rol: Rol.SUPERADMIN,
      estado: Estado.ACTIVO,
    },
  });

  console.log("Creando usuarios Administradores para cada comunidad...");
  const admins = [
    { email: "admin@sanisidro.cl", nombre: "Admin San Isidro", tenantNombre: "APR_SAN_ISIDRO" },
    { email: "admin@losromeros.cl", nombre: "Admin Los Romeros", tenantNombre: "APR_LOS_ROMEROS" },
    { email: "admin@vallehermoso.cl", nombre: "Admin Valle Hermoso", tenantNombre: "APR_VALLE_HERMOSO" },
  ];

  for (const admin of admins) {
    let usuario = await prisma.usuario.findUnique({ where: { email: admin.email } });

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email: admin.email,
          nombre: admin.nombre,
          passwordHash,
          rol: Rol.ADMIN,
          estado: Estado.ACTIVO,
          tenantId: tenantIds[admin.tenantNombre],
        },
      });

      await prisma.historialTenant.create({
        data: {
          tenantId: tenantIds[admin.tenantNombre],
          usuarioId: usuario.id,
          tipo: TipoHistorialTenant.CAMBIO_ADMIN,
          nota: `Administrador inicial (${admin.email}) asignado por el sistema (Seed).`,
        },
      });
    } else {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          tenantId: tenantIds[admin.tenantNombre],
          rol: Rol.ADMIN,
          estado: Estado.ACTIVO,
        },
      });
    }
  }

  // 4. Crear estructura SCADA para las 3 comunidades del simulador
  console.log("Configurando infraestructuras SCADA para las 3 comunidades...");

  for (const nombre of comunidades) {
    const tId = tenantIds[nombre];

    // Crear Recinto Principal (Coincide con site_id: "Sede_Principal")
    const recinto = await prisma.recinto.upsert({
      where: { tenantId_codigo: { tenantId: tId, codigo: "Sede_Principal" } },
      update: { nombre: "Sede Central", estado: Estado.ACTIVO },
      create: {
        tenantId: tId,
        codigo: "Sede_Principal",
        nombre: "Sede Central",
        ubicacion: `Sector matriz de ${nombre}`,
        estado: Estado.ACTIVO,
      },
    });

    // Crear Estación de Prueba (ALINEADO A "EST_01")
    const estacion = await prisma.estacion.upsert({
      where: { recintoId_codigo: { recintoId: recinto.id, codigo: "EST_01" } },
      update: { nombre: "Estación de Monitoreo 01" },
      create: {
        recintoId: recinto.id,
        codigo: "EST_01",
        nombre: "Estación de Monitoreo 01",
        tipo: TipoEstacion.ESTANQUE,
        estado: Estado.ACTIVO,
      },
    });

    // Crear PLC/Gateway (Coincide con device_id: "GW-MOCK-01")
    const plc = await prisma.dispositivo.upsert({
      where: { estacionId_codigo: { estacionId: estacion.id, codigo: "GW-MOCK-01" } },
      update: { estado: EstadoDispositivo.CONECTADO, ultimaConexion: new Date() },
      create: {
        estacionId: estacion.id,
        codigo: "GW-MOCK-01",
        nombre: "Gateway Principal",
        tipo: TipoDispositivo.GATEWAY, // o PLC dependiendo de cómo lo uses en físico
        estado: EstadoDispositivo.CONECTADO,
      },
    });

    // Crear los sensores EXACTAMENTE alineados al formato del simulador
    const sensores = [
      { codigo: "TNK_01", nombre: "Nivel Estanque", metric: "level", unit: "%", tipo: TipoSensorScada.NIVEL },
      { codigo: "VOL_01", nombre: "Volumen Estanque", metric: "volume", unit: "L", tipo: TipoSensorScada.OTRO }, // Agregado el Volumen
      { codigo: "FLW_01", nombre: "Caudalímetro", metric: "flow", unit: "m³/h", tipo: TipoSensorScada.CAUDAL }, // Unidad estándar
      { codigo: "PMP_01", nombre: "Estado Bomba Principal", metric: "status", unit: "bool", tipo: TipoSensorScada.ESTADO },
      { codigo: "NET_01", nombre: "Latencia de Red", metric: "latency", unit: "ms", tipo: TipoSensorScada.OTRO },
    ];

    for (const s of sensores) {
      await prisma.sensorScada.upsert({
        where: { dispositivoId_codigo: { dispositivoId: plc.id, codigo: s.codigo } },
        update: { metric: s.metric, unit: s.unit },
        create: {
          tenantId: tId,
          recintoId: recinto.id,
          estacionId: estacion.id,
          dispositivoId: plc.id,
          codigo: s.codigo,
          nombre: s.nombre,
          metric: s.metric,
          unit: s.unit,
          tipo: s.tipo,
        },
      });
    }
  }

  console.log("✅ Seeding completado con éxito. Todo listo para las pruebas.");
  console.log("Usuarios base:");
  console.log("  SUPERADMIN: sadmin@aqua.cl / admin123");
  console.log("  ADMIN APR_SAN_ISIDRO: admin@sanisidro.cl / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });