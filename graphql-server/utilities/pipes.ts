import { Connection, User, Task, Outcome, Prisma, OutcomeType } from "../../generated/prisma-client";

type ConnectionType = 'REQUEST_TO' | 'REQUEST_FROM' | 'CONFIRMED' | 'BROKE_WITH';

type ClientOutcomeType = OutcomeType | 'NO_OUTCOME';

interface ConnectionForClient {
  cid: string
  connectedUserCid: string
  connectedUserName: string
  type: ConnectionType
}

interface TaskForClient {
  cid: string;
  templateCid?: string;
  title: string;
  due: number;
  partnerUpDeadline: number;
  description?: string;
  isCommitted: boolean;
  hasOthers: boolean;
  connections: ConnectionForClient[];
  outcomeType: ClientOutcomeType;
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

interface ScoreDetails {
  score: number;
  tasksDoneWithAPartner: number;
  tasksDoneAlone: number;
}

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
  taskForClient.outcomeType = outcome ? outcome.type : 'NO_OUTCOME';
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

export const userScorePipe = async (user: User, prisma: Prisma): Promise<ScoreDetails> => {
  const positiveOutcomes = await prisma.outcomes({
    where: {
      userId: user.id,
      type: 'FULFILLED'
    }
  });
  const completedTasks = await prisma.tasks({
    where: {
      id_in: positiveOutcomes.map(({ taskId }) => taskId)
    }
  });
  const connectionsWithAPartner = await prisma.connections({
    where: {
      taskId_in: completedTasks.map(({ id }) => id),
      type_in: ['CONFIRMED', 'BROKE_WITH'],
      OR: [
        {
          fromId: user.id
        },
        {
          toId: user.id
        }
      ]
    }
  });
  const partnerIds = connectionsWithAPartner.reduce((acc, { fromId, toId }) => acc.concat([ fromId, toId ]), [])
    .filter(id => id !== user.id);
  const positiveOutcomesWithPartners = (await prisma.outcomes({
    where: {
      userId_in: partnerIds,
      type_in: ['FULFILLED', 'BROKEN_OMIT_PARTNER']
    }
  })).filter(({ taskId, userId }) => {
    const correspondingConnection = connectionsWithAPartner.find(({ fromId, toId, taskId: connectionTaskId }) => taskId === connectionTaskId && (userId === fromId || userId === toId));
    return !!correspondingConnection;
  });
  const tasksDoneAlone = completedTasks.filter(({ id }) => {
    const positiveOutcomesWithPartnersForTask = positiveOutcomesWithPartners.filter(({ taskId }) => id === taskId);
    return positiveOutcomesWithPartnersForTask.length === 0;
  }).length;
  const tasksDoneWithAPartner = completedTasks.filter(({ id }) => {
    const positiveOutcomesWithPartnersForTask = positiveOutcomesWithPartners.filter(({ taskId }) => id === taskId);
    return positiveOutcomesWithPartnersForTask.length > 0;
  }).length;
  const scoreForSolo = completedTasks.reduce((acc, { pointValue }) => acc + pointValue, 0);
  const scoreWithPartners = completedTasks.reduce((acc, { pointValue, id }) => {
    const positiveOutcomesWithPartnersForTask = positiveOutcomesWithPartners.filter(({ taskId }) => id === taskId);
    return acc + pointValue * positiveOutcomesWithPartnersForTask.length;
  }, 0);
  return {
    score: scoreForSolo + scoreWithPartners,
    tasksDoneWithAPartner,
    tasksDoneAlone
  };
}
