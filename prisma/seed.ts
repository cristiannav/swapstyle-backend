import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const hashedPassword = await bcrypt.hash('Test123!', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'maria@example.com' },
      update: {},
      create: {
        email: 'maria@example.com',
        password: hashedPassword,
        username: 'maria_style',
        firstName: 'María',
        lastName: 'García',
        bio: 'Amante de la moda sostenible 🌿',
        isVerified: true,
        profile: {
          create: {
            preferredStyles: ['casual', 'boho', 'vintage'],
            preferredSizes: ['S', 'M'],
            preferredBrands: ['Zara', 'Mango', 'H&M'],
            preferredColors: ['beige', 'white', 'earth tones'],
            topSize: 'S',
            bottomSize: 'M',
            shoeSize: '38',
            city: 'Madrid',
            country: 'Spain',
            latitude: 40.4168,
            longitude: -3.7038,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos@example.com' },
      update: {},
      create: {
        email: 'carlos@example.com',
        password: hashedPassword,
        username: 'carlos_swap',
        firstName: 'Carlos',
        lastName: 'López',
        bio: 'Intercambiando estilo desde 2023',
        isVerified: true,
        profile: {
          create: {
            preferredStyles: ['streetwear', 'urban', 'minimalist'],
            preferredSizes: ['M', 'L'],
            preferredBrands: ['Nike', 'Adidas', 'Carhartt'],
            preferredColors: ['black', 'white', 'grey'],
            topSize: 'L',
            bottomSize: 'M',
            shoeSize: '43',
            city: 'Barcelona',
            country: 'Spain',
            latitude: 41.3851,
            longitude: 2.1734,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'lucia@example.com' },
      update: {},
      create: {
        email: 'lucia@example.com',
        password: hashedPassword,
        username: 'lucia_vintage',
        firstName: 'Lucía',
        lastName: 'Martínez',
        bio: 'Coleccionista de piezas vintage ✨',
        isVerified: true,
        profile: {
          create: {
            preferredStyles: ['vintage', 'retro', 'classic'],
            preferredSizes: ['XS', 'S'],
            preferredBrands: ['Levi\'s', 'Guess', 'Versace'],
            preferredColors: ['denim', 'brown', 'cream'],
            topSize: 'XS',
            bottomSize: 'S',
            shoeSize: '37',
            city: 'Valencia',
            country: 'Spain',
            latitude: 39.4699,
            longitude: -0.3763,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create garments for each user
  const garmentData = [
    // María's garments
    {
      userId: users[0].id,
      title: 'Vestido Boho Floral',
      description: 'Precioso vestido largo con estampado floral, perfecto para el verano.',
      category: 'DRESSES',
      brand: 'Zara',
      size: 'S',
      color: 'Floral multicolor',
      condition: 'LIKE_NEW',
      originalPrice: 49.99,
      tags: ['boho', 'floral', 'summer', 'long dress'],
    },
    {
      userId: users[0].id,
      title: 'Blusa de Lino Blanca',
      description: 'Blusa básica de lino, muy versátil.',
      category: 'TOPS',
      brand: 'Mango',
      size: 'S',
      color: 'Blanco',
      condition: 'GOOD',
      originalPrice: 29.99,
      tags: ['basic', 'linen', 'white', 'casual'],
    },
    // Carlos's garments
    {
      userId: users[1].id,
      title: 'Sudadera Nike Vintage',
      description: 'Sudadera Nike de los 90s en perfecto estado.',
      category: 'TOPS',
      brand: 'Nike',
      size: 'L',
      color: 'Negro',
      condition: 'GOOD',
      originalPrice: 89.99,
      tags: ['vintage', 'streetwear', 'nike', '90s'],
    },
    {
      userId: users[1].id,
      title: 'Pantalones Cargo Carhartt',
      description: 'Pantalones cargo en color caqui, muy poco uso.',
      category: 'BOTTOMS',
      brand: 'Carhartt',
      size: 'M',
      color: 'Caqui',
      condition: 'LIKE_NEW',
      originalPrice: 99.99,
      tags: ['cargo', 'workwear', 'utility'],
    },
    {
      userId: users[1].id,
      title: 'Zapatillas Adidas Samba',
      description: 'Clásicas Adidas Samba, talla 43.',
      category: 'SHOES',
      brand: 'Adidas',
      size: '43',
      color: 'Blanco/Negro',
      condition: 'GOOD',
      originalPrice: 100,
      tags: ['sneakers', 'classic', 'adidas'],
    },
    // Lucía's garments
    {
      userId: users[2].id,
      title: 'Chaqueta Levi\'s Denim',
      description: 'Chaqueta vaquera vintage de Levi\'s, años 80.',
      category: 'OUTERWEAR',
      brand: 'Levi\'s',
      size: 'S',
      color: 'Denim azul',
      condition: 'GOOD',
      originalPrice: 120,
      tags: ['vintage', 'denim', '80s', 'levis'],
    },
    {
      userId: users[2].id,
      title: 'Bolso Guess Vintage',
      description: 'Bolso de mano Guess de los 90s.',
      category: 'BAGS',
      brand: 'Guess',
      size: 'Único',
      color: 'Marrón',
      condition: 'FAIR',
      originalPrice: 80,
      tags: ['vintage', '90s', 'handbag'],
    },
  ];

  const garments = await Promise.all(
    garmentData.map((garment) =>
      prisma.garment.create({
        data: {
          ...garment,
          category: garment.category as never,
          condition: garment.condition as never,
          images: {
            create: {
              url: `https://picsum.photos/seed/${garment.title.replace(/\s/g, '')}/400/600`,
              isPrimary: true,
              order: 0,
            },
          },
        },
      })
    )
  );

  console.log(`✅ Created ${garments.length} garments`);

  // Create some sample events
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Speed Swapping Madrid',
        description: 'Evento de intercambio rápido de ropa en el centro de Madrid. Trae al menos 5 prendas en buen estado.',
        type: 'SPEED_SWAPPING',
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000),
        isVirtual: false,
        address: 'Centro Cultural La Casa Encendida, Madrid',
        latitude: 40.4089,
        longitude: -3.6973,
        maxParticipants: 50,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Virtual Swap: Vintage Edition',
        description: 'Intercambio virtual temático de ropa vintage. Conecta desde casa y encuentra piezas únicas.',
        type: 'VIRTUAL_SWAP',
        startTime: nextMonth,
        endTime: new Date(nextMonth.getTime() + 2 * 60 * 60 * 1000),
        isVirtual: true,
        meetingUrl: 'https://meet.example.com/vintage-swap',
        maxParticipants: 100,
      },
    }),
  ]);

  console.log(`✅ Created ${events.length} events`);

  // Create some sample swipes and a match
  const swipe1 = await prisma.swipe.create({
    data: {
      swiperId: users[0].id,
      swipedId: users[1].id,
      garmentId: garments[2].id, // María swipes right on Carlos's Nike
      direction: 'RIGHT',
    },
  });

  const swipe2 = await prisma.swipe.create({
    data: {
      swiperId: users[1].id,
      swipedId: users[0].id,
      garmentId: garments[0].id, // Carlos swipes right on María's dress
      direction: 'RIGHT',
    },
  });

  console.log('✅ Created sample swipes');

  // Create a match between María and Carlos
  const match = await prisma.match.create({
    data: {
      user1Id: users[0].id,
      user2Id: users[1].id,
      garment1Id: garments[0].id,
      garment2Id: garments[2].id,
      status: 'PENDING',
      conversation: {
        create: {
          messages: {
            create: [
              {
                senderId: users[0].id,
                content: '¡Hola! Me encanta tu sudadera Nike, ¿te interesa intercambiar?',
                type: 'TEXT',
              },
              {
                senderId: users[1].id,
                content: '¡Hola! Sí, tu vestido es precioso. ¿Está en buen estado?',
                type: 'TEXT',
              },
            ],
          },
        },
      },
    },
  });

  // Update conversation last message time
  await prisma.conversation.update({
    where: { matchId: match.id },
    data: { lastMessageAt: new Date() },
  });

  console.log('✅ Created sample match with conversation');

  // Create notifications
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'NEW_MATCH',
        title: '¡Nuevo Match!',
        body: 'Has hecho match con @carlos_swap',
        data: { matchId: match.id },
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[1].id,
        type: 'NEW_MATCH',
        title: '¡Nuevo Match!',
        body: 'Has hecho match con @maria_style',
        data: { matchId: match.id },
      },
    }),
  ]);

  console.log('✅ Created sample notifications');

  console.log('\n🎉 Database seeding completed successfully!\n');
  console.log('Test accounts:');
  console.log('  📧 maria@example.com / Test123!');
  console.log('  📧 carlos@example.com / Test123!');
  console.log('  📧 lucia@example.com / Test123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
