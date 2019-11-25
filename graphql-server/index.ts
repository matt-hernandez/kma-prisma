import { readFileSync } from 'fs';
import { resolve } from 'path';
import { mergeTypes } from 'merge-graphql-schemas';
import { shield, and, chain } from 'graphql-shield';
import { userQueryResolvers, userQuerySchema } from './user/query';
import { userMutationResolvers, userMutationSchema } from './user/mutation';
import { adminQueryResolvers, adminQuerySchema } from './admin/query';
import { adminMutationResolvers, adminMutationSchema } from './admin/mutation';
import { isAuthenticated, isAdmin } from './utilities/shield-rules';
import Resolvers, { ResolverFunction, Resolver } from './utilities/resolvers-type';
import { Rule } from 'graphql-shield/dist/rules';

export const types = readFileSync(resolve(__dirname, 'types.graphql'), 'utf8');

const typeDefs = [
  userMutationSchema,
  userQuerySchema,
  adminQuerySchema,
  adminMutationSchema,
  types
];

export const schema = mergeTypes(typeDefs);

function getResolverFn(object: Resolvers): { [key: string]: ResolverFunction } {
  return Object.keys(object).reduce((acc, key) => {
    acc[key] = Array.isArray(object[key]) ? object[key][0] : object[key];
    return acc;
  }, {});
}

export const resolvers = {
  Query: {
    ...(getResolverFn(userQueryResolvers)),
    ...(getResolverFn(adminQueryResolvers))
  },
  Mutation: {
    ...(getResolverFn(userMutationResolvers)),
    ...(getResolverFn(adminMutationResolvers))
  }
};

function getShields(object: Resolvers, includeAdminRule: boolean = false): { [key: string]: Rule } {
  return Object.keys(object).reduce((acc, key) => {
    const rules: Rule[] = Array.isArray(object[key]) ? object[key][1] : [];
    if (includeAdminRule) {
      rules.unshift(isAdmin);
    }
    acc[key] = chain(isAuthenticated, ...rules);
    return acc;
  }, {});
}

export const shields = shield({
  Query: {
    ...(getShields(userQueryResolvers)),
    ...(getShields(adminQueryResolvers, true))
  },
  Mutation: {
    ...(getShields(userMutationResolvers)),
    ...(getShields(adminMutationResolvers, true))
  }
});
