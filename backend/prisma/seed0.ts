import { Rol, Estado, TipoPlan, TipoHistorialTenant } from "@prisma/client";
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
      update: {},
      create: p,
    });
  }

  // Buscamos el plan Básico para asignárselo a los nuevos tenants por defecto
  const planBasico = await prisma.plan.findUnique({ where: { nombre: TipoPlan.BASICO } });

  // 2. Crear las Comunidades (Tenants) para el Simulador IoT
  console.log("Creando comunidades (Tenants)...");
  const comunidades = ["APR_SAN_ISIDRO", "APR_LOS_ROMEROS", "APR_VALLE_HERMOSO"];

  // Guardaremos los IDs generados en un diccionario para asignarlos a los usuarios más abajo
  const tenantIds: Record<string, number> = {};

  for (const nombre of comunidades) {
    let tenant = await prisma.tenant.findUnique({ where: { nombre: nombre } });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          nombre: nombre,
          estado: Estado.ACTIVO,
          planId: planBasico?.id,
        },
      });

      // Registro de auditoría para la creación y asignación de plan
      await prisma.historialTenant.create({
        data: {
          tenantId: tenant.id,
          tipo: TipoHistorialTenant.ACTIVACION,
          estadoNuevo: Estado.ACTIVO,
          planNuevoId: planBasico?.id,
          nota: "Comunidad creada y activada por el sistema (Seed) con plan Básico inicial.",
        },
      });
    }
    tenantIds[nombre] = tenant.id;
  }

  // Generar hash de contraseña único para todos ("admin123")
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  // 3. Crear Superadmin (Global)
  console.log("Creando usuario Superadmin global...");
  await prisma.usuario.upsert({
    where: { email: "sadmin@aqua.cl" },
    update: { tenantId: null },
    create: {
      email: "sadmin@aqua.cl",
      nombre: "Administrador Sistema",
      passwordHash: passwordHash,
      rol: Rol.SUPERADMIN,
      estado: Estado.ACTIVO,
      // tenantId es null porque tiene acceso a todo
    },
  });

  // 4. Crear Administradores por Comunidad
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
          passwordHash: passwordHash,
          rol: Rol.ADMIN,
          estado: Estado.ACTIVO,
          tenantId: tenantIds[admin.tenantNombre],
        },
      });

      // Registro de auditoría para el administrador
      await prisma.historialTenant.create({
        data: {
          tenantId: tenantIds[admin.tenantNombre],
          usuarioId: usuario.id,
          tipo: TipoHistorialTenant.CAMBIO_ADMIN,
          nota: `Administrador inicial (${admin.email}) asignado por el sistema (Seed).`,
        },
      });
    } else {
      // Si ya existe, nos aseguramos de que pertenezca a su comunidad correcta
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { tenantId: tenantIds[admin.tenantNombre] },
      });
    }
  }

  console.log("✅ Seeding completado con éxito. Todo listo para las pruebas.");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });