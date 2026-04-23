require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const prisma = require('../lib/prisma');

async function main() {
  console.log('Seeding database...');

  // Create a dummy developer
  const dev = await prisma.user.create({
    data: {
      email: 'dev@nexusshop.com',
      role: 'DEVELOPER',
      walletBalance: 0.0,
    }
  });

  // Create a dummy consumer
  const consumer = await prisma.user.create({
    data: {
      email: 'user@nexusshop.com',
      role: 'CONSUMER',
      walletBalance: 0.0,
    }
  });

  // Seed the products
  const product = await prisma.product.create({
    data: {
      title: 'Nova Code Editor',
      description: 'A lightning-fast, AI-powered code editor with syntax highlighting for 120+ languages.',
      price: 2500,
      category: 'apps',
      status: 'LIVE',
      thumbnailUrl: '/thumbnails/code-editor.png',
      // Task 0: Multiple images and optional demo video
      mediaUrls: [
        '/thumbnails/code-editor.png',
        '/hero_nova.png'
      ],
      demoVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      fileUrl: 'private/nova-code-editor-v3.zip', // This would be the actual file path in Supabase Storage
      developerId: dev.id,
    }
  });

  console.log('Database seeded successfully!');
  console.log(`Developer ID: ${dev.id}`);
  console.log(`Consumer ID: ${consumer.id}`);
  console.log(`Product ID: ${product.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
