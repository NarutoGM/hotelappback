import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('base64');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('base64');
}

async function main() {
  console.log('Seeding initial users...');

  // 1. Admin
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

  // 2. Recepcionista
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

  // 3. Huésped / Cliente Demo
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

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
