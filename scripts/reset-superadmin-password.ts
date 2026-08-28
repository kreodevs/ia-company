import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!password || password.length < 8) {
    console.error("Usage: tsx scripts/reset-superadmin-password.ts [email] <new-password>");
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const admins = await prisma.superAdmin.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    console.error("No superadmin accounts found. Use /setup to create the first one.");
    process.exit(1);
  }

  const target =
    (emailArg && admins.find((a) => a.email.toLowerCase() === emailArg)) ??
    (emailArg ? null : admins[0]);

  if (!target) {
    console.error(`Superadmin not found for email: ${emailArg}`);
    console.error("Existing accounts:");
    for (const admin of admins) {
      console.error(`  - ${admin.email} (${admin.name})`);
    }
    process.exit(1);
  }

  await prisma.superAdmin.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(password) },
  });

  console.log(`Password updated for superadmin: ${target.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
