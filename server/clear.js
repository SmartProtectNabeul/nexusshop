const prisma = require('./lib/prisma');

async function main() {
  await prisma.payment.deleteMany();
  console.log('Payments cleared');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
