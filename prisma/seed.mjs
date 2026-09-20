import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('base64');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('base64');
}

async function main() {
  console.log('Seeding initial users and rooms in Neon DB...');

  // 1. Usuarios
  const adminEmail = 'admin@aurahotel.pe';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const salt = generateSalt();
    await prisma.user.create({
      data: {
        id: 'usr-admin-001',
        email: adminEmail,
        fullName: 'Administrador Aura',
        passwordHash: hashPassword('Admin2026!', salt),
        salt,
        documentNumber: '00000001',
        role: 'ADMIN',
      },
    });
    console.log('Created Admin user: admin@aurahotel.pe / Admin2026!');
  }

  const recEmail = 'recepcion@aurahotel.pe';
  const existingRec = await prisma.user.findUnique({ where: { email: recEmail } });
  if (!existingRec) {
    const salt = generateSalt();
    await prisma.user.create({
      data: {
        id: 'usr-staff-002',
        email: recEmail,
        fullName: 'Mariana Salas (Recepción)',
        passwordHash: hashPassword('Recepcion2026!', salt),
        salt,
        documentNumber: '44891023',
        role: 'RECEPTIONIST',
      },
    });
    console.log('Created Receptionist user: recepcion@aurahotel.pe / Recepcion2026!');
  }

  const guestEmail = 'huesped@aurahotel.pe';
  const existingGuest = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (!existingGuest) {
    const salt = generateSalt();
    await prisma.user.create({
      data: {
        id: 'usr-guest-001',
        email: guestEmail,
        fullName: 'Carlos Valderrama',
        passwordHash: hashPassword('Aura2026!', salt),
        salt,
        documentNumber: '72918234',
        role: 'GUEST',
      },
    });
    console.log('Created Guest user: huesped@aurahotel.pe / Aura2026!');
  }

  // 2. Habitaciones con Capacidad y Características
  const roomsData = [
    {
      id: 'room_single_201',
      roomNumber: 'Hab. 201',
      title: 'Individual Clásica',
      subtitle: 'Piso 2 · Ideal para 1 persona',
      type: 'Single',
      floor: 2,
      capacity: 1,
      pricePerNight: 160.0,
      isAvailable: true,
      bedType: '1 Cama Individual',
      surfaceAreaM2: 20,
      rating: 4.7,
      reviewsCount: 42,
      amenitiesCsv: 'Wi-Fi;Baño Privado;TV;Escritorio',
    },
    {
      id: 'room_king_205',
      roomNumber: 'Hab. 205',
      title: 'Estándar King',
      subtitle: 'Piso 2 · Para parejas o 2 personas',
      type: 'Estándar King',
      floor: 2,
      capacity: 2,
      pricePerNight: 220.0,
      isAvailable: true,
      bedType: '1 Cama King',
      surfaceAreaM2: 28,
      rating: 4.8,
      reviewsCount: 65,
      amenitiesCsv: 'Wi-Fi;Baño Privado;TV;Aire Acondicionado',
    },
    {
      id: 'room_double_418',
      roomNumber: 'Hab. 418',
      title: 'Doble Twin Superior',
      subtitle: 'Piso 4 · 2 Camas individuales',
      type: 'Double',
      floor: 4,
      capacity: 2,
      pricePerNight: 230.0,
      isAvailable: true,
      bedType: '2 Camas Twin',
      surfaceAreaM2: 30,
      rating: 4.8,
      reviewsCount: 58,
      amenitiesCsv: 'Wi-Fi;Baño Privado;TV;Desayuno Buffet',
    },
    {
      id: 'room_junior_412',
      roomNumber: 'Hab. 412',
      title: 'Junior Suite',
      subtitle: 'Piso 4 · Hasta 3 personas',
      type: 'Junior Suite',
      floor: 4,
      capacity: 3,
      pricePerNight: 290.0,
      isAvailable: true,
      bedType: '1 Cama Queen + 1 Sofá Cama',
      surfaceAreaM2: 38,
      rating: 4.9,
      reviewsCount: 82,
      amenitiesCsv: 'Wi-Fi;Minibar;TV 55;Sala de Estar;Desayuno',
    },
    {
      id: 'room_deluxe_704',
      roomNumber: 'Hab. 704',
      title: 'Suite Deluxe Familiar',
      subtitle: 'Piso 7 · Espacio amplio para 4 personas',
      type: 'Suite Deluxe',
      floor: 7,
      capacity: 4,
      pricePerNight: 380.0,
      isAvailable: true,
      bedType: '1 Cama King + 2 Camas Twin',
      surfaceAreaM2: 52,
      rating: 4.9,
      reviewsCount: 94,
      amenitiesCsv: 'Wi-Fi;Jacuzzi;Terraza;Desayuno Buffet;Smart TV',
    },
    {
      id: 'room_penthouse_801',
      roomNumber: 'Hab. 801',
      title: 'Gran Penthouse Residencial',
      subtitle: 'Piso 8 · Exclusivo para familias de hasta 6 personas',
      type: 'Penthouse',
      floor: 8,
      capacity: 6,
      pricePerNight: 620.0,
      isAvailable: true,
      bedType: '2 Camas King + 2 Camas Twin',
      surfaceAreaM2: 85,
      rating: 5.0,
      reviewsCount: 110,
      amenitiesCsv: 'Wi-Fi;Jacuzzi Panorámico;Terraza Privada;Cocina;Solárium',
    },
  ];

  for (const r of roomsData) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }
  console.log(`Upserted ${roomsData.length} rooms with capacity and pricing into Neon DB.`);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
