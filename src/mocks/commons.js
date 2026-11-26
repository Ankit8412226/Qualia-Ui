import { daysAgo, int, lastDays, minutesAgo, person, pick, pickWeighted, range, rand, reseed, FIRST, LAST } from './seed';
import { makeCalls } from './calls';

/*
 * Admin Console (Qualia super admin) mock data.
 * Shapes here are what the real admin API should return; services/commons.js is the only reader.
 */
reseed(9001);

export const PRODUCT_IDS = ['agentflow', 'dialflow', 'businesspulse', 'ultrachat', 'insights'];
export const PRODUCT_NAMES = { agentflow: 'Agent Flow', dialflow: 'DialFlow', businesspulse: 'Business Pulse', ultrachat: 'UltraChat', insights: 'Insights' };
/** Chart series token per product (series colours happen to match product hues). */
export const PRODUCT_SERIES = { agentflow: 'series-4', dialflow: 'series-3', businesspulse: 'series-2', ultrachat: 'series-1', insights: 'series-6' };
export const PLANS = ['Starter', 'Growth', 'Enterprise'];
export const ROLES = ['Admin', 'Supervisor', 'Agent', 'QA analyst'];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/* ---------------- Tenants ---------------- */

const TENANT_SEED = [
  ['RR Parko Realty', 'Pune', 'Real estate', ['agentflow', 'dialflow', 'businesspulse', 'ultrachat', 'insights'], 'Enterprise', 'Active'],
  ['Kaveri Home Loans', 'Bengaluru', 'Lending', ['agentflow', 'businesspulse', 'insights'], 'Enterprise', 'Active'],
  ['Zenith Insurance Brokers', 'Mumbai', 'Insurance', ['dialflow', 'businesspulse'], 'Growth', 'Active'],
  ['Saffron Stays', 'Jaipur', 'Hospitality', ['ultrachat', 'agentflow'], 'Growth', 'Active'],
  ['UrbanNest Interiors', 'Hyderabad', 'Home services', ['agentflow', 'ultrachat'], 'Growth', 'Active'],
  ['Medisure Clinics', 'Chennai', 'Healthcare', ['agentflow', 'dialflow', 'ultrachat'], 'Enterprise', 'Active'],
  ['Bharat EduTech', 'Delhi', 'Education', ['dialflow', 'businesspulse', 'ultrachat'], 'Growth', 'Active'],
  ['Ganga Motors', 'Lucknow', 'Automotive', ['agentflow', 'dialflow'], 'Starter', 'Trial'],
  ['TruFit Gyms', 'Indore', 'Fitness', ['ultrachat'], 'Starter', 'Active'],
  ['Nirmal Jewellers', 'Kolkata', 'Retail', ['ultrachat', 'businesspulse'], 'Growth', 'Active'],
  ['Apex Solar Solutions', 'Ahmedabad', 'Energy', ['agentflow', 'businesspulse'], 'Growth', 'Active'],
  ['Sahyadri Hospitals', 'Pune', 'Healthcare', ['dialflow', 'businesspulse', 'insights'], 'Enterprise', 'Active'],
  ['Lotus Travels', 'Kochi', 'Travel', ['agentflow', 'ultrachat'], 'Starter', 'Suspended'],
  ['QuickKart Grocers', 'Mumbai', 'E-commerce', ['ultrachat', 'agentflow', 'insights'], 'Growth', 'Active'],
];

function makeUsers(t, n) {
  return range(n, (i) => {
    const name = i === 0 ? t.admin.name : person();
    const role = i === 0 ? 'Admin' : pickWeighted([['Agent', 60], ['Supervisor', 15], ['QA analyst', 10], ['Admin', 5]]);
    const status = i === 0 ? 'Active' : pickWeighted([['Active', 82], ['Invited', 10], ['Suspended', 8]]);
    return {
      id: `${t.id}_u${i}`,
      name,
      email: `${slug(name.split(' ')[0])}.${slug(name.split(' ')[1] || '')}@${t.domain}`,
      role,
      products: role === 'Admin' ? t.products : t.products.filter((p) => p !== 'insights').slice(0, int(1, Math.max(1, t.products.length))),
      status,
      lastActive: status === 'Invited' ? null : minutesAgo(int(2, 60 * 24 * 9)),
      online: status === 'Active' && rand() < 0.35,
    };
  });
}

