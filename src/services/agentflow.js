import { mock } from './client';
import * as db from '@/mocks/agentflow';

/*
 * Agent Flow service. Every screen reads data through these functions.
 * To wire the backend, swap each `mock(...)` for `http(...)`; the return shapes stay the same.
 */

const inRange = (d, preset = '7d') => {
  const now = new Date('2026-11-26T23:59:00+05:30').getTime();
  const days = { today: 1, yesterday: 2, '7d': 7, '30d': 30, mtd: 26, custom: 365 }[preset] ?? 7;
  return now - new Date(d).getTime() <= days * 86400000;
};

/* Overview */
export const getOverview = () =>
  mock(() => ({
    ...db.OVERVIEW,
    running: db.CAMPAIGNS.filter((c) => ['Running', 'Paused'].includes(c.status)),
    recent: db.ALL_CALLS.slice(0, 8),
  }));
export const getCredits = () => mock(db.CREDITS);

/* Campaigns */
export const listCampaigns = () => mock(db.CAMPAIGNS);
export const getCampaign = (id) => mock(() => db.CAMPAIGNS.find((c) => c.id === id) || null);
export const getCampaignContacts = (id) => mock(() => db.campaignContacts(db.CAMPAIGNS.find((c) => c.id === id)));
export const getCampaignCalls = (id) => mock(() => db.CALLS.filter((c) => c.campaignId === id));
export const getCampaignResults = (id) => mock(() => db.campaignResults(db.CAMPAIGNS.find((c) => c.id === id)));
export const getWizardDefaults = () => mock({ draft: db.NEW_CAMPAIGN, csv: db.CSV_SAMPLE });

/* Calls */
export const listCalls = ({ preset = '7d' } = {}) => mock(() => db.ALL_CALLS.filter((c) => inRange(c.startedAt, preset)));

/* Inbound */
export const getInbound = () => mock({ config: db.INBOUND_CONFIG, numbers: db.INBOUND_NUMBERS, calls: db.INBOUND_CALLS });

/* Contacts */
export const listContacts = () => mock(db.CONTACTS);
export const getContactTimeline = (contact) => mock(() => db.contactTimeline(contact));

/* Library */
export const listVoices = () => mock(db.VOICES);
export const listDispositions = () => mock(db.DISPOSITIONS);
export const listDnc = () => mock(db.DNC);

/* Setup */
export const listIntegrations = () => mock(db.INTEGRATIONS);
export const getAlerts = () => mock(db.ALERTS);
export const listTools = () => mock(db.TOOLS);

/* Test call */
export const getTestCallSetup = () => mock({ presets: db.TEST_PRESETS, sessions: db.TEST_SESSIONS, knowledge: db.KNOWLEDGE_BASES });

/** Static reference lists (no network later either: they ship with the app). */
export const ref = {
  languages: db.LANGUAGES,
  engines: db.ENGINES,
  engineLabel: db.ENGINE_LABEL,
  tones: db.TONES,
  backgrounds: db.BACKGROUND_SOUNDS,
  fieldTypes: db.FIELD_TYPES,
  days: db.DAYS,
  variables: db.PROMPT_VARIABLES,
  costPerMin: db.COST_PER_MIN,
  statuses: db.CAMPAIGN_STATUSES,
  voices: db.VOICES,
  testScript: db.TEST_SCRIPT,
};
