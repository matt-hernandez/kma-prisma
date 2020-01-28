import * as shortid from 'shortid';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Resolvers from '../../utilities/resolvers-type';
import { clientTaskPipe, userPipe } from '../../utilities/pipes';
import { createTaskShield } from '../../utilities/shield-rules';

export const userMutationSchema = readFileSync(resolve(__dirname, 'mutation.graphql'), 'utf8');

export const userMutationResolvers: Resolvers = {
  commitToTask: [async (root, { taskCid }, { user, prisma }) => {
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
  }, [ createTaskShield('commitToTask') ]],
  addTaskTemplateToSkipCommitConfirm: async (root, { templateCid }, { user, prisma }) => {
    return userPipe(await prisma.updateUser({
      where: { id: user.id },
      data: {
        templatesToSkipCommitConfirm: {
          set: [
            ...user.templatesToSkipCommitConfirm,
            templateCid
          ]
        }
      },
    }), prisma);
  },
  addTaskTemplateToSkipDoneConfirm: async (root, { templateCid }, { user, prisma }) => {
    return userPipe(await prisma.updateUser({
      where: { id: user.id },
      data: {
        templatesToSkipMarkAsDone: {
          set: [
            ...user.templatesToSkipMarkAsDone,
            templateCid
          ]
        }
      },
    }), prisma);
  },
  requestPartnerForTask: [async (root, { taskCid, partnerCid }, { user, prisma }) => {
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
  }, [ createTaskShield('requestPartnerForTask') ]],
  confirmPartnerRequest: [async (root, { connectionCid, taskCid }, { user, prisma }) => {
    await prisma.updateConnection({
      where: { id: connectionCid },
      data: {
        type: 'CONFIRMED'
      }
    });
    const task = await prisma.task({ cid: taskCid });
    return clientTaskPipe(task, user, prisma);
  }, [ createTaskShield('confirmPartnerRequest') ]],
  cancelPartnerRequest: [async (root, { connectionCid, taskCid }, { user, prisma }) => {
    await prisma.deleteConnection({ cid: connectionCid });
    const task = await prisma.task({ cid: taskCid });
    return clientTaskPipe(task, user, prisma);
  }, [ createTaskShield('cancelPartnerRequest') ]],
  denyPartnerRequest: [async (root, { connectionCid, taskCid }, { user, prisma }) => {
    await prisma.deleteConnection({ cid: connectionCid });
    const task = await prisma.task({ cid: taskCid });
    return clientTaskPipe(task, user, prisma);
  }, [ createTaskShield('denyPartnerRequest') ]],
  removeBrokenPartnership: [async (root, { connectionCid, taskCid }, { user, prisma }) => {
    await prisma.deleteConnection({ cid: connectionCid });
    const task = await prisma.task({ cid: taskCid })
    return clientTaskPipe(task, user, prisma);
  }, [ createTaskShield('removeBrokenPartnership') ]],
  breakAgreement: [async (root, { taskCid }, { user, prisma }) => {
    const { id: userId, cid: userCid } = user;
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
          fromCid: user.cid,
          fromName: user.name,
          type: 'BROKE_WITH',
          toId: connection.fromId,
          toCid: connection.fromCid,
          toName: connection.fromName
        }
      });
    }));
    await prisma.createOutcome({
      cid: shortid.generate(),
      taskId: task.id,
      taskCid: task.cid,
      type: 'BROKEN',
      userId,
      userCid,
      signifier: `${task.id}-${userId}`
    });
    return clientTaskPipe(task, user, prisma);
  }, [ createTaskShield('breakAgreement') ]],
  markTaskAsDone: [async (root, { taskCid }, { user, prisma }) => {
    const { id: userId, cid: userCid } = user;
    const task = await prisma.task({ cid: taskCid });
    await prisma.createOutcome({
      cid: shortid.generate(),
      taskId: task.id,
      taskCid: task.cid,
      type: 'PENDING',
      userId,
      userCid,
      signifier: `${task.id}-${userId}`
    });
    return clientTaskPipe(task, user, prisma);
  }, [ createTaskShield('markTaskAsDone') ]]
};
