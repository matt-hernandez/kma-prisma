import { Connection, User, Task, Outcome, Prisma } from "../../generated/prisma-client";

type ConnectionType = 'REQUEST_TO' | 'REQUEST_FROM' | 'CONFIRMED' | 'BROKE_WITH';

interface ConnectionForClient {
  cid: string
  connectedUserCid: string
  connectedUserName: string
  type: ConnectionType
}

interface TaskForClient {
  cid: string
  templateCid?: string
  title: string
  due: number
  partnerUpDeadline: number
  description?: string
  isCommitted: boolean
  hasOthers: boolean;
  connections: ConnectionForClient[]
  wasCompleted: boolean | null
}

interface TaskForAdmin {
  cid: string
  templateCid?: string
  title: string
  due: number
  publishDate: number
  partnerUpDeadline: number
  description?: string
  committedUsers: User[]
  connections: Connection[]
  outcomes: Outcome[]
}

interface TemplateSummary {
  title: string;
  cid: string;
}

type UserPiped = Omit<User, 'templatesToSkipCommitConfirm' | 'templatesToSkipMarkAsDone'> & { templatesToSkipCommitConfirm: TemplateSummary[], templatesToSkipMarkAsDone: TemplateSummary[] };

export const userToClientPossiblePartnerPipe = (user: User) => {
  return {
    cid: user.cid,
    name: user.name
  };
};

export const clientTaskPipe = async (task: Task, user: User, prisma: Prisma): Promise<TaskForClient> => {
  const committedUsersIds = task.committedUsersIds;
  const connections: Connection[] = await prisma.connections({ where: { taskId: task.id } });
  const outcome: Outcome = await prisma.outcome({ signifier: `${task.id}-${user.id}` });
  const copy: any = {
    ...task
  };
  const taskForClient = copy as TaskForClient;
  taskForClient.isCommitted = committedUsersIds.includes(user.id);
  taskForClient.hasOthers = committedUsersIds.length > 2;
  taskForClient.connections = connections
    .filter(({ fromId, toId }) => fromId === user.id || toId === user.id)
    .map(({ fromId, fromCid, toCid, toName, type, fromName, cid }): ConnectionForClient => ({
      cid,
      connectedUserCid: fromId === user.id ? toCid : fromCid,
      connectedUserName: fromId === user.id ? toName : fromName,
      type: type !== 'REQUESTED' ? type
        : fromId === user.id
        ? 'REQUEST_TO'
        : 'REQUEST_FROM'
    }));
  taskForClient.wasCompleted = outcome === null ? null
    : outcome.type === 'BROKEN' ? false
    : outcome.type === 'FULFILLED' ? true
    : null;
  return taskForClient;
};

export const adminTaskPipe = async (task: Task, prisma: Prisma): Promise<TaskForAdmin> => {
  const users: User[] = await prisma.users({ where: { id_in: task.committedUsersIds } });
  const connections: Connection[] = await prisma.connections({ where: { taskId: task.id } });
  const outcomes: Outcome[] = await prisma.outcomes({ where: { taskId: task.id } });
  const copy: any = {
    ...task
  };
  const taskForClient = copy as TaskForAdmin;
  taskForClient.committedUsers = users;
  taskForClient.connections = connections;
  taskForClient.outcomes = outcomes;
  return taskForClient;
};

export const userPipe = async (user: User, prisma: Prisma): Promise<UserPiped> => {
  const templatesToSkipCommitConfirm = (await prisma.taskTemplates({
    where: {
      cid_in: user.templatesToSkipCommitConfirm
    }
  })).map(({ cid, title }) => {
    return {
      cid,
      title
    };
  });
  const templatesToSkipMarkAsDone = (await prisma.taskTemplates({
      where: {
        cid_in: user.templatesToSkipMarkAsDone
      }
    })).map(({ cid, title }) => {
    return {
      cid,
      title
    };
  });
  return {
    ...user,
    templatesToSkipCommitConfirm,
    templatesToSkipMarkAsDone
  };
};
