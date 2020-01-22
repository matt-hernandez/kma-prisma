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
  makeUserInactive: (root, { cid }, { user, prisma }) => prisma.updateUser({
    where: {
      cid
    },
    data: {
      isActive: false
    }
  }),
  makeUserActive: (root, { cid }, { user, prisma }) => prisma.updateUser({
    where: {
      cid
    },
    data: {
      isActive: true
    }
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
  deleteTask: async (root, { cid }, { user, prisma }) => {
    return adminTaskPipe(await prisma.deleteTask({
      cid
    }), prisma);
  },
  createTaskTemplate: async (root, { taskCid, repeatFrequency }, { prisma }) => {
    const { title, due, partnerUpDeadline, description, pointValue } = await prisma.task({ cid: taskCid });
    const dueDate = new Date(due);
    const ONE_DAY_MILLISECONDS = 3600000 * 24;
    let nextDueDate: Date;
    if (repeatFrequency === 'DAY') {
      nextDueDate = new Date(dueDate.getTime() + ONE_DAY_MILLISECONDS);
    } else if (repeatFrequency === 'WEEK') {
      nextDueDate = new Date(dueDate.getTime() + ONE_DAY_MILLISECONDS * 7);
    } else if (repeatFrequency === 'MONTH') {
      const utcMonth = dueDate.getUTCMonth();
      nextDueDate = new Date(due);
      nextDueDate.setUTCMonth(utcMonth + 1);
    } else if (repeatFrequency === 'END_OF_MONTH') {
      const utcMonth = dueDate.getUTCMonth();
      nextDueDate = new Date(due);
      nextDueDate.setUTCMonth(utcMonth + 2);
      nextDueDate.setUTCDate(-1);
    }
    let nextPublishDate = new Date(due);
    nextPublishDate.setUTCDate(dueDate.getUTCDate() + 1);
    nextPublishDate.setUTCHours(0);
    nextPublishDate.setUTCMinutes(0);
    nextPublishDate.setUTCSeconds(0);
    nextPublishDate.setUTCMilliseconds(0);
    return prisma.createTaskTemplate({
      cid: shortid.generate(),
      title,
      description,
      pointValue,
      partnerUpDeadline,
      repeatFrequency,
      publishDate: nextPublishDate.getTime(),
      due: nextDueDate.getTime()
    });
  },
  updateTaskTemplate: (root, { cid, title, due, publishDate, partnerUpDeadline, repeatFrequency, description, pointValue }, { prisma }) => prisma.updateTaskTemplate({
    where: {
      cid
    },
    data: {
      title,
      description,
      pointValue,
      partnerUpDeadline,
      repeatFrequency,
      publishDate,
      due
    }
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
