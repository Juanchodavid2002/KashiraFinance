import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
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
  }

  console.log(`Seed completado: ${DEFAULT_CATEGORIES.length} categorías predeterminadas verificadas.`);
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
