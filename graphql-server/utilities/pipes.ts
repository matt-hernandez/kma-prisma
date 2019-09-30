export const userToClientPossiblePartnersPipe = (user) => {
  return {
    cid: user.cid,
    name: user.name
  };
};

export const clientAgreementPipe = (agreement, user, prisma) => {
  return {

  };
};

export const clientConnectionPipe = (connection, user, prisma) => {
  return {

  };
};
