import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  // const bizSessions = await prisma.bizSession.findMany({
  //   where: { environmentId: null },
  //   include: { content: true },
  // });
  // for (const bizSession of bizSessions) {
  //   await prisma.bizSession.update({
  //     where: { id: bizSession.id },
  //     data: {
  //       environmentId: bizSession.content.environmentId,
  //     },
  //   });
  //   await prisma.bizAnswer.updateMany({
  //     where: { bizSessionId: bizSession.id },
  //     data: {
  //       environmentId: bizSession.content.environmentId,
  //     },
  //   });
  // }
  if (user) {
    console.log('User already exists...');
    return;
  }
  await prisma.user.deleteMany();

  console.log('Seeding...');

  const user1 = await prisma.user.create({
    data: {
      email: 'lisa@simpson.com',
      name: 'Lisa',
      password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // secret42
    },
  });

  console.log({ user1 });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
