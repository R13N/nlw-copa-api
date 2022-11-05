import { FastifyInstance } from "fastify";
import { z } from "zod"; //faz a validação da tipagem dos dados
import { prisma } from "../lib/prisma";
import fetch from "node-fetch";
import { authenticate } from "../plugins/authenticate";

export async function authRoutes(fastify: FastifyInstance) {

  fastify.get("/me", {
    onRequest: [authenticate]
  }, async (request) => {
    return { user: request.user }
  })

  fastify.post('/users', async (request) => {
    const createUserBody = z.object({
      access_token: z.string(),
    })

    const { access_token } = createUserBody.parse(request.body);

    //chamada fetch para api do google passando o token
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access_token}`,
      }
    })

    const userData = await userResponse.json();

    //criação do schema com as informações que o google retorna sobre o usuário cadastrado:
    const userInfoSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      picture: z.string().url(),
    })

    //validação dos dados que vem da api do google combinam com o schema definido
    const userInfo = userInfoSchema.parse(userData);

    let user = await prisma.user.findUnique({
      where: {
        googleId: userInfo.id
      }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          avatarUrl: userInfo.picture,
        }
      })
    }

    //em produção é muito recomendado que a expiresIn seja menor que 7 days, 
    //1 d é o padrão, até menos dependendo das regras de negócio
    const token = fastify.jwt.sign({
      name: user.name,
      avatarUrl: user.avatarUrl
    }, {
      sub: user.id,
      expiresIn: '7 days',
    })

    return { token };
  })

}