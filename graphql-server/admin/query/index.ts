import { readFileSync } from 'fs';
import { resolve } from 'path';
import Resolvers from '../../utilities/resolvers-type';
import { adminAgreementPipe } from '../../utilities/pipes';

export const adminQuerySchema = readFileSync(resolve(__dirname, 'query.graphql'), 'utf8');

export const adminQueryResolvers: Resolvers = {
  allCurrentAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    const utcTime = new Date().getUTCMilliseconds();
    agreements = agreements.filter(agreement => agreement.due <= utcTime);
    return agreements.map(agreement => adminAgreementPipe(agreement, prisma));
  },
  allPastAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    const utcTime = new Date().getUTCMilliseconds();
    agreements = agreements.filter(agreement => agreement.due > utcTime);
    return agreements.map(agreement => adminAgreementPipe(agreement, prisma));
  },
  allUpcomingAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    const utcTime = new Date().getUTCMilliseconds();
    agreements = agreements.filter(agreement => agreement.publishDate <= utcTime);
    return agreements.map(agreement => adminAgreementPipe(agreement, prisma));
  },
}
