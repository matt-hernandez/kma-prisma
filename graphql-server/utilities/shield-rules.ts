import { rule } from 'graphql-shield';
import { Prisma } from '../../generated/prisma-client';
import { TODAY_MILLISECONDS } from './date';

export const isAuthenticated = rule()(
  async (parent, args, { user }) => {
    if (user === 'unauthenticated') {
      return 'User is not authenticated';
    }
    return true;
  }
);

export const isAdmin = rule()(
  async (parent, args, { user }) => {
    const _isAdmin = user.isAdmin || user.email === 'matt.isaiah.hernandez@gmail.com';
    if (!_isAdmin) {
      return 'User is not an admin';
    }
    return true;
  }
);

export const isTaskPastPartnerDeadline = rule()(
  async (parent, { taskCid }, { prisma }: { prisma: Prisma }) => {
    const utcTime = TODAY_MILLISECONDS;
    const task = await prisma.task({ cid: taskCid });
    return utcTime <= task.partnerUpDeadline || 'Task is past deadline';
  }
);
