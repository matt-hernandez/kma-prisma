import { prisma, RepeatFrequency } from './generated/prisma-client';
import * as shortid from 'shortid';
import { TODAY_MILLISECONDS } from './graphql-server/utilities/date';

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

function getNextDueDateAndPublishDate(due: number, repeatFrequency: RepeatFrequency) {
  const dueDate = new Date(due);
  const ONE_DAY_MILLISECONDS = 3600000 * 24;
  let nextDueDate: Date;
  if (repeatFrequency === 'DAY') {
    nextDueDate = new Date(dueDate.getTime() + ONE_DAY_MILLISECONDS);
  } else if (repeatFrequency === 'WEEK') {
    nextDueDate = new Date(dueDate.getTime() + ONE_DAY_MILLISECONDS * 7);
  } else if (repeatFrequency === 'MONTH') {
    const utcMonth = dueDate.getUTCMonth();
    nextDueDate = new Date(due);
    nextDueDate.setUTCMonth(utcMonth + 1);
  } else if (repeatFrequency === 'END_OF_MONTH') {
    const utcMonth = dueDate.getUTCMonth();
    nextDueDate = new Date(due);
    nextDueDate.setUTCMonth(utcMonth + 2);
    nextDueDate.setUTCDate(-1);
  }
  let nextPublishDate = new Date(due);
  nextPublishDate.setUTCDate(dueDate.getUTCDate() + 1);
  nextPublishDate.setUTCHours(0);
  nextPublishDate.setUTCMinutes(0);
  nextPublishDate.setUTCSeconds(0);
  nextPublishDate.setUTCMilliseconds(0);
  return {
    nextDueDate: nextDueDate.getTime(),
    nextPublishDate: nextPublishDate.getTime()
  }
}

async function makeSomeTasksAndTemplates() {
  const dueDates = [
    {
      text: 'Monday',
      due: nextMondayAt615AM.getTime()
    },
    {
      text: 'Wednesday',
      due: nextWednesdayAt615AM.getTime()
    },
    {
      text: 'Friday',
      due: nextFridayAt615AM.getTime()
    }
  ];
  await Promise.all(dueDates.map(async ({ due, text }) => {
    let nextDueDateAndPublishDate = getNextDueDateAndPublishDate(due, 'WEEK');
    let template = await prisma.createTaskTemplate({
      title: `Attend Kickstart Conditioning - ${text}`,
      description: 'Wake up early AF and do this!',
      cid: shortid.generate(),
      pointValue: 1,
      due: nextDueDateAndPublishDate.nextDueDate,
      publishDate: nextDueDateAndPublishDate.nextPublishDate,
      partnerUpDeadline: 'ONE_HOUR',
      repeatFrequency: 'WEEK'
    });

    await prisma.createTask({
      title: template.title,
      description: template.description,
      cid: shortid.generate(),
      pointValue: template.pointValue,
      due,
      publishDate: TODAY_MILLISECONDS,
      templateCid: template.cid,
      partnerUpDeadline: template.partnerUpDeadline
    });
  }));
}

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

  await makeSomeTasksAndTemplates();

  await prisma.createTask({
    title: 'Attend Krav 2 - Wednesday',
    description: 'Get that green belt!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextWednesdayAtNoon.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: 'ONE_HOUR'
  });

  await prisma.createTask({
    title: 'Attend Krav 2 - Friday',
    description: 'Get that green belt!',
    cid: shortid.generate(),
    pointValue: 1,
    due: nextFridayAtNoon.getTime(),
    publishDate: TODAY_MILLISECONDS,
    templateCid: shortid.generate(),
    partnerUpDeadline: 'ONE_HOUR'
  });

  await prisma.createTask({
    title: 'Attend three classes this week',
    description: 'Do it!',
    cid: shortid.generate(),
    pointValue: 3,
    due: nextSaturdayAt2PM.getTime(),
    publishDate: TODAY_MILLISECONDS,
    partnerUpDeadline: 'ONE_DAY'
  });
}

main();
