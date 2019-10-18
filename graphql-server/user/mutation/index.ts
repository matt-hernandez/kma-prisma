import * as shortid from 'shortid';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { and, rule } from 'graphql-shield';
import Resolvers from '../../utilities/resolvers-type';
import { clientAgreementPipe } from '../../utilities/pipes';
import { isAuthenticated, isAdmin } from '../../utilities/shield-rules';
import { Prisma } from '../../../generated/prisma-client';
import { TODAY_MILLISECONDS } from '../../utilities/date';

export const userMutationSchema = readFileSync(resolve(__dirname, 'mutation.graphql'), 'utf8');

export const userMutationResolvers: Resolvers = {
  commitToAgreement: async (root, { agreementCid }, { user, prisma }) => {
    let agreement = await prisma.agreement({ cid: agreementCid });
    agreement = await prisma.updateAgreement({
      where: { cid: agreementCid },
      data: {
        committedUsersIds: {
          set: [
            ...agreement.committedUsersIds,
            user.id
          ]
        }
      },
    });
    return clientAgreementPipe(agreement, user, prisma);
  },
  addAgreementTemplateToSkipCommitConfirm: async (root, { templateCid }, { user, prisma }) => {
    return prisma.updateUser({
      where: { id: user.cid },
      data: {
        templatesToSkipCommitConfirm: {
          set: [
            ...user.templatesToSkipCommitConfirm,
            templateCid
          ]
        }
      },
    });
  },
  addAgreementTemplateToSkipDoneConfirm: async (root, { templateCid }, { user, prisma }) => {
    return prisma.updateUser({
      where: { id: user.cid },
      data: {
        templatesToSkipMarkAsDone: {
          set: [
            ...user.templatesToSkipMarkAsDone,
            templateCid
          ]
        }
      },
    });
  },
  requestPartnerForAgreement: async (root, { agreementCid, partnerCid }, { user, prisma }) => {
    const partner = await prisma.user({ cid: partnerCid });
    const agreement = await prisma.agreement({ cid: agreementCid });
    await prisma.createConnection({
      cid: shortid.generate(),
      agreementId: agreement.id,
      fromId: user.id,
      fromCid: user.cid,
      fromName: user.name,
      type: 'REQUESTED',
      toId: partner.id,
      toCid: partner.cid,
      toName: partner.name
    });
    return clientAgreementPipe(agreement, user, prisma);
  },
  confirmPartnerRequest: async (root, { connectionCid, agreementCid }, { user, prisma }) => {
    const connection = await prisma.updateConnection({
      where: { id: connectionCid },
      data: {
        type: 'CONFIRMED'
      }
    });
    const agreement = await prisma.agreement({ cid: agreementCid });
    return clientAgreementPipe(agreement, user, prisma);
  },
  denyPartnerRequest: async (root, { connectionCid, agreementCid }, { user, prisma }) => {
    const connection = await prisma.deleteConnection({ cid: connectionCid });
    const agreement = await prisma.agreement({ cid: agreementCid })
    return clientAgreementPipe(agreement, user, prisma);
  },
  removeBrokenPartnership: async (root, { connectionCid, agreementCid }, { user, prisma }) => {
    const connection = await prisma.deleteConnection({ cid: connectionCid });
    const agreement = await prisma.agreement({ cid: agreementCid })
    return clientAgreementPipe(agreement, user, prisma);
  },
  breakAgreement: async (root, { agreementCid }, { user, prisma }) => {
    const { id: userId } = user;
    const agreement = await prisma.agreement({ cid: agreementCid });
    const connectionsTo = await prisma.connections({
      where: {
        toId: userId,
        agreementId: agreement.id
      }
    });
    await prisma.updateManyConnections({
      where: {
        agreementId: agreement.id,
        fromId: userId
      },
      data: {
        type: 'BROKE_WITH'
      }
    });
    await Promise.all(connectionsTo.map(connection => {
      return prisma.updateConnection({
        where: {
          id: connection.id
        },
        data: {
          fromId: user.id,
          fromName: user.name,
          type: 'BROKE_WITH',
          toId: connection.fromId,
          toName: connection.fromName
        }
      });
    }));
    await prisma.createOutcome({
      cid: shortid.generate(),
      agreementId: agreement.id,
      type: 'BROKEN',
      userId,
      signifier: `${agreement.id}-${userId}`
    });
    return clientAgreementPipe(agreement, user, prisma);
  },
  markAgreementAsDone: async (root, { agreementCid }, { user, prisma }) => {
    const { id: userId } = user;
    const agreement = await prisma.agreement({ cid: agreementCid });
    await prisma.createOutcome({
      cid: shortid.generate(),
      agreementId: agreement.id,
      type: 'FULFILLED',
      userId,
      signifier: `${agreement.id}-${userId}`
    });
    return clientAgreementPipe(agreement, user, prisma);
  }
};

const shields: any = {
  ...(Object.keys(userMutationResolvers).reduce((acc, key) => {
    acc[key] = isAuthenticated;
    return acc;
  }, {})),
};

const isAgreementPastPartnerDeadline = rule()(
  async (parent, args, { agreementCid, prisma }: { agreementCid: string, prisma: Prisma }) => {
    const utcTime = TODAY_MILLISECONDS;
    const agreement = await prisma.agreement({ cid: agreementCid });
    return agreement.partnerUpDeadline <= utcTime ? true : 'Agreement is past deadline';
  }
);

export const userMutationShields = {
  ...shields,
  requestPartnerForAgreement: and(isAgreementPastPartnerDeadline, shields.confirmPartnerRequest),
  confirmPartnerRequest: and(isAgreementPastPartnerDeadline, shields.confirmPartnerRequest),
  denyPartnerRequest: and(isAgreementPastPartnerDeadline, shields.confirmPartnerRequest),
  removeBrokenPartnership: and(isAgreementPastPartnerDeadline, shields.confirmPartnerRequest)
};
