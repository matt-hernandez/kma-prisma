import { PartnerUpDeadline } from "../../generated/prisma-client";

let date = new Date(); 
export const TODAY_MILLISECONDS = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());

const ONE_HOUR_MILLISECONDS = 3600000;

const ONE_DAY_MILLISECONDS = 3600000 * 24;

export function getPartnerUpDeadlineEpochFromDue(due: number, partnerUpDeadline: PartnerUpDeadline): number {
  if (partnerUpDeadline === 'TWO_HOURS') {
    return due - ONE_HOUR_MILLISECONDS * 2;
  } else if (partnerUpDeadline === 'SIX_HOURS') {
    return due - ONE_HOUR_MILLISECONDS * 6;
  } else if (partnerUpDeadline === 'TWELVE_HOURS') {
    return due - ONE_HOUR_MILLISECONDS * 12;
  } else if (partnerUpDeadline === 'ONE_DAY') {
    return due - ONE_DAY_MILLISECONDS;
  } else if (partnerUpDeadline === 'ONE_WEEK') {
    return due - ONE_DAY_MILLISECONDS * 7;
  }
  return due - ONE_HOUR_MILLISECONDS;
}
