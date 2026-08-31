const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'CREATOR_NAME' } });
  console.log(config.value);
}
test().catch(console.error).finally(() => prisma.$disconnect());
