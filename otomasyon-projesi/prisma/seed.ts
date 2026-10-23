import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );

  const roleByName = new Map(roles.map((role) => [role.name, role]));
  const passwordHash = await bcrypt.hash('Demo12345!', 12);

  await prisma.user.upsert({
    where: { email: 'yonetici@demo.com' },
    update: {},
    create: {
      email: 'yonetici@demo.com',
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
      passwordHash,
      roleId: roleByName.get(RoleName.YONETICI)!.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'aday@demo.com' },
    update: {},
    create: {
      email: 'aday@demo.com',
      firstName: 'Demo',
      lastName: 'Aday',
      passwordHash,
      roleId: roleByName.get(RoleName.ADAY)!.id,
      candidate: { create: { title: 'Frontend Geliştirici', summary: 'React ve TypeScript odaklı aday profili.' } }
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