export const TENANTS = TENANT_SEED.map(([name, city, industry, products, plan, status], i) => {
  const id = `t_${slug(name).slice(0, 10)}`;
  const domain = `${slug(name.split(' ')[0])}${i % 3 === 0 ? '.in' : '.com'}`;
  const adminName = person();
  const t = {
    id,
    name,
    city,
    industry,
    products,
    plan,
    status,
    domain,
    createdAt: daysAgo(int(20, 640)),
    admin: { name: adminName, email: `${slug(adminName.split(' ')[0])}@${domain}`, phone: `9${int(100000000, 999999999)}` },
    gst: `27AAB${String.fromCharCode(65 + (i % 26))}${int(1000, 9999)}K1Z${int(1, 9)}`,
    limits: { maxUsers: plan === 'Enterprise' ? 200 : plan === 'Growth' ? 60 : 15 },
    credits: {},
  };
  if (products.includes('agentflow')) {
    const total = pick([10000, 25000, 50000, 100000]);
    t.credits.agentflow = { total, used: Math.round(total * (i === 3 || i === 7 ? 0.94 : i === 10 ? 0.88 : 0.2 + rand() * 0.6)), unit: 'min' };
  }
  if (products.includes('businesspulse')) {
    const total = pick([2000, 5000, 10000]);
    t.credits.businesspulse = { total, used: Math.round(total * (i === 2 ? 0.91 : 0.15 + rand() * 0.6)), unit: 'credits' };
  }
  if (products.includes('ultrachat')) {
    t.credits.ultrachat = { wallet: i === 8 ? 640 : i === 12 ? 0 : int(4, 90) * 1000, unit: '₹' };
  }
  if (products.includes('dialflow')) {
    const max = pick([10, 25, 45, 80]);
    t.credits.dialflow = { maxAgents: max, activeAgents: int(Math.round(max * 0.4), max) };
  }
  t.users = makeUsers(t, int(6, 22));
  t.userCount = t.users.length + (plan === 'Enterprise' ? int(30, 90) : int(0, 20));
  t.onlineNow = t.users.filter((u) => u.online).length + (status === 'Active' ? int(0, 14) : 0);
  return t;
});

/** Credit health for a tenant: the worst of its products. */
export function creditHealth(t) {
  let worst = 1;
  const rows = [];
  for (const [p, c] of Object.entries(t.credits)) {
    if (c.total) {
      const left = 1 - c.used / c.total;
      rows.push({ product: p, left, label: `${Math.round(left * 100)}% left` });
      worst = Math.min(worst, left);
    }
    if (c.wallet != null) {
      const left = Math.min(1, c.wallet / 20000);
      rows.push({ product: p, left, label: `₹${c.wallet.toLocaleString('en-IN')}` });
      worst = Math.min(worst, left);
    }
  }
  return { left: worst, status: worst < 0.1 ? 'Critical' : worst < 0.2 ? 'Low' : 'Healthy', rows };
}

/* ---------------- SIP lines (Agent Flow + DialFlow) ---------------- */

const PROVIDERS = ['Tata Tele', 'Airtel IQ', 'Exotel', 'Knowlarity', 'Custom SIP'];
export const SIP_TYPES = ['Tata Tele', 'Airtel IQ', 'Exotel', 'Knowlarity', 'Custom SIP'];

