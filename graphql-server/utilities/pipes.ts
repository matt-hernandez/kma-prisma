import { Connection, User, Agreement, Outcome, Prisma } from "../../generated/prisma-client";

type ConnectionType = 'REQUEST_TO' | 'REQUEST_FROM' | 'CONFIRMED' | 'BROKE_WITH';

interface ConnectionForClient {
  cid: String
  connectedUserCid: String
  connectedUserName: String
  type: ConnectionType
}

interface AgreementForClient {
  cid: String
  templateCid?: String
  title: String
  due: Number
  partnerUpDeadline: Number
  description?: String
  isCommitted: Boolean
  connections: [ConnectionForClient]
  wasCompleted: Boolean | null
}

export const userToClientPossiblePartnersPipe = (user: User) => {
  return {
    cid: user.cid,
    name: user.name
  };
};

export const clientAgreementPipe = async (agreement: Agreement, user: User, prisma: Prisma): Promise<AgreementForClient> => {
  const connections: Connection[] = await prisma.connections({ where: { agreementId: agreement.id } });
  const outcome: Outcome = await prisma.outcome({ signifier: `${agreement.id}-${user.id}` });
  const copy: any = {
    ...agreement
  };
  copy.isCommitted = agreement.committedUsersIds.includes(user.id);
  copy.connections = connections
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
  copy.wasCompleted = outcome.type === 'BROKEN' ? false
    : outcome.type === 'FULFILLED'
    ? true
    : null;
  delete copy.id;
  delete copy.templateId;
  delete copy.publishDate;
  delete copy.committedUsersIds;
  delete copy.connectionsIds;
  delete copy.outcomesIds;
  return copy;
};
