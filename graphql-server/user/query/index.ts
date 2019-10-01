import Resolvers from '../../utilities/resolvers-type';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { clientAgreementPipe } from '../../utilities/pipes';
import { Agreement, Connection } from '../../../generated/prisma-client';

export const userQuerySchema = readFileSync(resolve(__dirname, 'query.graphql'), 'utf8');

export const userQueryResolvers: Resolvers = {
  me: (root, args, { user, prisma }) => prisma.user({ cid: user.cid }),
  possiblePartnersForAgreement: async (root, { name }, { user, prisma }) => {
    const users = await prisma.users({ where: { name_contains: name } });
    return users.map(({ cid, name }) => ({
      cid,
      name
    }));
  },
  openAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    agreements = agreements.filter(({ committedUsersIds }) => !committedUsersIds.includes(user.id));
    return Promise.all(agreements.map(agreement => clientAgreementPipe(agreement, user, prisma)));
  },
  myAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    agreements = agreements.filter(({ committedUsersIds }) => committedUsersIds.includes(user.id));
    const outcomes = await prisma.outcomes({ where: { agreementId_in: agreements.map(({id}) => id) } });
    agreements = agreements.filter(agreement => {
      return !outcomes.some(outcome => outcome.agreementId === agreement.id && outcome.userId === user.id);
    });
    return Promise.all(agreements.map(agreement => clientAgreementPipe(agreement, user, prisma)));
  },
  requestedPartnerAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    agreements = agreements.filter(({ committedUsersIds }) => !committedUsersIds.includes(user.id));
    const connections = await prisma.connections({ where: { agreementId_in: agreements.map(({id}) => id) } });
    agreements = agreements.filter(agreement => {
      const connectionsForAgreement = connections.filter(connection => connection.agreementId === agreement.id);
      return connectionsForAgreement.every(connection => connection.fromId !== user.id);
    });
    return Promise.all(agreements.map(agreement => clientAgreementPipe(agreement, user, prisma)));
  },
  myPastAgreements: async (root, args, { user, prisma }) => {
    let agreements = await prisma.agreements();
    agreements = agreements.filter(({ committedUsersIds }) => committedUsersIds.includes(user.id));
    const outcomes = await prisma.outcomes({ where: { agreementId_in: agreements.map(({id}) => id) } });
    agreements = agreements.filter(agreement => {
      return outcomes.some(outcome => outcome.agreementId === agreement.id && outcome.userId === user.id);
    });
    return Promise.all(agreements.map(agreement => clientAgreementPipe(agreement, user, prisma)));
  },
}
