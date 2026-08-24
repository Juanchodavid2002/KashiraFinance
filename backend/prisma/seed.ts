import "dotenv/config";
import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 12;

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Alimentación", color: "#F59E0B" },
  { name: "Transporte", color: "#3B82F6" },
  { name: "Vivienda", color: "#8B5CF6" },
  { name: "Servicios", color: "#06B6D4" },
  { name: "Salud", color: "#EF4444" },
  { name: "Educación", color: "#10B981" },
  { name: "Entretenimiento", color: "#EC4899" },
  { name: "Compras", color: "#F97316" },
  { name: "Suscripciones", color: "#6366F1" },
  { name: "Deudas", color: "#DC2626" },
  { name: "Otros", color: "#6B7280" },
];

interface TestUserDefinition {
  name: string;
  email: string;
  password: string;
}

function getTestUsers(): TestUserDefinition[] {
  return [
    {
      name: "Usuario Test",
      email: (process.env.TEST_USER_EMAIL ?? "user@test.local").trim().toLowerCase(),
      password: process.env.TEST_USER_PASSWORD ?? "Test1234*",
    },
    {
      name: "Admin Test",
      email: (process.env.TEST_ADMIN_EMAIL ?? "admin@test.local").trim().toLowerCase(),
      password: process.env.TEST_ADMIN_PASSWORD ?? "Admin1234*",
    },
  ];
}

async function seedTestUsers(): Promise<{ created: number; existing: number }> {
  if (process.env.NODE_ENV === "production") {
    console.log("Entorno de producción detectado: usuarios de prueba omitidos.");
    return { created: 0, existing: 0 };
  }

  let created = 0;
  let existing = 0;

  for (const testUser of getTestUsers()) {
    const found = await prisma.user.findFirst({
      where: { email: testUser.email },
    });

    if (found) {
      existing++;
      continue;
    }

    await prisma.user.create({
      data: {
        name: testUser.name,
        email: testUser.email,
        passwordHash: await bcrypt.hash(testUser.password, BCRYPT_SALT_ROUNDS),
      },
    });

    created++;
    console.log(`Usuario de prueba creado: ${testUser.email}`);
  }

  return { created, existing };
}

async function main() {
  let categoriesVerified = 0;

  for (const category of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { isDefault: true, userId: null, name: category.name },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: category.name,
          color: category.color,
          isDefault: true,
          userId: null,
        },
      });
    }

    categoriesVerified++;
  }

  const users = await seedTestUsers();

  console.log(`Seed completado: ${categoriesVerified} categorías predeterminadas verificadas.`);
  console.log(`Usuarios de prueba: ${users.created} creados, ${users.existing} ya existentes.`);
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
