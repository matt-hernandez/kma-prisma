import * as shortid from 'shortid';
import Resolvers from '../../utilities/resolvers-type';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export const userMutationSchema = readFileSync(resolve(__dirname, 'mutation.graphql'), 'utf8');

export const userMutationResolvers: Resolvers = {
  commitToAgreement: async (root, { agreementCid }, { user, prisma }) => {
    const agreement = await prisma.agreement({ cid: agreementCid });
    return prisma.updateAgreement({
      where: { cid: agreementCid },
      data: {
        committedUsersIds: {
          set: [
            ...agreement.committedUsersIds,
            user.cid
          ]
        }
      },
    })
  },
  addAgreementTemplateToSkip: (root, { agreementCid }, { user, prisma }) => prisma.updateUser({
    where: { id: user.cid },
    data: { },
  }),
  requestPartnerForAgreement: (root, { agreementCid, partnerCid }, { user, prisma }) => prisma.updateAgreement({
    where: { id: agreementCid },
    data: { },
  }),
  confirmPartnerRequest: (root, { agreementCid, partnerCid }, { user, prisma }) => prisma.updateAgreement({
    where: { id: agreementCid },
    data: { },
  }),
  denyPartnerRequest: (root, { agreementCid, partnerCid }, { user, prisma }) => prisma.updateAgreement({
    where: { id: agreementCid },
    data: { },
  }),
  cancelAgreement: async (root, { agreementCid }, { user, prisma }) => {
    const { id: userId } = user;
    const agreement = await prisma.agreement({ cid: agreementCid });
    return prisma.updateAgreement({
      where: { cid: agreementCid },
      data: {
        committedUsersIds: {
          set: agreement.committedUsersIds.filter(uid => uid !== userId)
        }
      },
    })
  },
  breakAgreement: async (root, { agreementCid }, { user, prisma }) => {
    const { id: userId } = user;
    const agreement = await prisma.agreement({ cid: agreementCid });
    const connectionsTo = await prisma.connections({
      where: {
        toId: userId,
        id_in: agreement.connectionsIds
      }
    });
    await prisma.updateManyConnections({
      where: {
        id_in: agreement.connectionsIds,
        fromId: userId
      },
      data: {
        type: 'BROKE_WITH'
      }
    });
    await Promise.all(connectionsTo.map(async connection => {
      await prisma.updateConnection({
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
    const outcome = await prisma.createOutcome({
      agreementId: agreement.id,
      type: 'BROKEN',
      userId: user.id
    });
    await prisma.updateAgreement({
      where: {
        id: agreement.id
      },
      data: {
        outcomesIds: {
          set: [
            ...agreement.outcomesIds,
            outcome.id
          ]
        }
      }
    })
    return {
      ...agreement,
      isCommitted: true,
      wasCompleted: false
    }
  }
};
