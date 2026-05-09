import { Rol, Estado, TipoPlan } from "@prisma/client";
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

  // 2. (Eliminado: El Superadmin ya no requiere un Tenant)

  // 3. Crear Superadmin
  console.log("Creando usuario Superadmin...");
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  await prisma.usuario.upsert({
    where: { email: "sadmin@aqua.cl" },
    update: { tenantId: null },
    create: {
      email: "sadmin@aqua.cl",
      nombre: "Administrador Sistema",
      passwordHash: passwordHash,
      rol: Rol.SUPERADMIN,
      estado: Estado.ACTIVO,
      // tenantId es null porque es transversal
    },
  });

  console.log("✅ Seeding completado con éxito.");
  console.log("📧 Usuario: sadmin@aqua.cl");
  console.log("🔑 Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
