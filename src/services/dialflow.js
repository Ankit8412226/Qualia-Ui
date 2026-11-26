/*
 * DialFlow service. Every screen reads through here; swap mock() for http() when the API lands.
 */
import { mock } from './client';
import {
  AGENTS,
  BREAK_CODES,
  CALLBACKS,
  CALLS,
  CALLS_14D,
  CAMPAIGNS,
  COLLECT_FIELDS,
  DIDS,
  DISPOSITION_ITEMS,
  DNC,
  GROUPS,
  HOURLY,
  HUDDLES,
  INBOUND_ROUTES,
  LEADS,
  LISTS,
  LIVE_CALLS,
  MY_CALLS,
  MY_STATS,
  SCRIPT,
  WORKSPACE_CAMPAIGNS,
  aprRows,
  statusDay,
} from '@/mocks/dialflow';

const RANGE_DAYS = { today: 1, yesterday: 1, '7d': 7, '30d': 30, mtd: 26, custom: 7 };

/* ---------- agent workspace ---------- */
export const getWorkspace = () =>
  mock({ campaigns: WORKSPACE_CAMPAIGNS, leads: LEADS, script: SCRIPT, fields: COLLECT_FIELDS, dispositions: DISPOSITION_ITEMS.filter((d) => d.active), breaks: BREAK_CODES.filter((b) => b.active), stats: MY_STATS, callbacksDue: CALLBACKS.filter((c) => c.section === 'due').length, huddle: HUDDLES[0] });
export const listMyCalls = () => mock(MY_CALLS);
export const listCallbacks = () => mock(CALLBACKS);

/* ---------- monitor ---------- */
export const getOverview = () =>
  mock({
    agents: AGENTS,
    campaigns: CAMPAIGNS,
    hourly: HOURLY,
    trend: CALLS_14D,
    huddles: HUDDLES,
    latest: CALLS.slice(0, 8),
    waiting: INBOUND_ROUTES.reduce((a, r) => a + r.waiting, 0),
    longestWait: 48,
    routes: INBOUND_ROUTES,
    lines: DIDS,
    callsToday: 3184,
    callsYesterday: 2960,
  });
export const getFloor = () => mock({ agents: AGENTS, campaigns: CAMPAIGNS });
export const listLiveCalls = () => mock(LIVE_CALLS);

/* ---------- dialing ---------- */
export const listCampaigns = () => mock(CAMPAIGNS);
export const getCampaign = (id) =>
  mock(() => {
    const c = CAMPAIGNS.find((x) => x.id === id);
    if (!c) return null;
    return {
      ...c,
      agents: AGENTS.filter((a) => a.campaigns.includes(id)),
      lists: LISTS.filter((l) => c.lists.includes(l.id)),
      calls: CALLS.filter((x) => x.campaign === c.name).slice(0, 40),
      trend: CALLS_14D.map((d) => ({ date: d.date, dialled: Math.round(d.dialled / 6), connected: Math.round(d.connected / 6) })),
    };
  });
export const listLists = () => mock(LISTS);
export const listAgents = () => mock(AGENTS);
export const listGroups = () => mock({ groups: GROUPS, agents: AGENTS, dids: DIDS });
export const getWizardOptions = () => mock({ lists: LISTS, groups: GROUPS, dispositions: DISPOSITION_ITEMS, dids: DIDS });

/* ---------- reports ---------- */
export const getApr = ({ campaign = 'all', range = 'today' } = {}) => mock(aprRows(campaign, RANGE_DAYS[range] || 1));
export const getStatusHistory = ({ agentId, date = 'today' }) => mock({ agent: AGENTS.find((a) => a.id === agentId), ...statusDay(agentId, date) });
export const getTeamStatus = ({ date = 'today' } = {}) => mock(AGENTS.filter((a) => a.active).map((a) => ({ agent: a, ...statusDay(a.id, date) })));
export const listCalls = () => mock(CALLS);
export const getNumberHealth = () => mock(DIDS);

/* ---------- settings ---------- */
export const listDispositions = () => mock(DISPOSITION_ITEMS);
export const listBreakCodes = () => mock(BREAK_CODES);
export const listInbound = () => mock({ routes: INBOUND_ROUTES, groups: GROUPS });
export const listDnc = () => mock(DNC);