function makeSipLine(tenant, n, kind) {
  const type = pick(PROVIDERS);
  const did = `79${int(10000000, 99999999)}`;
  return {
    id: `${tenant.id}_${kind}_sip${n}`,
    name: `${tenant.city} ${kind === 'ai' ? 'AI' : 'Floor'} line ${n + 1}`,
    type,
    host: type === 'Tata Tele' ? 'sip.tatatelebusiness.com' : type === 'Airtel IQ' ? 'iq-sip.airtel.in' : type === 'Exotel' ? 'qualia.voip.exotel.com' : `pbx.${tenant.domain}`,
    port: type === 'Custom SIP' ? 5080 : 5060,
    domain: type === 'Tata Tele' ? 'tatasip.in' : tenant.domain,
    numberType: rand() < 0.7 ? 'DID' : 'Extension',
    did,
    authUser: `${slug(tenant.name).slice(0, 6)}_${int(100, 999)}`,
    password: 'sip-secret-' + int(1000, 9999),
    prefix: rand() < 0.4 ? '0' : '',
    channels: pick([10, 20, 30, 60]),
    status: pickWeighted([['Connected', 85], ['Failed', 8], ['Paused', 7]]),
  };
}

/* ---------------- Agent Flow ---------------- */

const MINUTE_REASONS = ['Monthly top-up', 'Diwali campaign', 'Paid invoice #', 'Trial extension', 'Goodwill credit', 'Plan upgrade'];
const reasonText = () => {
  const r = pick(MINUTE_REASONS);
  return r.endsWith('#') ? `${r}QB-${int(2400, 2999)}` : r;
};

export const VOICE_CLIENTS = TENANTS.filter((t) => t.products.includes('agentflow')).map((t, i) => ({
  tenantId: t.id,
  name: t.name,
  city: t.city,
  plan: t.plan,
  status: t.status,
  minutesTotal: t.credits.agentflow.total,
  minutesUsed: t.credits.agentflow.used,
  minutesToday: int(120, 4200),
  agents: int(1, 9),
  concurrency: pick([5, 10, 20, 40]),
  sipLines: range(int(1, 3), (n) => makeSipLine(t, n, 'ai')),
  fishKey: i % 3 === 0 ? 'fish_live_8f2a91c0d47e' : '',
  usage14: range(14, () => int(200, 3800)),
  transactions: range(int(4, 8), (k) => ({
    id: `${t.id}_mtx${k}`,
    at: daysAgo(k * int(4, 12)),
    type: k === 3 ? 'Limit set' : k === 5 ? 'Usage reset' : 'Added',
    amount: k === 5 ? 0 : pick([5000, 10000, 25000]),
    by: pick(['Ankit Kumar', 'Neha Joshi', 'Sahil Mehta']),
    reason: k === 5 ? 'Monthly cycle reset' : reasonText(),
    balanceAfter: int(1000, 60000),
  })),
}));

/* ---------------- DialFlow ---------------- */

export const DIALER_CLIENTS = TENANTS.filter((t) => t.products.includes('dialflow')).map((t) => ({
  tenantId: t.id,
  name: t.name,
  city: t.city,
  plan: t.plan,
  status: t.status,
  maxAgents: t.credits.dialflow.maxAgents,
  activeAgents: t.credits.dialflow.activeAgents,
  onlineNow: int(2, t.credits.dialflow.activeAgents),
  callsToday: int(300, 6800),
  sipLines: range(int(2, 5), (n) => makeSipLine(t, n, 'floor')),
}));

/* ---------------- Business Pulse ---------------- */

export const BP_FEATURES = [
  { key: 'overview', label: 'Overview metrics', description: 'Dashboards with scores, trends and agent rankings.' },
  { key: 'qualityDelta', label: 'Quality delta', description: 'Week-on-week score change per agent and parameter.' },
  { key: 'multiRange', label: 'Multi-range compare', description: 'Compare up to 3 date ranges side by side.' },
  { key: 'ghostLeads', label: 'Ghost leads', description: 'Finds high-intent calls where revenue was missed.' },
  { key: 'insightsChat', label: 'Insights chat', description: 'Ask questions about this project in plain language.' },
];
export const TRANSCRIPTION_PROVIDERS = ['Deepgram Nova-3', 'Sarvam Saarika v2', 'Google Chirp 2', 'AssemblyAI Universal', 'Whisper large-v3 (self-hosted)'];

const PROJECT_NAMES = ['Sales calls', 'Collections', 'Renewals', 'Support QA', 'Inbound enquiries', 'Admissions', 'Claims'];

