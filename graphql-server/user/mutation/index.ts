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
    const connection = await prisma.createConnection({
      cid: shortid.generate(),
      agreementId: agreement.id,
      fromId: user.id,
      fromName: user.name,
      type: 'REQUESTED',
      toId: partner.id,
      toName: partner.name
    });
    return prisma.updateAgreement({
      where: { id: agreement.id },
      data: {
        connectionsIds: {
          set: [
            ...agreement.connectionsIds,
            connection.id
          ]
        }
      }
    })
  },
  confirmPartnerRequest: async (root, { connectionCid }, { user, prisma }) => {
    const connection = await prisma.updateConnection({
      where: { id: connectionCid },
      data: {
        type: 'CONFIRMED'
      }
    });
    return prisma.agreement({ id: connection.agreementId });
  },
  denyPartnerRequest: async (root, { connectionCid }, { user, prisma }) => {
    const connection = await prisma.deleteConnection({ cid: connectionCid });
    const agreement = await prisma.agreement({ id: connection.agreementId })
    return prisma.updateAgreement({
      where: { id: agreement.id },
      data: {
        connectionsIds: {
          set: agreement.connectionsIds.filter(connId => connId !== connection.id)
        }
      }
    })
  },
  cancelAgreement: async (root, { agreementCid }, { user, prisma }) => {
    const { id: userId } = user;
    const agreement = await prisma.agreement({ cid: agreementCid });
    const connections = await prisma.connections({
      where: {
        OR: [
          {
            toId: userId
          },
          {
            fromId: userId
          }
        ],
        agreementId: agreement.id
      }
    });
    const connectionsIds = connections.map(({id}) => id);
    await prisma.deleteManyConnections({
      id_in: connectionsIds
    });
    return prisma.updateAgreement({
      where: { cid: agreementCid },
      data: {
        committedUsersIds: {
          set: agreement.committedUsersIds.filter(uid => uid !== userId)
        },
        connectionsIds: {
          set: agreement.connectionsIds.filter(connId => !connectionsIds.includes(connId))
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
    return prisma.updateAgreement({
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
    });
  }
};
