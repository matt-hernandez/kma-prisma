import Resolvers from '../../utilities/resolvers-type';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { clientTaskPipe } from '../../utilities/pipes';
import { Task, Connection } from '../../../generated/prisma-client';

export const userQuerySchema = readFileSync(resolve(__dirname, 'query.graphql'), 'utf8');

export const userQueryResolvers: Resolvers = {
  me: (root, args, { user, prisma }) => prisma.user({ cid: user.cid }),
  possiblePartnersForTask: async (root, { query, taskCid }, { user, prisma }) => {
    if (query.trim() === '') {
      return [];
    }
    let users = await prisma.users({ where: { name_contains: query } });
    const task = await prisma.task({ cid: taskCid });
    const connections = await prisma.connections({ where: { taskId: task.id } });
    users = users.filter((user) => {
      const userConnectionsTo = connections.filter(({ toId }) => toId === user.id);
      const userConnectionsFrom = connections.filter(({ fromId }) => fromId === user.id);
      return userConnectionsTo.length + userConnectionsFrom.length < 2;
    });
    return users
      .sort(({ name: a }, { name: b }) => {
        const aIndex = a.toLowerCase().indexOf(query.toLowerCase());
        const bIndex = b.toLowerCase().indexOf(query.toLowerCase());
        if (aIndex === bIndex) {
          return a.length - b.length;
        }
        return aIndex - bIndex;
      }).map(({ cid, name }) => ({
        cid,
        name
      }));
  },
  userPool: async (root, { taskCid }, { user, prisma }) => {
    const task = await prisma.task({ cid: taskCid });
    let users = await prisma.users({ where: { id_in: task.committedUsersIds } });
    const connections = await prisma.connections({ where: { taskId: task.id } });
    users = users.filter((user) => {
      const userConnectionsTo = connections.filter(({ toId }) => toId === user.id);
      const userConnectionsFrom = connections.filter(({ fromId }) => fromId === user.id);
      return userConnectionsTo.length + userConnectionsFrom.length < 2;
    });
    return users
      .map(({ cid, name }) => ({
        cid,
        name
      }));
  },
  openTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    tasks = tasks.filter(({ committedUsersIds }) => !committedUsersIds.includes(user.id));
    return Promise.all(tasks.map(task => clientTaskPipe(task, user, prisma)));
  },
  myTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    tasks = tasks.filter(({ committedUsersIds }) => committedUsersIds.includes(user.id));
    const outcomes = await prisma.outcomes({ where: { taskId_in: tasks.map(({id}) => id) } });
    tasks = tasks.filter(task => {
      return !outcomes.some(outcome => outcome.taskId === task.id && outcome.userId === user.id);
    });
    return Promise.all(tasks.map(task => clientTaskPipe(task, user, prisma)));
  },
  requestedPartnerTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    tasks = tasks.filter(({ committedUsersIds }) => !committedUsersIds.includes(user.id));
    const connections = await prisma.connections({ where: { taskId_in: tasks.map(({id}) => id) } });
    tasks = tasks.filter(task => {
      const connectionsForTask = connections.filter(connection => connection.taskId === task.id);
      return connectionsForTask.every(connection => connection.fromId !== user.id);
    });
    return Promise.all(tasks.map(task => clientTaskPipe(task, user, prisma)));
  },
  myPastTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    tasks = tasks.filter(({ committedUsersIds }) => committedUsersIds.includes(user.id));
    const outcomes = await prisma.outcomes({ where: { taskId_in: tasks.map(({id}) => id) } });
    tasks = tasks.filter(task => {
      return outcomes.some(outcome => outcome.taskId === task.id && outcome.userId === user.id);
    });
    return Promise.all(tasks.map(task => clientTaskPipe(task, user, prisma)));
  },
}