export const BP_PROJECTS = TENANTS.filter((t) => t.products.includes('businesspulse')).flatMap((t, i) =>
  range(i === 0 ? 3 : int(1, 2), (k) => {
    const credits = t.credits.businesspulse;
    const share = k === 0 ? 0.6 : 0.4;
    return {
      id: `${t.id}_bp${k}`,
      name: `${PROJECT_NAMES[(i + k) % PROJECT_NAMES.length]}`,
      tenantId: t.id,
      tenant: t.name,
      status: t.status === 'Active' ? pickWeighted([['Active', 85], ['Paused', 15]]) : 'Paused',
      agents: int(8, 120),
      monthlyCredits: Math.round(credits.total * share),
      usedCredits: Math.round(credits.used * share),
      callsScored: int(800, 14000),
      passRate: int(62, 93),
      avgScore: int(64, 88),
      features: { overview: true, qualityDelta: rand() < 0.7, multiRange: rand() < 0.5, ghostLeads: rand() < 0.45, insightsChat: rand() < 0.35 },
      llm: { openai: k % 2 === 0 ? 'sk-proj-a81bX2c9Lq' : '', gemini: rand() < 0.4 ? 'AIzaSyD-77fq2' : '', provider: pick(['GPT-4.1 mini', 'Gemini 2.5 Flash', 'Claude Haiku 4.5']) },
      transcription: pick(TRANSCRIPTION_PROVIDERS.slice(0, 4)),
      smtp: { host: 'smtp.zoho.in', port: 587, user: `qa@${t.domain}`, from: `${t.name} QA <qa@${t.domain}>`, password: 'smtp-pass', sendDaily: rand() < 0.6 },
    };
  }),
);

export const BP_CALLS = makeCalls(60, { agentKind: 'human', withScore: true, campaign: 'Sales calls' }).map((c, i) => {
  const p = BP_PROJECTS[i % BP_PROJECTS.length];
  return { ...c, tenant: p.tenant, project: p.name, campaign: p.name, processing: pickWeighted([['Scored', 86], ['Processing', 8], ['Failed', 6]]) };
});

/* ---------------- UltraChat ---------------- */

export const UC_TENANTS = TENANTS.filter((t) => t.products.includes('ultrachat')).map((t, i) => ({
  tenantId: t.id,
  name: t.name,
  city: t.city,
  plan: t.plan,
  status: t.status === 'Suspended' ? 'Suspended' : t.credits.ultrachat.wallet < 1000 ? 'Low balance' : 'Active',
  wallet: t.credits.ultrachat.wallet,
  messagesMonth: int(4000, 180000),
  whatsappOn: t.status !== 'Suspended',
  aiOn: rand() < 0.6,
  waNumber: `+91 ${int(70000, 99999)} ${int(10000, 99999)}`,
  wabaId: `${int(100000000, 999999999)}${int(100000, 999999)}`,
  phoneNumberId: `${int(100000000, 999999999)}${int(1000, 9999)}`,
  token: i % 2 ? 'EAAG7ZCq9w...' : '',
  quality: pickWeighted([['High', 70], ['Medium', 22], ['Low', 8]]),
  agents: int(2, 30),
}));

/* ---------------- Credits ledger (all products) ---------------- */

const CREDIT_PRODUCTS = ['agentflow', 'businesspulse', 'ultrachat'];
const UNIT = { agentflow: 'min', businesspulse: 'credits', ultrachat: '₹' };
export const CREDIT_TX = range(64, (i) => {
  const product = pickWeighted([['agentflow', 45], ['businesspulse', 25], ['ultrachat', 30]]);
  const t = pick(TENANTS.filter((x) => x.products.includes(product)));
  const type = pickWeighted([['Added', 72], ['Limit set', 18], ['Usage reset', 10]]);
  const amount = type === 'Usage reset' ? 0 : product === 'ultrachat' ? pick([5000, 10000, 25000, 50000]) : product === 'agentflow' ? pick([5000, 10000, 25000, 50000]) : pick([1000, 2000, 5000]);
  return {
    id: `ctx_${i}`,
    product,
    tenantId: t.id,
    tenant: t.name,
    type,
    amount,
    unit: UNIT[product],
    by: pick(['Ankit Kumar', 'Neha Joshi', 'Sahil Mehta', 'Auto top-up']),
    reason: type === 'Usage reset' ? 'Monthly cycle reset' : type === 'Limit set' ? 'Plan change' : reasonText(),
    at: daysAgo(Math.floor(i * 0.65), int(9, 20)),
  };
}).sort((a, b) => b.at - a.at);
export { CREDIT_PRODUCTS };

