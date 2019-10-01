import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mergeTypes } from 'merge-graphql-schemas';
import { shield, and } from 'graphql-shield';
import { userQueryResolvers, userQuerySchema } from './user/query';
import { userMutationResolvers, userMutationSchema, userMutationShields } from './user/mutation';
import { adminQueryResolvers, adminQuerySchema } from './admin/query';
import { adminMutationResolvers, adminMutationSchema } from './admin/mutation';
import { isAuthenticated, isAdmin } from './utilities/shield-rules';

export const types = readFileSync(resolve(__dirname, 'types.graphql'), 'utf8');

const typeDefs = [
  userMutationSchema,
  userQuerySchema,
  adminQuerySchema,
  adminMutationSchema,
  types
];

export const schema = mergeTypes(typeDefs);
export const resolvers = {
  Query: {
    ...userQueryResolvers,
    ...adminQueryResolvers,
  },
  Mutation: {
    ...userMutationResolvers,
    ...adminMutationResolvers
  }
}
export const shields = shield({
  Query: {
    ...(Object.keys(userQueryResolvers).reduce((acc, key) => {
      acc[key] = isAuthenticated;
      return acc;
    }, {})),
    ...(Object.keys(adminQueryResolvers).reduce((acc, key) => {
      acc[key] = and(isAuthenticated, isAdmin);
      return acc;
    }, {}))
  },
  Mutation: {
    ...userMutationShields,
    ...(Object.keys(adminMutationResolvers).reduce((acc, key) => {
      acc[key] = and(isAuthenticated, isAdmin);
      return acc;
    }, {}))
  }
});
