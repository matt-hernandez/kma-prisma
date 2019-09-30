import { prisma, Prisma } from './generated/prisma-client';
import { GraphQLServer } from 'graphql-yoga';
import * as cookieParser from 'cookie-parser';
import * as shortid from 'shortid';
import * as jwt from 'jsonwebtoken';
const { rule, shield, and } = require('graphql-shield');

const resolvers = {
  Query: {
    me: (root, args, { user, prisma }) => prisma.user({ email: user.email }),
    possiblePartnersForAgreement: (root, { name }, { user, prisma }) => prisma.users({ where: { name_contains: name } }),
    openAgreements: (root, args, { user, prisma }) => prisma.agreements(),
    myAgreements: (root, args, { user, prisma }) => prisma.agreements(),
    requestedPartnerAgreements: (root, args, { user, prisma }) => prisma.agreements(),
    myPastAgreements: (root, args, { user, prisma }) => prisma.agreements(),
    allCurrentAgreements: (root, args, { user, prisma }) => prisma.agreements(),
    allPastAgreements: (root, args, { user, prisma }) => prisma.agreements(),
    allUpcomingAgreements: (root, args, { user, prisma }) => prisma.agreements()
  },
  Mutation: {
    createUser: (root, { name, email, loginTimestamp }, { user, prisma }) => prisma.createUser({
      name,
      email,
      cid: shortid.generate(),
      loginTimestamp: loginTimestamp,
      isAdmin: user.email === 'matt.isaiah.hernandez@gmail.com'
    }),
    deleteUser: (root, { email }, { user, prisma }) => prisma.deleteUser({
      email
    }),
    commitToAgreement: async (root, { agreementCid }, { user, prisma }) => {
      const agreement = await prisma.agreement({ cid: agreementCid });
      return prisma.updateAgreement({
        where: { cid: agreementCid },
        data: {
          committedUsers: {
            set: [
              ...agreement.committedUsers,
              user.cid
            ]
          }
        },
      })
    },
    addAgreementTemplateToSkip: (root, { agreementCid }, { user, prisma }) => prisma.updateUser({
      where: { id: user.cid },
      data: { published: true },
    }),
    requestPartnerForAgreement: (root, { agreementCid, partnerCid }, { user, prisma }) => prisma.updateAgreement({
      where: { id: agreementCid },
      data: { published: true },
    }),
    confirmPartnerRequest: (root, { agreementCid, partnerCid }, { user, prisma }) => prisma.updateAgreement({
      where: { id: agreementCid },
      data: { published: true },
    }),
    denyPartnerRequest: (root, { agreementCid, partnerCid }, { user, prisma }) => prisma.updateAgreement({
      where: { id: agreementCid },
      data: { published: true },
    }),
    cancelAgreement: async (root, { agreementCid }, { user, prisma }: { user: any, prisma: Prisma }) => {
      const { id: userId } = user;
      const agreement = await prisma.agreement({ cid: agreementCid });
      return prisma.updateAgreement({
        where: { cid: agreementCid },
        data: {
          committedUsersIds: {
            set: agreement.committedUsersIds.filter(uid => uid !== userId)
          }
        },
      })
    },
    breakAgreement: async (root, { agreementCid }, { user, prisma }: { user: any, prisma: Prisma }) => {
      const { id: userId } = user;
      const agreement = await prisma.agreement({ cid: agreementCid });
      const connectionsTo = await prisma.connections({
        where: {
          toId: userId,
          id_in: agreement.connectionsIds
        }
      });
      await prisma.updateManyConnections({
        where: {
          id_in: agreement.connectionsIds,
          fromId: userId
        },
        data: {
          type: 'BROKE_WITH'
        }
      });
      await Promise.all(connectionsTo.map(async connection => {
        await prisma.updateConnection({
          where: {
            id: connection.id
          },
          data: {
            fromId: user.id,
            fromName: user.name,
            type: 'BROKE_WITH',
            toId: connection.fromId,
            toName: connection.fromName
          }
        });
      }));
      const outcome = await prisma.createOutcome({
        agreementId: agreement.id,
        type: 'BROKEN',
        userId: user.id
      });
      await prisma.updateAgreement({
        where: {
          id: agreement.id
        },
        data: {
          outcomesIds: {
            set: [
              ...agreement.outcomesIds,
              outcome.id
            ]
          }
        }
      })
      return {
        ...agreement,
        isCommitted: true,
        wasCompleted: false
      }
    },
    createAgreement: (root, { title, due, publishDate, partnerUpDeadline }, { user, prisma }) => prisma.createAgreement({
      cid: shortid.generate(),
      title,
      due,
      publishDate,
      partnerUpDeadline
    }),
    deleteAgreement: (root, { agreementCid }, { user, prisma }) => prisma.deleteAgreement({
      cid: agreementCid
    }),
    createAgreementTemplate: (root, { title, due, partnerUpDeadline, repeatFrequency, nextPublishDate, nextDueDate }, { user, prisma }) => prisma.createAgreementTemplate({
      title,
      due,
      partnerUpDeadline,
      repeatFrequency,
      nextPublishDate,
      nextDueDate
    })
  }
}

function getUser({request}) {
  let auth = request.get('Authorization');
  let cookieToken = request.cookies && request.cookies.lkma__at;
  const token = (auth && auth.replace('Bearer ', '')) || cookieToken;
  if (!token) {
    return 'unauthenticated';
  }
  try {
    const user = jwt.verify(token, 'specialOrder937');
    return user;
  } catch(e) {
    return 'unauthenticated';
  }
}

const isAuthenticated = rule()(
  async (parent, args, { user }) => {
    return user !== 'unauthenticated';
  },
);

const isAdmin = rule()(
  async (parent, args, { user, prisma }) => {
    return user.isAdmin;
  },
);

const getUserFromDb = async (resolve, root, args, context, info) => {
  const user = await prisma.user({ email: context.user.email });
  context.user = user || context.user;
  const result = await resolve(root, args, context, info);
  return result;
}

const permissions = shield({
  Query: {
    me: isAuthenticated,
    possiblePartnersForAgreement: isAuthenticated,
    openAgreements: isAuthenticated,
    myAgreements: isAuthenticated,
    requestedPartnerAgreements: isAuthenticated,
    myPastAgreements: isAuthenticated,
    allCurrentAgreements: and(isAuthenticated, isAdmin),
    allPastAgreements: and(isAuthenticated, isAdmin),
    allUpcomingAgreements: and(isAuthenticated, isAdmin)
  },
  Mutation: {
    createUser: isAuthenticated,
    deleteUser: and(isAuthenticated, isAdmin),
    createAgreement: and(isAuthenticated, isAdmin)
  }
});

const server = new GraphQLServer({
  typeDefs: './schema.graphql',
  resolvers,
  middlewares: [getUserFromDb, permissions],
  context: req => ({
    prisma,
    user: getUser(req)
  }),
});
server.express.use(cookieParser());
server.start(() => console.log('Server is running on http://localhost:4000'));
