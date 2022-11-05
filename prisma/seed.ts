import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      name: 'José',
      email: 'jose@email.com',
      avatarUrl: 'https://github.com/R13N.png'
    }
  })

  const pool = await prisma.pool.create({
    data: {
      title: 'Bolão do josé',
      code: 'BOL567',
      ownerId: user.id,

      participants: {
        create: {
          userId: user.id
        }
      }
    }
  })

  await prisma.game.create({
    data: {
      date: '2022-11-22T12:00:00.000Z',
      firstTeamCountryCode: 'DE',
      secondTeamCountryCode: 'BR',
    }
  })

  await prisma.game.create({
    data: {
      date: '2022-11-22T12:00:00.000Z',
      firstTeamCountryCode: 'BR',
      secondTeamCountryCode: 'AR',
      guesses: {
        create: {
          firstTeamPoints: 2,
          secondTeamPoints: 0,
          participant: {
            connect: {
              userId_poolId: {
                poolId: pool.id,
                userId: user.id
              }
            }
          }
        }
      }
    }
  })


}

main()