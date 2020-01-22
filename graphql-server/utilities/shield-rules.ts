import { rule } from 'graphql-shield';
import { Prisma } from '../../generated/prisma-client';
import { TODAY_MILLISECONDS, getPartnerUpDeadlineEpochFromDue } from './date';

export const isAuthenticated = rule()(
  async (parent, args, { user }) => {
    if (user === 'unauthenticated') {
      return 'User is not authenticated';
    }
    return true;
  }
);

export const isActive = rule()(
  async (parent, args, { user }) => {
    return user.isActive;
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

type TaskOperation = 'commitToTask' | 'requestPartnerForTask' | 'confirmPartnerRequest' |
  'denyPartnerRequest' | 'removeBrokenPartnership' | 'breakAgreement' | 'markTaskAsDone' |
  'cancelPartnerRequest';

export const createTaskShield = (operation: TaskOperation) => {
  return rule()(
    async (parent, { taskCid }, { prisma }: { prisma: Prisma }) => {
      const task = await prisma.task({ cid: taskCid });
      const utcTime = TODAY_MILLISECONDS;
      const taskErrorMessage = 'Task is past deadline';
      if (['commitToTask', 'requestPartnerForTask', 'confirmPartnerRequest',
        'denyPartnerRequest', 'removeBrokenPartnership'].includes(operation)) {
        return utcTime <= getPartnerUpDeadlineEpochFromDue(task.due, task.partnerUpDeadline) || taskErrorMessage;
      } else if (['breakAgreement', 'markTaskAsDone'].includes(operation)) {
        const TWO_DAYS = 1000 * 60 * 60 * 24 * 2;
        return utcTime <= task.due + TWO_DAYS || taskErrorMessage;
      }
      return true;
    }
  );
};
