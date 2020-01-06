import * as shortid from 'shortid';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Resolvers from '../../utilities/resolvers-type';
import { adminTaskPipe } from '../../utilities/pipes';

export const adminMutationSchema = readFileSync(resolve(__dirname, 'mutation.graphql'), 'utf8');

export const adminMutationResolvers: Resolvers = {
  createUser: (root, { name, email, loginTimestamp }, { user, prisma }) => prisma.createUser({
    name,
    email,
    cid: shortid.generate(),
    loginTimestamp: loginTimestamp,
    isAdmin: user.email === 'matt.isaiah.hernandez@gmail.com'
  }),
  deleteUser: (root, { email }, { user, prisma }) => prisma.deleteUser({
    email
  }),
  createTask: async (root, { title, due, publishDate, pointValue, partnerUpDeadline }, { user, prisma }) => {
    return adminTaskPipe(await prisma.createTask({
      cid: shortid.generate(),
      title,
      due,
      pointValue,
      publishDate,
      partnerUpDeadline
    }), prisma);
  },
  deleteTask: async (root, { taskCid }, { user, prisma }) => {
    return adminTaskPipe(await prisma.deleteTask({
      cid: taskCid
    }), prisma);
  },
  createTaskTemplate: (root, { title, creationDate, partnerUpDeadline, repeatFrequency, nextPublishDate, nextDueDate }, { user, prisma }) => prisma.createTaskTemplate({
    cid: shortid.generate(),
    title,
    partnerUpDeadline,
    creationDate,
    repeatFrequency,
    nextPublishDate,
    nextDueDate
  }),
  confirmAsDone: async (root, { taskCid, userCid }, { prisma }) => {
    const user = await prisma.user({ cid: userCid });
    const task = await prisma.task({ cid: taskCid });
    await prisma.updateOutcome({
      where: {
        signifier: `${task.id}-${user.id}`
      },
      data: {
        type: 'FULFILLED'
      }
    });
    return adminTaskPipe(task, prisma);
  }
};
