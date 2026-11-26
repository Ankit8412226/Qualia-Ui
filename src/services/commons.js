import { mock } from './client';
import {
  ACTIVITY,
  BP_CALLS,
  BP_PROJECTS,
  CREDIT_TX,
  DIALER_CLIENTS,
  GLOBAL_DNC,
  NUMBER_LINES,
  PLATFORM_DAILY,
  PLATFORM_KPIS,
  PRODUCT_HEALTH,
  SEED_PHONES,
  SERVICES,
  SPAM_RESULTS,
  SPAM_SETTINGS,
  TENANTS,
  TENANT_USAGE,
  UC_TENANTS,
  VOICE_CLIENTS,
  VOICE_LAB_TESTS,
  creditHealth,
  tenantActivity,
} from '@/mocks/commons';

/*
 * Admin Console service. Every function maps 1:1 to an admin API endpoint (path in the comment).
 * Swap mock() for http() when the backend is ready.
 */

const withHealth = (t) => ({ ...t, health: creditHealth(t) });

/* Dashboard · GET /admin/dashboard */
export const getDashboard = () =>
  mock(() => ({
    kpis: PLATFORM_KPIS,
    products: PRODUCT_HEALTH,
    services: SERVICES,
    activity: ACTIVITY,
    lowCredits: TENANTS.map(withHealth)
      .filter((t) => t.health.status !== 'Healthy')
      .sort((a, b) => a.health.left - b.health.left),
    updatedAt: new Date(),
  }));

/* Tenants · GET /admin/tenants, GET /admin/tenants/:id */
export const listTenants = () => mock(() => TENANTS.map(withHealth));
export const getTenant = (id) =>
  mock(() => {
    const t = TENANTS.find((x) => x.id === id);
    if (!t) return null;
    return {
      ...withHealth(t),
      activity: tenantActivity(t),
      voice: VOICE_CLIENTS.find((c) => c.tenantId === id) || null,
      dialer: DIALER_CLIENTS.find((c) => c.tenantId === id) || null,
      projects: BP_PROJECTS.filter((p) => p.tenantId === id),
      chat: UC_TENANTS.find((c) => c.tenantId === id) || null,
      usage: TENANT_USAGE.find((u) => u.tenantId === id) || null,
      credits: t.credits,
      ledger: CREDIT_TX.filter((c) => c.tenantId === id),
    };
  });
/* POST /admin/tenants */
export const createTenant = (payload) => mock({ id: 't_new', ...payload, password: 'Qb#' + Math.random().toString(36).slice(2, 8) });

/* Product admin */
export const listVoiceClients = () => mock(VOICE_CLIENTS); // GET /admin/agentflow/clients
export const listDialerClients = () => mock(DIALER_CLIENTS); // GET /admin/dialflow/clients
export const listBpProjects = () => mock(BP_PROJECTS); // GET /admin/businesspulse/projects
export const listBpCalls = () => mock(BP_CALLS); // GET /admin/businesspulse/calls
export const listChatTenants = () => mock(UC_TENANTS); // GET /admin/ultrachat/tenants

/* Platform */
export const listCreditTx = () => mock(CREDIT_TX); // GET /admin/credits
export const getUsage = () => mock({ daily: PLATFORM_DAILY, tenants: TENANT_USAGE }); // GET /admin/usage
export const listGlobalDnc = () => mock(GLOBAL_DNC); // GET /admin/dnc

/* Tools */
export const listVoiceLabTests = () => mock(VOICE_LAB_TESTS); // GET /admin/voice-lab/tests
export const getSpamCheck = () => mock({ settings: SPAM_SETTINGS, phones: SEED_PHONES, results: SPAM_RESULTS }); // GET /admin/spam-check
export const listNumberHealth = () => mock({ lines: NUMBER_LINES, updatedAt: new Date() }); // GET /admin/number-health
