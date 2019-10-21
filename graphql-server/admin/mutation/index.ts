import * as shortid from 'shortid';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Resolvers from '../../utilities/resolvers-type';

export const adminMutationSchema = readFileSync(resolve(__dirname, 'mutation.graphql'), 'utf8');

export const adminMutationResolvers: Resolvers = {
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
  createTask: (root, { title, due, publishDate, partnerUpDeadline }, { user, prisma }) => prisma.createTask({
    cid: shortid.generate(),
    title,
    due,
    publishDate,
    partnerUpDeadline
  }),
  deleteTask: (root, { taskCid }, { user, prisma }) => prisma.deleteTask({
    cid: taskCid
  }),
  createTaskTemplate: (root, { title, creationDate, partnerUpDeadline, repeatFrequency, nextPublishDate, nextDueDate }, { user, prisma }) => prisma.createTaskTemplate({
    cid: shortid.generate(),
    title,
    partnerUpDeadline,
    creationDate,
    repeatFrequency,
    nextPublishDate,
    nextDueDate
  })
};
