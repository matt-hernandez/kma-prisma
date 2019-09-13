import { prisma } from './generated/prisma-client'
import datamodelInfo from './generated/nexus-prisma'
import * as path from 'path'
import { stringArg, objectType } from 'nexus'
import { prismaObjectType, makePrismaSchema } from 'nexus-prisma'
import { GraphQLServer } from 'graphql-yoga'

const UserSearchResult = objectType({
  name: 'UserSearchResult',
  definition(t) {
    t.string('id')
    t.string('name')
  }
})

const Query = prismaObjectType({
  name: 'Query',
  definition(t) {
    t.prismaFields(['user'])
    t.list.field('searchPossiblePartnersForAgreement', {
      type: UserSearchResult,
      args: { name: stringArg() },
      resolve: (_, { name }, ctx) => ctx.prisma.users({ where: { name_contains: name } })
    })
  }
})

const Mutation = prismaObjectType({
  name: 'Mutation',
  definition(t) {
    t.prismaFields(['createUser'])
  },
})

const schema = makePrismaSchema({
  types: [Query, Mutation, UserSearchResult],

  prisma: {
    datamodelInfo,
    client: prisma,
  },

  outputs: {
    schema: path.join(__dirname, './generated/schema.graphql'),
    typegen: path.join(__dirname, './generated/nexus.ts'),
  },
})

const server = new GraphQLServer({
  schema,
  context: { prisma },
})
server.start(() => console.log('Server is running on http://localhost:4000'))
