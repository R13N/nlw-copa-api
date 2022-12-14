import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import ShortUniqueId from "short-unique-id";
import { authenticate } from "../plugins/authenticate";


export async function poolRoutes(fastify: FastifyInstance) {

  fastify.get('/pools/count', async () => {
    const count = await prisma.pool.count()

    return { count }
  })

  fastify.post('/pools', async (request, reply) => {

    const createpoolBody = z.object({
      title: z.string(),
    })

    const { title } = createpoolBody.parse(request.body)

    const generate = new ShortUniqueId({ length: 6 })
    const code = String(generate()).toUpperCase()

    try {
      await request.jwtVerify();
      //se chegar até aqui, temos um usuário autenticado

      await prisma.pool.create({
        data: {
          title,
          code,
          ownerId: request.user.sub,
          participants: {
            create: {
              userId: request.user.sub,
            }
          }
        }
      })


    } catch (error) {
      await prisma.pool.create({
        data: {
          title,
          code
        }
      })

      // throw error

      //se não, criamos o usuário sem o ownerId
    }


    return reply.status(201).send({ code })
  })

  fastify.post('/pools/join', { onRequest: [authenticate] }, async (request, reply) => {
    const joinPoolBody = z.object({
      code: z.string(),
    })

    const { code } = joinPoolBody.parse(request.body)

    //verificação da existência do código do bolão
    //verificar se o usuário faz ou não parte do bolão
    const pool = await prisma.pool.findUnique({
      where: {
        code
      },
      include: {
        participants: {
          where: {
            userId: request.user.sub
          }
        }
      }
    })

    if (!pool) {
      return reply.status(400).send({ message: "Pool not found!" })
    }

    if (pool.participants.length > 0) {
      return reply.status(400).send({
        message: "You've joined this pool!"
      })
    }

    if (!pool.ownerId) {
      await prisma.pool.update({
        where: {
          id: pool.id
        },
        data: {
          ownerId: request.user.sub
        }
      })
    }

    await prisma.participant.create({
      data: {
        poolId: pool.id,
        userId: request.user.sub
      }
    })

    return reply.status(201).send()
  })

  fastify.get('/pools', {
    onRequest: [authenticate]
  }, async (request) => {
    const pools = await prisma.pool.findMany({
      where: {
        participants: {
          some: {
            userId: request.user.sub
          }
        }
      },
      include: {
        _count: {
          select: {
            participants: true,
          }
        },
        participants: {
          select: {
            id: true,
            user: {
              select: {
                avatarUrl: true,
              }
            }
          },
          take: 4,
        },
        owner: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return { pools }
  })

  fastify.get('/pools/:id', { onRequest: [authenticate] }, async (request) => {
    const getPoolParams = z.object({
      id: z.string(),
    })

    const { id } = getPoolParams.parse(request.params)

    const pool = await prisma.pool.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            participants: true,
          }
        },
        participants: {
          select: {
            id: true,
            user: {
              select: {
                avatarUrl: true,
              }
            }
          },
          take: 4,
        },
        owner: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return { pool }

  })
}


