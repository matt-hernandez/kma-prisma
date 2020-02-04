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
    loginTimestamp: loginTimestamp
  }),
  makeUserInactive: (root, { cid }, { user, prisma }) => {
    if (user.cid === cid) {
      throw new Error('Cannot change active status of yourself!');
    }
    return prisma.updateUser({
      where: {
        cid
      },
      data: {
        isActive: false
      }
    })
  },
  makeUserActive: (root, { cid }, { user, prisma }) => {
    if (user.cid === cid) {
      throw new Error('Cannot change active status of yourself!');
    }
    return prisma.updateUser({
      where: {
        cid
      },
      data: {
        isActive: true
      }
    })
  },
  makeUserAnAdmin: (root, { cid }, { user, prisma }) => {
    if (user.cid === cid) {
      throw new Error('Cannot change admin status of yourself!');
    }
    return prisma.updateUser({
      where: {
        cid
      },
      data: {
        accessRights: 'ADMIN'
      }
    })
  },
  removeUserAsAdmin: (root, { cid }, { user, prisma }) => {
    if (user.cid === cid) {
      throw new Error('Cannot change admin status of yourself!');
    }
    return prisma.updateUser({
      where: {
        cid
      },
      data: {
        accessRights: 'USER'
      }
    })
  },
  changeTaskStatusForUser: async (root, { outcomeCid, outcomeType }, { user: self, prisma }) => {
    const outcome = await prisma.updateOutcome({
      where: {
        cid: outcomeCid
      },
      data: {
        type: outcomeType
      }
    });
    const user = await prisma.user({ id: outcome.userId });
    if (user.cid === self.cid) {
      throw new Error('Cannot change the status of your own tasks!');
    }
    const task = await prisma.task({ id: outcome.taskId });
    if (outcomeType.indexOf('BROKEN') > -1) {
      const connectionsTo = await prisma.connections({
        where: {
          toId: user.id,
          taskId: task.id
        }
      });
      await prisma.updateManyConnections({
        where: {
          taskId: task.id,
          fromId: user.id
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
    } else {
      await prisma.updateManyConnections({
        where: {
          taskId: task.id,
          OR: [
            {
              fromId: user.id
            },
            {
              toId: user.id
            }
          ]
        },
        data: {
          type: 'CONFIRMED'
        }
      });
    }
    return adminTaskPipe(task, prisma);
  },
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
  confirmAsDone: async (root, { taskCid, userCid }, { user: self, prisma }) => {
    const user = await prisma.user({ cid: userCid });
    if (user.cid === self.cid) {
      throw new Error('Cannot confirm your own agreement!');
    }
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
  },
  denyAsDone: async (root, { taskCid, userCid }, { user: self, prisma }) => {
    const user = await prisma.user({ cid: userCid });
    if (user.cid === self.cid) {
      throw new Error('Cannot confirm your own agreement!');
    }
    const task = await prisma.task({ cid: taskCid });
    await prisma.updateOutcome({
      where: {
        signifier: `${task.id}-${user.id}`
      },
      data: {
        type: 'BROKEN'
      }
    });
    return adminTaskPipe(task, prisma);
  }
};