/* ---------------- Platform usage ---------------- */

export const PLATFORM_DAILY = lastDays(30, (i) => {
  const wk = i % 7 === 5 || i % 7 === 6 ? 0.55 : 1;
  const g = 1 + i * 0.012;
  return {
    agentflow: Math.round(int(38000, 46000) * wk * g),
    dialflow: Math.round(int(52000, 61000) * wk * g),
    businesspulse: Math.round(int(5200, 6900) * wk * g),
    ultrachat: Math.round(int(68000, 90000) * wk * g),
    insights: Math.round(int(90, 180) * wk * g),
  };
});

/** Per tenant, per product usage for the Usage page (last 30 days). */
export const TENANT_USAGE = TENANTS.map((t) => ({
  tenantId: t.id,
  tenant: t.name,
  products: t.products,
  agentflow: t.products.includes('agentflow') ? int(4000, 90000) : null, // minutes
  dialflow: t.products.includes('dialflow') ? int(10000, 240000) : null, // minutes
  businesspulse: t.products.includes('businesspulse') ? int(900, 18000) : null, // calls scored
  ultrachat: t.products.includes('ultrachat') ? int(3000, 260000) : null, // messages
  insights: t.products.includes('insights') ? int(20, 900) : null, // questions
  daily: lastDays(30, () => ({ agentflow: int(50, 3200), dialflow: int(200, 8000), businesspulse: int(20, 600), ultrachat: int(100, 9000), insights: int(0, 40) })),
}));

export const USAGE_UNITS = { agentflow: 'AI minutes', dialflow: 'Dialer minutes', businesspulse: 'Calls scored', ultrachat: 'WhatsApp messages', insights: 'Questions' };

/* ---------------- Dashboard ---------------- */

export const SERVICES = [
  { id: 'voice', name: 'Voice gateway', product: 'agentflow', status: 'Operational', latency: 142, uptime: 99.98, region: 'Mumbai' },
  { id: 'sip', name: 'Dialer SIP', product: 'dialflow', status: 'Operational', latency: 38, uptime: 99.95, region: 'Mumbai' },
  { id: 'stt', name: 'Transcription', product: 'businesspulse', status: 'Degraded', latency: 1840, uptime: 99.41, region: 'Deepgram', note: 'Queue at 6 min. Failing over to Sarvam for Hindi.' },
  { id: 'llm', name: 'LLM', product: 'businesspulse', status: 'Operational', latency: 620, uptime: 99.9, region: 'OpenAI + Gemini' },
  { id: 'wa', name: 'WhatsApp API', product: 'ultrachat', status: 'Operational', latency: 310, uptime: 99.97, region: 'Meta Cloud API' },
];

export const PRODUCT_HEALTH = [
  { id: 'agentflow', online: 64, metric: 'AI minutes today', value: 41280, delta: 8.2, spark: PLATFORM_DAILY.slice(-14).map((d) => d.agentflow), issues: ['2 SIP lines failing for Medisure Clinics'], to: '/admin/agentflow' },
  { id: 'dialflow', online: 312, metric: 'Dialer minutes today', value: 58420, delta: 3.4, spark: PLATFORM_DAILY.slice(-14).map((d) => d.dialflow), issues: [], to: '/admin/dialflow' },
  { id: 'businesspulse', online: 48, metric: 'Calls scored today', value: 6180, delta: -6.1, spark: PLATFORM_DAILY.slice(-14).map((d) => d.businesspulse), issues: ['Transcription queue at 6 min'], to: '/admin/businesspulse' },
  { id: 'ultrachat', online: 186, metric: 'Messages today', value: 84210, delta: 12.7, spark: PLATFORM_DAILY.slice(-14).map((d) => d.ultrachat), issues: ['Lotus Travels wallet empty'], to: '/admin/ultrachat' },
  { id: 'insights', online: 21, metric: 'Questions today', value: 164, delta: 31, spark: PLATFORM_DAILY.slice(-14).map((d) => d.insights), issues: [], to: '/admin/usage' },
];

