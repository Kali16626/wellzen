import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial Faculty and Admin accounts...');

  const password = await bcrypt.hash('admin@123', 10);

  // Seed a Super Admin if not exists
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wellzen.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@wellzen.com',
      password: password,
      role: 'SUPER_ADMIN',
    },
  });

  // Seed a Faculty member
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@wellzen.edu' },
    update: {},
    create: {
      name: 'Prof. Sarah Jenkins',
      email: 'faculty@wellzen.edu',
      password: password,
      role: 'FACULTY',
      department: 'Computer Science'
    },
  });
  
  // Seed a Counselor
  const counselor = await prisma.user.upsert({
    where: { email: 'counselor@wellzen.edu' },
    update: {},
    create: {
      name: 'Dr. Michael Chen',
      email: 'counselor@wellzen.edu',
      password: password,
      role: 'COUNSELOR',
    },
  });

  console.log('✅ Seeding complete!');
  console.log('Admin:', admin.email);
  console.log('Faculty (Receives Urgent Emails):', faculty.email);
  console.log('Counselor (Receives Urgent Emails):', counselor.email);
  console.log('All passwords are: admin@123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
