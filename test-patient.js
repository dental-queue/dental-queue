const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  await prisma.patient.delete({ where: { id: 'cmth6sluh00043yk3od6iclc7' } });
  console.log('Deleted patient 03022');
}
test().catch(console.error).finally(() => prisma.$disconnect());
