import Resolvers from '../../utilities/resolvers-type';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const userQuerySchema = readFileSync(resolve(__dirname, 'query.graphql'), 'utf8');

export const userQueryResolvers: Resolvers = {
  me: (root, args, { user, prisma }) => prisma.user({ email: user.email }),
  possiblePartnersForAgreement: (root, { name }, { user, prisma }) => prisma.users({ where: { name_contains: name } }),
  openAgreements: (root, args, { user, prisma }) => prisma.agreements(),
  myAgreements: (root, args, { user, prisma }) => prisma.agreements(),
  requestedPartnerAgreements: (root, args, { user, prisma }) => prisma.agreements(),
  myPastAgreements: (root, args, { user, prisma }) => prisma.agreements(),
}
