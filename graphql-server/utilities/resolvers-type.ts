import { Prisma } from '../../generated/prisma-client';

interface Resolvers {
  [key: string]: (root: any, args: any, context: { user: any, prisma: Prisma }) => any;
}

export default Resolvers;