export const PLATFORM_KPIS = {
  tenants: TENANTS.length,
  tenantsNew: 3,
  activeUsers: PRODUCT_HEALTH.reduce((a, p) => a + p.online, 0),
  activeUsersDelta: 6.8,
  aiMinutes: 41280,
  aiMinutesDelta: 8.2,
  callsScored: 6180,
  callsScoredDelta: -6.1,
  waMessages: 84210,
  waMessagesDelta: 12.7,
  revenue: 384600,
  revenueDelta: 9.4,
  passRate: 81.4,
  passRatePrev: 79.2,
  spark: {
    users: [520, 560, 548, 590, 612, 598, 631],
    ai: PLATFORM_DAILY.slice(-7).map((d) => d.agentflow),
    scored: PLATFORM_DAILY.slice(-7).map((d) => d.businesspulse),
    wa: PLATFORM_DAILY.slice(-7).map((d) => d.ultrachat),
    revenue: [310, 344, 352, 330, 368, 372, 384],
  },
};

export const ACTIVITY = [
  { id: 'a1', product: 'commons', who: 'Neha Joshi', text: 'created tenant Apex Solar Solutions', at: minutesAgo(6), tone: 'success' },
  { id: 'a2', product: 'agentflow', who: 'Ankit Kumar', text: 'added 25,000 minutes to Kaveri Home Loans', at: minutesAgo(18), tone: 'brand' },
  { id: 'a3', product: 'businesspulse', who: 'System', text: 'switched Hindi transcription to Sarvam (Deepgram slow)', at: minutesAgo(26), tone: 'warning' },
  { id: 'a4', product: 'dialflow', who: 'Sahil Mehta', text: 'raised max agents for Zenith Insurance to 45', at: minutesAgo(52), tone: 'brand' },
  { id: 'a5', product: 'ultrachat', who: 'System', text: 'paused WhatsApp for Lotus Travels: wallet empty', at: minutesAgo(95), tone: 'danger' },
  { id: 'a6', product: 'commons', who: 'Spam check', text: 'flagged +91 79651 10243 as “Suspected spam” on Jio', at: minutesAgo(140), tone: 'danger' },
  { id: 'a7', product: 'businesspulse', who: 'Ankit Kumar', text: 'turned on Ghost leads for RR Parko · Sales calls', at: minutesAgo(220), tone: 'brand' },
  { id: 'a8', product: 'agentflow', who: 'Neha Joshi', text: 'added 2 SIP lines for Medisure Clinics', at: minutesAgo(380), tone: 'brand' },
];

/* ---------------- Voice lab ---------------- */

export const VOICE_LAB_OPTIONS = {
  pipelines: [
    { value: 'cascade', label: 'STT + LLM + TTS', description: 'Most control. Mix any providers.' },
    { value: 's2s', label: 'Speech-to-speech', description: 'One model listens and speaks. Lowest latency.' },
  ],
  stt: ['Deepgram Nova-3', 'Sarvam Saarika v2', 'Google Chirp 2', 'AssemblyAI Universal'],
  llm: ['GPT-4.1 mini', 'Gemini 2.5 Flash', 'Claude Haiku 4.5', 'Llama 3.3 70B (Groq)'],
  tts: ['ElevenLabs Flash v2.5', 'Fish Audio S1', 'Sarvam Bulbul v2', 'Cartesia Sonic 2'],
  s2s: ['OpenAI Realtime', 'Gemini Live 2.5', 'Ultravox v0.5'],
  voices: ['Diya · Hindi female', 'Arjun · Hindi male', 'Meera · English (IN) female', 'Kabir · English (IN) male', 'Ananya · Tamil female'],
  languages: ['Hinglish', 'Hindi', 'English (India)', 'Marathi', 'Tamil', 'Telugu', 'Bengali'],
};

