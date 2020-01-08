import { prisma } from './generated/prisma-client';
import * as shortid from 'shortid';
import { TODAY_MILLISECONDS } from './graphql-server/utilities/date';

async function main() {
  await prisma.createUser({
    name: 'Matt Hernandez',
    email: 'matt.isaiah.hernandez@gmail.com',
    cid: shortid.generate(),
    loginTimestamp: 1234,
    isAdmin: true
  });
  await prisma.createUser({
    name: 'Katie Goolsbee',
    email: 'katie.goolsbee@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234,
    isAdmin: true
  });
  await prisma.createUser({
    name: 'Kati Taylor',
    email: 'kati.taylor@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234
  });
  await prisma.createUser({
    name: 'Kathryn Love',
    email: 'kathryn.love@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234
  });
  await prisma.createUser({
    name: 'Erin Armstrong',
    email: 'erin.armstrong@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234
  });
  await prisma.createUser({
    name: 'Dave Goode',
    email: 'dave.goode@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234
  });
  await prisma.createUser({
    name: 'Norbi Zylberberg',
    email: 'norbi.zylberberg@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234
  });
  await prisma.createUser({
    name: 'Rachel Weiss',
    email: 'rachel.weiss@lionskravmaga.com',
    cid: shortid.generate(),
    loginTimestamp: 1234
  });

  const today = new Date(TODAY_MILLISECONDS);
  const oneHour = 1000 * 60 * 60;
  const oneDay = oneHour * 24;
  function changeDate(days, hourDigits) {
    const d = new Date(TODAY_MILLISECONDS + (oneDay * days));
    const [ hour, minute, seconds, milli ] = [ ...hourDigits, 0, 0, 0, 0 ];
    d.setHours(hour, minute, seconds, milli);
    return d;
  }
  const dayOfWeek = today.getDay();
  const daysToAddForMonday = dayOfWeek < 1 ? 8 : 7 - (dayOfWeek - 1);
  const daysToAddForWednesday = dayOfWeek < 3 ? 8 : 7 - (dayOfWeek - 3);
  const daysToAddForFriday = dayOfWeek < 5 ? 8 : 7 - (dayOfWeek - 5);
  const daysToAddForSaturday = dayOfWeek < 6 ? 8 : 7 - (dayOfWeek - 6);
  const nextMondayAt615AM = changeDate(daysToAddForMonday, [6, 15]);
  const nextWednesdayAt615AM = changeDate(daysToAddForWednesday, [6, 15]);
  const nextWednesdayAtNoon = changeDate(daysToAddForWednesday, [12, 0]);
  const nextFridayAt615AM = changeDate(daysToAddForFriday, [6, 15]);
  const nextFridayAtNoon = changeDate(daysToAddForFriday, [12, 0]);
  const nextSaturdayAt2PM = changeDate(daysToAddForSaturday, [14]);

  await prisma.createTask({
    title: 'Attend Kickstart Conditioning - Monday',
    description: 'Wake up early AF and do this!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextMondayAt615AM.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: nextMondayAt615AM.getTime() - oneHour
  });

  await prisma.createTask({
    title: 'Attend Kickstart Conditioning - Wednesday',
    description: 'Wake up early AF and do this!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextWednesdayAt615AM.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: nextWednesdayAt615AM.getTime() - oneHour
  });

  await prisma.createTask({
    title: 'Attend Kickstart Conditioning - Friday',
    description: 'Wake up early AF and do this!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextFridayAt615AM.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: nextFridayAt615AM.getTime() - oneHour
  });

  await prisma.createTask({
    title: 'Attend Krav 2 - Wednesday',
    description: 'Get that green belt!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextWednesdayAtNoon.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: nextWednesdayAtNoon.getTime() - oneHour
  });

  await prisma.createTask({
    title: 'Attend Krav 2 - Friday',
    description: 'Get that green belt!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextFridayAtNoon.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: nextFridayAtNoon.getTime() - oneHour
  });

  await prisma.createTask({
    title: 'Attend three classes this week',
    description: 'Do it!',
    cid: shortid.generate(),
    pointValue: 3,
    due: nextSaturdayAt2PM.getTime(),
    publishDate: TODAY_MILLISECONDS,
    partnerUpDeadline: nextSaturdayAt2PM.getTime() - oneDay
  });
}

main();
