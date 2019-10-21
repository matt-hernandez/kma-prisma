import * as shortid from 'shortid';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { and, rule } from 'graphql-shield';
import Resolvers from '../../utilities/resolvers-type';
import { clientTaskPipe } from '../../utilities/pipes';
import { isAuthenticated, isAdmin } from '../../utilities/shield-rules';
import { Prisma } from '../../../generated/prisma-client';
import { TODAY_MILLISECONDS } from '../../utilities/date';

export const userMutationSchema = readFileSync(resolve(__dirname, 'mutation.graphql'), 'utf8');

export const userMutationResolvers: Resolvers = {
  commitToTask: async (root, { taskCid }, { user, prisma }) => {
    let task = await prisma.task({ cid: taskCid });
    task = await prisma.updateTask({
      where: { cid: taskCid },
      data: {
        committedUsersIds: {
          set: [
            ...task.committedUsersIds,
            user.id
          ]
        }
      },
    });
    return clientTaskPipe(task, user, prisma);
  },
  addTaskTemplateToSkipCommitConfirm: async (root, { templateCid }, { user, prisma }) => {
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
  addTaskTemplateToSkipDoneConfirm: async (root, { templateCid }, { user, prisma }) => {
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
  requestPartnerForTask: async (root, { taskCid, partnerCid }, { user, prisma }) => {
    const partner = await prisma.user({ cid: partnerCid });
    const task = await prisma.task({ cid: taskCid });
    await prisma.createConnection({
      cid: shortid.generate(),
      taskId: task.id,
      fromId: user.id,
      fromCid: user.cid,
      fromName: user.name,
      type: 'REQUESTED',
      toId: partner.id,
      toCid: partner.cid,
      toName: partner.name
    });
    return clientTaskPipe(task, user, prisma);
  },
  confirmPartnerRequest: async (root, { connectionCid, taskCid }, { user, prisma }) => {
    const connection = await prisma.updateConnection({
      where: { id: connectionCid },
      data: {
        type: 'CONFIRMED'
      }
    });
    const task = await prisma.task({ cid: taskCid });
    return clientTaskPipe(task, user, prisma);
  },
  denyPartnerRequest: async (root, { connectionCid, taskCid }, { user, prisma }) => {
    const connection = await prisma.deleteConnection({ cid: connectionCid });
    const task = await prisma.task({ cid: taskCid })
    return clientTaskPipe(task, user, prisma);
  },
  removeBrokenPartnership: async (root, { connectionCid, taskCid }, { user, prisma }) => {
    const connection = await prisma.deleteConnection({ cid: connectionCid });
    const task = await prisma.task({ cid: taskCid })
    return clientTaskPipe(task, user, prisma);
  },
  breakAgreement: async (root, { taskCid }, { user, prisma }) => {
    const { id: userId } = user;
    const task = await prisma.task({ cid: taskCid });
    await prisma.deleteManyConnections({ // delete any incoming or outgoing requests
      taskId: task.id,
      type: 'REQUESTED',
      OR: [
        {
          fromId: userId
        },
        {
          toId: userId
        }
      ]
    });
    const connectionsTo = await prisma.connections({
      where: {
        toId: userId,
        taskId: task.id,
        type: 'CONFIRMED'
      }
    });
    await prisma.updateManyConnections({
      where: {
        taskId: task.id,
        fromId: userId,
        type: 'CONFIRMED'
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
      taskId: task.id,
      type: 'BROKEN',
      userId,
      signifier: `${task.id}-${userId}`
    });
    return clientTaskPipe(task, user, prisma);
  },
  markTaskAsDone: async (root, { taskCid }, { user, prisma }) => {
    const { id: userId } = user;
    const task = await prisma.task({ cid: taskCid });
    await prisma.createOutcome({
      cid: shortid.generate(),
      taskId: task.id,
      type: 'FULFILLED',
      userId,
      signifier: `${task.id}-${userId}`
    });
    return clientTaskPipe(task, user, prisma);
  }
};

const shields: any = {
  ...(Object.keys(userMutationResolvers).reduce((acc, key) => {
    acc[key] = isAuthenticated;
    return acc;
  }, {})),
};

const isTaskPastPartnerDeadline = rule()(
  async (parent, args, { taskCid, prisma }: { taskCid: string, prisma: Prisma }) => {
    const utcTime = TODAY_MILLISECONDS;
    const task = await prisma.task({ cid: taskCid });
    return task.partnerUpDeadline <= utcTime ? true : 'Task is past deadline';
  }
);

export const userMutationShields = {
  ...shields,
  requestPartnerForTask: and(isTaskPastPartnerDeadline, shields.confirmPartnerRequest),
  confirmPartnerRequest: and(isTaskPastPartnerDeadline, shields.confirmPartnerRequest),
  denyPartnerRequest: and(isTaskPastPartnerDeadline, shields.confirmPartnerRequest),
  removeBrokenPartnership: and(isTaskPastPartnerDeadline, shields.confirmPartnerRequest)
};