const cfg = (pipeline, a, b, c, voice, language) => ({ pipeline, stt: a, llm: b, tts: c, s2s: pipeline === 's2s' ? a : undefined, voice, language });
const LAB_CONFIGS = [
  cfg('cascade', 'Deepgram Nova-3', 'GPT-4.1 mini', 'ElevenLabs Flash v2.5', 'Diya · Hindi female', 'Hinglish'),
  cfg('cascade', 'Sarvam Saarika v2', 'Gemini 2.5 Flash', 'Sarvam Bulbul v2', 'Diya · Hindi female', 'Hindi'),
  cfg('s2s', 'OpenAI Realtime', null, null, 'Meera · English (IN) female', 'Hinglish'),
  cfg('cascade', 'Deepgram Nova-3', 'Claude Haiku 4.5', 'Fish Audio S1', 'Arjun · Hindi male', 'Hinglish'),
];
export const configLabel = (c) => (c.pipeline === 's2s' ? `${c.s2s || c.stt} · ${c.voice.split(' ·')[0]}` : `${c.stt.split(' ')[0]} → ${c.llm} → ${c.tts.split(' ')[0]}`);

export const VOICE_LAB_TESTS = range(18, (i) => {
  const c = LAB_CONFIGS[i % LAB_CONFIGS.length];
  const base = c.pipeline === 's2s' ? 520 : c.stt.startsWith('Sarvam') ? 980 : 860;
  return {
    id: `vl_${i}`,
    at: minutesAgo(40 + i * int(60, 400)),
    side: i % 2 ? 'B' : 'A',
    config: c,
    phone: `98${int(10000000, 99999999)}`,
    by: pick(['Ankit Kumar', 'Neha Joshi', 'Sahil Mehta']),
    duration: int(40, 210),
    latency: base + int(-120, 240),
    rating: Math.max(2, Math.min(5, Math.round((c.pipeline === 's2s' ? 4.3 : c.tts.startsWith('Eleven') ? 4.1 : 3.6) + (rand() - 0.5) * 1.6))),
    notes: pick(['Very natural, slight delay on numbers', 'Hindi pronunciation of “EMI” off', 'Interrupted well when I spoke over it', 'Robotic on long sentences', 'Great tone, fast first reply', 'Mispronounced Wakad', 'Felt like a real person']),
  };
});

/* ---------------- Spam check ---------------- */

export const OPERATORS = ['Jio', 'Airtel', 'Vi', 'BSNL'];
export const SPAM_LABELS = ['Clean', 'Spam', 'Suspected fraud', 'No label'];

export const SEED_PHONES = OPERATORS.map((op, i) => ({
  id: `seed_${op}`,
  number: `9${int(100000000, 999999999)}`,
  operator: op,
  device: pick(['Redmi Note 13', 'Samsung M14', 'Realme Narzo 60', 'Moto G54']),
  appStatus: i === 3 ? 'Offline' : 'Online',
  lastSeen: i === 3 ? minutesAgo(310) : minutesAgo(int(1, 6)),
  battery: i === 3 ? 12 : int(54, 98),
  truecaller: true,
}));

export const SPAM_SETTINGS = { dropThreshold: 25, autoRun: true, schedule: 'Daily at 10:00', minCalls: 50 };

