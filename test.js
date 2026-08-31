const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const patientId = 'cmtgtnluu0004lx4kltk6ji0u'; // The one with cancelled queue
  const queues = await prisma.queue.findMany({ where: { patientId }});
  console.log('Queues for patient:', queues);
}
test().catch(console.error).finally(() => prisma.$disconnect());
