import { readFileSync } from 'fs';
import { resolve } from 'path';
import Resolvers from '../../utilities/resolvers-type';

export const adminQuerySchema = readFileSync(resolve(__dirname, 'query.graphql'), 'utf8');

export const adminQueryResolvers: Resolvers = {
  allCurrentAgreements: (root, args, { user, prisma }) => prisma.agreements(),
  allPastAgreements: (root, args, { user, prisma }) => prisma.agreements(),
  allUpcomingAgreements: (root, args, { user, prisma }) => prisma.agreements()
}
