import { rule } from 'graphql-shield';

export const isAuthenticated = rule()(
  async (parent, args, { user }) => {
    if (user === 'unauthenticated') {
      return 'User is not authenticated';
    }
    return true;
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
