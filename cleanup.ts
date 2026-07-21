import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); async function main() { await prisma.superAdmin.deleteMany(); console.log('Superadmins deleted'); } main();
