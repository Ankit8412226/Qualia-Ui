import { mock } from './client';
import { buildAnswer, CONNECTIONS, DIGESTS, PINNED, REPORTS, SESSIONS, sampleThread } from '@/mocks/insights';

/* Insights service. Real API: Product-Insights hub (one chat across all products, streamed answers). */
export const insightsService = {
  listSessions: () => mock(SESSIONS),
  getThread: () => mock(sampleThread),
  /** Ask a question. The real endpoint streams steps then the answer; the UI already renders steps. */
  ask: (question, scope) => mock(() => buildAnswer(question, scope)),
  listPinned: () => mock(PINNED),
  listReports: () => mock(REPORTS),
  listDigests: () => mock(DIGESTS),
  listConnections: () => mock(CONNECTIONS),
};
