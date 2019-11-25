import { Prisma } from '../../generated/prisma-client';
import { Rule } from 'graphql-shield/dist/rules';

export type ResolverFunction = (root: any, args: any, context: { user: any, prisma: Prisma }) => any;

export type Resolver = ResolverFunction | [ResolverFunction, Rule[]];

interface Resolvers {
  [key: string]: Resolver;
}

export default Resolvers;
