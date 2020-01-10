import { readFileSync } from 'fs';
import { resolve } from 'path';
import Resolvers from '../../utilities/resolvers-type';
import { adminTaskPipe } from '../../utilities/pipes';
import { TODAY_MILLISECONDS } from '../../utilities/date';

export const adminQuerySchema = readFileSync(resolve(__dirname, 'query.graphql'), 'utf8');

export const adminQueryResolvers: Resolvers = {
  users: (root, args, { prisma }) => prisma.users(),
  currentTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    const utcTime = TODAY_MILLISECONDS;
    tasks = tasks.filter(task => task.due > utcTime);
    tasks.sort((d1, d2) => {
      return d1.due - d2.due;
    });
    return tasks.map(task => adminTaskPipe(task, prisma));
  },
  pastTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    const utcTime = TODAY_MILLISECONDS;
    tasks = tasks.filter(task => task.due <= utcTime);
    tasks.sort((d1, d2) => {
      return d1.due - d2.due;
    });
    return tasks.map(task => adminTaskPipe(task, prisma));
  },
  upcomingTasks: async (root, args, { user, prisma }) => {
    let tasks = await prisma.tasks();
    const utcTime = TODAY_MILLISECONDS;
    tasks = tasks.filter(task => task.publishDate > utcTime);
    tasks.sort((d1, d2) => {
      return d1.due - d2.due;
    });
    return tasks.map(task => adminTaskPipe(task, prisma));
  },
}
