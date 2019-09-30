import { prisma } from './generated/prisma-client';
import { GraphQLServer } from 'graphql-yoga';
import * as cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { schema, resolvers, shields } from './graphql-server';

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

const getUserFromDb = async (resolve, root, args, context, info) => {
  const user = await prisma.user({ email: context.user.email });
  context.user = user || context.user;
  const result = await resolve(root, args, context, info);
  return result;
}

const server = new GraphQLServer({
  typeDefs: [schema],
  resolvers: (resolvers as any),
  middlewares: [getUserFromDb, shields],
  context: req => ({
    prisma,
    user: getUser(req)
  }),
});
server.express.use(cookieParser());
server.start(() => console.log('Server is running on http://localhost:4000'));
