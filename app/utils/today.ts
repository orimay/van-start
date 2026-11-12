/** Cards reviewed while due, on one day. */
export interface ReviewLog {
  day: string;
  ids: string[];
}

const dayOf = (date: Date) => date.toDateString();

export function markReviewed(log: ReviewLog | undefined, id: string, now: Date): ReviewLog {
  const ids = log?.day === dayOf(now) ? log.ids : [];
  return { day: dayOf(now), ids: ids.includes(id) ? ids : [...ids, id] };
}

export const reviewedOn = (log: ReviewLog | undefined, now: Date) => (log?.day === dayOf(now) ? log.ids : []);

/** Reviewed cards out of all the day would have had due without reviewing; one due again is not done. */
export function dayProgress(reviewed: string[], due: string[]): { done: number; total: number } {
  const dueNow = new Set(due);
  return { done: reviewed.filter(id => !dueNow.has(id)).length, total: new Set([...reviewed, ...due]).size };
}