/** Calling lines across tenants with today's connect rate vs a 14-day baseline. */
export const NUMBER_LINES = TENANTS.filter((t) => t.status !== 'Suspended' && (t.products.includes('agentflow') || t.products.includes('dialflow'))).flatMap((t, ti) =>
  range(int(2, 4), (k) => {
    const baseline = int(34, 58);
    const kind = pickWeighted([['healthy', 88], ['spam', 12]]);
    const forced = (ti === 0 && k === 1) || (ti === 4 && k === 0) ? 'spam' : ti === 5 && k === 1 ? 'down' : kind;
    const today = forced === 'spam' ? Math.round(baseline * (0.35 + rand() * 0.25)) : forced === 'down' ? 0 : Math.round(baseline * (0.88 + rand() * 0.2));
    const spark = range(14, (d) => (forced === 'spam' && d > 9 ? Math.round(baseline * (0.9 - (d - 9) * 0.12)) : baseline + int(-5, 5)));
    spark[13] = today;
    const number = ti === 0 && k === 1 ? '7965110243' : `79${int(10000000, 99999999)}`;
    return {
      id: `ln_${t.id}_${k}`,
      number,
      tenantId: t.id,
      tenant: t.name,
      product: t.products.includes('agentflow') && (k % 2 === 0 || !t.products.includes('dialflow')) ? 'agentflow' : 'dialflow',
      provider: pick(PROVIDERS.slice(0, 4)),
      callsToday: forced === 'down' ? 0 : int(80, 1400),
      connectToday: today,
      baseline,
      spark,
      verdict: forced === 'spam' ? 'Likely spam' : forced === 'down' ? 'Line down' : 'Healthy',
      lastCallAt: forced === 'down' ? minutesAgo(int(200, 600)) : minutesAgo(int(1, 20)),
    };
  }),
);

/** Lines picked for the latest spam check (low connectivity) and what each seed phone saw. */
export const SPAM_RESULTS = {
  ranAt: minutesAgo(140),
  nextRun: 'Tomorrow, 10:00',
  rows: NUMBER_LINES.filter((l) => l.verdict === 'Likely spam' || (l.verdict === 'Healthy' && l.connectToday / l.baseline < 0.95))
    .slice(0, 7)
    .map((l, i) => ({
      lineId: l.id,
      number: l.number,
      tenant: l.tenant,
      drop: Math.round((1 - l.connectToday / l.baseline) * 100),
      labels: Object.fromEntries(
        OPERATORS.map((op) => [
          op,
          op === 'BSNL' && i > 3
            ? null
            : l.verdict === 'Likely spam'
              ? pickWeighted([['Spam', 55], ['Suspected fraud', 20], ['Clean', 15], ['No label', 10]])
              : pickWeighted([['Clean', 60], ['No label', 32], ['Spam', 8]]),
        ]),
      ),
      callerName: l.verdict === 'Likely spam' ? pick(['Spam: Real estate', 'Likely telemarketer', 'Insurance spam']) : 'Shows company name',
    })),
};

/* ---------------- Global DNC ---------------- */

export const GLOBAL_DNC = range(46, (i) => ({
  id: `gdnc_${i}`,
  phone: `9${int(100000000, 999999999)}`,
  reason: pickWeighted([['Legal / TRAI complaint', 30], ['Customer request', 40], ['Wrong number', 10], ['Fraud reported', 10], ['Other', 10]]),
  scope: pickWeighted([['All products', 70], ['Agent Flow only', 15], ['DialFlow only', 15]]),
  source: pickWeighted([['TRAI NCPR sync', 30], ['Manual', 40], ['Tenant escalation', 20], ['CSV upload', 10]]),
  addedBy: pick(['Ankit Kumar', 'Neha Joshi', 'Sahil Mehta', 'System']),
  addedAt: daysAgo(int(0, 180)),
}));

/* ---------------- Tenant detail extras ---------------- */

export function tenantActivity(t) {
  return [
    { title: `${t.admin.name} signed in`, time: '12 min ago', tone: 'neutral' },
    { title: 'Credits added', description: 'Agent Flow · 10,000 min · Paid invoice #QB-2841', time: '2 d ago', tone: 'success' },
    { title: 'User suspended', description: `${pick(FIRST)} ${pick(LAST)} · left the company`, time: '5 d ago', tone: 'danger' },
    { title: 'Product switched on', description: `${PRODUCT_NAMES[t.products[t.products.length - 1]]} enabled by Ankit Kumar`, time: '3 wk ago', tone: 'brand' },
    { title: 'Tenant created', description: `Plan ${t.plan} · ${t.city}`, time: '', tone: 'info' },
  ];
}
