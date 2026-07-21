import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensurePlatformSettings } from "../src/lib/platform-settings";
import { seedPlatformTemplates } from "../src/lib/seed-platform";

const prisma = new PrismaClient();

async function main() {
  await ensurePlatformSettings();
  console.log("🌱 Seeding platform templates (no tenant)…");
  const result = await seedPlatformTemplates(prisma);
  console.log(`  ✓ ${result.skills} platform skill templates`);
  console.log(`  ✓ ${result.agents} platform agent templates`);
  console.log(`  ✓ ${result.workflows} platform workflow templates`);
  console.log("✅ Seed complete (templates only — tenants created by superadmin)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
