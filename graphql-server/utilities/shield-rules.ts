import { rule } from 'graphql-shield';

export const isAuthenticated = rule()(
  async (parent, args, { user }) => {
    return user !== 'unauthenticated';
  }
);

export const isAdmin = rule()(
  async (parent, args, { user }) => {
    return user.isAdmin || user.email === 'matt.isaiah.hernandez@gmail.com';
  }
);
