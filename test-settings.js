const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const settings = await prisma.clinicSetting.findMany();
  console.log('Settings:', settings);
}
test().catch(console.error).finally(() => prisma.$disconnect());
