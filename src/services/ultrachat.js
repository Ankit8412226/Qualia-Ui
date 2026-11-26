/*
 * UltraChat service. Every screen reads through these functions. Today they resolve mock data;
 * swap mock() for http() when the API is ready (suggested endpoints in comments).
 */
import { mock } from './client';
import {
  AGENTS,
  AGENT_STATS,
  BOT,
  BUSINESS,
  CAMPAIGNS,
  CONVERSATIONS,
  DELIVERY_ROWS,
  FAILURE_REASONS,
  FLOWS,
  FLOW_GRAPH,
  GROUPS,
  INTEGRATIONS,
  LABELS,
  MEDIA,
  OPT_INS,
  OVERVIEW,
  QUICK_REPLIES,
  RATE_CARD,
  TEAM,
  TEMPLATES,
  TRANSACTIONS,
  buildThread,
  campaignRecipients,
  customerProfile,
} from '@/mocks/ultrachat';

/* GET /ultrachat/overview */
export const getOverview = () =>
  mock(() => ({
    ...OVERVIEW,
    templates: TEMPLATES.filter((t) => t.status === 'Approved' && t.sent).sort((a, b) => b.sent - a.sent).slice(0, 6),
    agents: AGENT_STATS,
    campaigns: CAMPAIGNS.filter((c) => c.status !== 'Draft').slice(0, 5),
  }));

/* Inbox */
export const listConversations = () => mock(CONVERSATIONS); // GET /ultrachat/conversations
export const getConversation = (id) =>
  mock(() => {
    const conv = CONVERSATIONS.find((c) => c.id === id);
    if (!conv) return null;
    return { conversation: conv, messages: buildThread(conv), profile: customerProfile(conv) };
  }); // GET /ultrachat/conversations/:id
export const getInboxMeta = () => mock({ agents: AGENTS, labels: LABELS, quickReplies: QUICK_REPLIES });
export const suggestReply = (convId) => mock({ text: 'Ji bilkul! Saturday 11 AM ka slot aapke liye hold kar diya hai. Kya aap family ke saath aayenge? Main parking pass bhi bhej deta hoon.', convId });

/* Campaigns */
export const listCampaigns = () => mock(CAMPAIGNS);
export const getCampaign = (id) =>
  mock(() => {
    const c = CAMPAIGNS.find((x) => x.id === id) || CAMPAIGNS[0];
    const failures = FAILURE_REASONS.map((r) => ({ ...r, count: Math.round(c.failed * r.share) })).filter((r) => r.count > 0);
    return { campaign: c, recipients: campaignRecipients(c), failures, template: TEMPLATES.find((t) => t.name === c.template) };
  });

/* Templates */
export const listTemplates = () => mock(TEMPLATES);
export const getTemplate = (id) => mock(() => TEMPLATES.find((t) => t.id === id) || null);

/* Audience */
export const listOptIns = () => mock(OPT_INS);
export const listGroups = () => mock(GROUPS);
export const getZohoSync = () => mock(INTEGRATIONS.zoho);

/* Flows */
export const listFlows = () => mock(FLOWS);
export const getFlow = (id) => mock(() => ({ flow: FLOWS.find((f) => f.id === id) || { id, name: 'Untitled flow', status: 'Draft', trigger: '', runs: 0 }, graph: id === 'new' ? { nodes: [{ id: 'n1', type: 'trigger', x: 60, y: 200, data: { keywords: '' } }], edges: [] } : FLOW_GRAPH }));

/* AI bot */
export const getBot = () => mock(BOT);
export const askBot = (q) =>
  mock(() => {
    const s = q.toLowerCase();
    if (s.includes('price') || s.includes('kitna') || s.includes('rate'))
      return { text: 'Parko Heights, Wakad mein 2BHK ₹82 L aur 3BHK ₹1.14 Cr se start hota hai (all inclusive). Kya main aapke liye site visit book karun?', sources: ['Price-sheet-Nov-2026.xlsx'] };
    if (s.includes('loan') || s.includes('emi')) return { text: 'Hum HDFC, SBI aur ICICI ke saath tie-up mein hain. ₹82 L par EMI lagbhag ₹62,400/month banti hai (20 saal, 8.5%).', sources: ['Home-loan-FAQ.docx'] };
    if (s.includes('human') || s.includes('agent') || s.includes('discount')) return { text: 'Main aapko hamare sales expert se connect kar raha hoon. Woh 2 minute mein reply karenge.', handover: true, sources: [] };
    return { text: 'Parko Heights mein clubhouse, swimming pool, gym aur covered parking hai. Possession December 2027. Aur kuch jaanna chahenge?', sources: ['Parko-Heights-Brochure.pdf', 'rrparko.in/projects'] };
  });

/* Media */
export const listMedia = () => mock(MEDIA);

/* Reports */
export const getDeliveryReport = () => mock(DELIVERY_ROWS);
export const getInboxReport = () =>
  mock(() => {
    const t = AGENT_STATS.reduce((a, s) => ({ assigned: a.assigned + s.assigned, replied: a.replied + s.replied, pending: a.pending + s.pending }), { assigned: 0, replied: 0, pending: 0 });
    return { totals: { ...t, responseRate: (t.replied / t.assigned) * 100, firstResponse: 104 }, agents: AGENT_STATS, trend: OVERVIEW.trend.map((d) => ({ date: d.date, chats: Math.round(d.replied / 9), replied: Math.round(d.replied / 10) })) };
  });

/* Wallet */
export const getWallet = () => mock({ ...OVERVIEW.wallet, rateCard: RATE_CARD, transactions: TRANSACTIONS, autoRefill: { enabled: true, below: 5000, amount: 20000, method: 'Card •• 4402' } });

/* Settings */
export const getSettings = () => mock({ business: BUSINESS, team: TEAM, integrations: INTEGRATIONS, health: OVERVIEW.numberHealth });

export const listRecentAudienceSources = () => mock({ segments: [{ id: 'seg_all', name: 'All opted-in contacts', count: 15420 }, { id: 'seg_wakad', name: 'Wakad enquiries (90 days)', count: 4210 }, { id: 'seg_visit', name: 'Visited, not booked', count: 862 }, { id: 'seg_nri', name: 'NRI buyers', count: 640 }], groups: GROUPS });
