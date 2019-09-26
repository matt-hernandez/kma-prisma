const { prisma } = require('./generated/prisma-client');
const { GraphQLServer } = require('graphql-yoga');

const resolvers = {
  Query: {
    me: (root, { id }, context) => context.prisma.user({ id }),
    possiblePartnersForAgreement: (root, { name }, context) => context.prisma.users({ where: { name_contains: name } }),
    openAgreements: (root, args, context) => context.prisma.agreements(),
    myAgreements: (root, args, context) => context.prisma.agreements(),
    requestedPartnerAgreements: (root, args, context) => context.prisma.agreements(),
    pastAgreements: (root, args, context) => context.prisma.agreements()
  },
  Mutation: {
    commitToAgreement: (root, { agreementId }, context) => context.prisma.updateAgreement({
      where: { id: agreementId },
      data: { published: true },
    }),
    addAgreementTemplateToSkip: (root, { agreementId, userId }, context) => context.prisma.updateUser({
      where: { id: userId },
      data: { published: true },
    }),
    requestPartnerForAgreement: (root, { agreementId, partnerId }, context) => context.prisma.updateAgreement({
      where: { id: agreementId },
      data: { published: true },
    }),
    confirmPartnerRequest: (root, { agreementId, partnerId }, context) => context.prisma.updateAgreement({
      where: { id: agreementId },
      data: { published: true },
    }),
    denyPartnerRequest: (root, { agreementId, partnerId }, context) => context.prisma.updateAgreement({
      where: { id: agreementId },
      data: { published: true },
    }),
    cancelAgreement: (root, { agreementId }, context) => context.prisma.updateAgreement({
      where: { id: agreementId },
      data: { published: true },
    }),
    breakAgreement: (root, { agreementId }, context) => context.prisma.updateAgreement({
      where: { id: agreementId },
      data: { published: true },
    })
  }
}

const server = new GraphQLServer({
  typeDefs: './schema.graphql',
  resolvers,
  context: {
    prisma,
  },
});
server.start(() => console.log('Server is running on http://localhost:4000'));
