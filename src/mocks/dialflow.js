/*
 * DialFlow mock data (human-agent dialer + supervisor console).
 * Deterministic: reseeded at import so screens look the same on every reload.
 * Shapes here are the contract the API will be asked to match.
 */
import { reseed, int, pick, pickWeighted, range, phone, person, minutesAgo, daysAgo, lastDays, CITIES, now } from './seed';
import { makeCall } from './calls';

reseed(7719);

/* ---------------- agent states (one vocabulary for floor, tiles, timelines, APR) ---------------- */

export const AGENT_STATES = ['Ready', 'In call', 'Wrap-up', 'Paused', 'Manual dial', 'Logged out'];

/* ---------------- campaigns ---------------- */

export const CAMPAIGNS = [
  { id: 'cmp_wakad', name: 'Wakad 2BHK leads', type: 'Outbound', dialMethod: 'Power', ratio: 2.5, group: 'Pune Sales', leads: 4200, leadsLeft: 1386, dialled: 2814, connected: 1069, aht: 214, status: 'Active', lists: ['lst_wakad', 'lst_fb_nov'], hours: '10:00 – 19:30', dids: ['8069 410 220', '8069 410 221'], createdAt: daysAgo(18) },
  { id: 'cmp_hinj', name: 'Hinjewadi site visits', type: 'Outbound', dialMethod: 'Progressive', ratio: 1, group: 'Pune Sales', leads: 1850, leadsLeft: 612, dialled: 1238, connected: 557, aht: 251, status: 'Active', lists: ['lst_hinj'], hours: '10:00 – 19:00', dids: ['8069 410 222'], createdAt: daysAgo(12) },
  { id: 'cmp_renew', name: 'Renewals Nov', type: 'Outbound', dialMethod: 'Progressive', ratio: 1, group: 'Retention', leads: 1240, leadsLeft: 96, dialled: 1144, connected: 471, aht: 186, status: 'Active', lists: ['lst_renew'], hours: '09:30 – 18:30', dids: ['2248 930 115'], createdAt: daysAgo(26) },
  { id: 'cmp_diwali', name: 'Diwali offer follow-up', type: 'Outbound', dialMethod: 'Power', ratio: 3, group: 'Mumbai Sales', leads: 6400, leadsLeft: 0, dialled: 6400, connected: 2112, aht: 162, status: 'Completed', lists: ['lst_diwali'], hours: '10:00 – 20:00', dids: ['2248 930 116', '2248 930 117'], createdAt: daysAgo(40) },
  { id: 'cmp_inbound', name: 'Inbound sales', type: 'Inbound', dialMethod: 'Manual', ratio: 1, group: 'Inbound Desk', leads: 0, leadsLeft: 0, dialled: 920, connected: 874, aht: 288, status: 'Active', lists: [], hours: '09:00 – 21:00', dids: ['1800 270 4455'], createdAt: daysAgo(60) },
  { id: 'cmp_loan', name: 'Home loan cross-sell', type: 'Outbound', dialMethod: 'Manual', ratio: 1, group: 'Retention', leads: 780, leadsLeft: 780, dialled: 0, connected: 0, aht: 0, status: 'Paused', lists: ['lst_loan'], hours: '11:00 – 18:00', dids: ['2248 930 115'], createdAt: daysAgo(3) },
];
CAMPAIGNS.forEach((c) => {
  c.connectPct = c.dialled ? (c.connected / c.dialled) * 100 : 0;
});

/* ---------------- agents ---------------- */

const GROUPS_OF = ['Pune Sales', 'Pune Sales', 'Pune Sales', 'Mumbai Sales', 'Retention', 'Inbound Desk'];
const BREAKS = ['Lunch', 'Tea break', 'Training', 'Team meeting', 'Bio break', 'System issue'];
const AGENT_NAMES = ['Rahul Verma', 'Priya Nair', 'Kavya Iyer', 'Rohan Mehta', 'Sneha Kulkarni', 'Arjun Reddy', 'Neha Joshi', 'Karan Malhotra', 'Pooja Das', 'Aditya Patel', 'Isha Kapoor', 'Manish Chauhan', 'Ritika Bose', 'Sahil Gupta', 'Meera Singh', 'Nikhil Sharma', 'Divya Iyer', 'Amit Verma', 'Simran Kapoor', 'Varun Nair', 'Tanvi Mehta', 'Vikram Joshi', 'Ananya Reddy', 'Aarav Gupta', 'Sanjana Rao', 'Farhan Shaikh', 'Lakshmi Pillai', 'Harpreet Kaur'];

export const AGENTS = AGENT_NAMES.map((name, i) => {
  const group = GROUPS_OF[i % GROUPS_OF.length];
  const groupCampaigns = CAMPAIGNS.filter((c) => c.group === group && c.status !== 'Completed').map((c) => c.id);
  const forced = { 0: 'In call', 10: 'Paused', 14: 'Paused', 21: 'Paused' }[i];
  const state = forced || pickWeighted([['In call', 34], ['Ready', 20], ['Wrap-up', 12], ['Paused', 16], ['Manual dial', 6], ['Logged out', 12]]);
  const breakReason = state === 'Paused' ? pick(BREAKS) : null;
  const breakLimit = { Lunch: 30, 'Tea break': 10, Training: 60, 'Team meeting': 30, 'Bio break': 5, 'System issue': 15 }[breakReason];
  const stateSecs =
    state === 'Ready' ? int(4, 420) : state === 'In call' ? int(20, 640) : state === 'Wrap-up' ? int(5, 95) : state === 'Paused' ? (i === 10 || i === 21 ? Math.round((breakLimit || 15) * 60 * 1.35) : int(60, (breakLimit || 15) * 60 * 0.7)) : state === 'Manual dial' ? int(8, 160) : int(600, 7200);
  const callsToday = state === 'Logged out' ? int(0, 22) : int(18, 74);
  const campaignId = groupCampaigns[0] || 'cmp_inbound';
  return {
    id: `AG-${1042 + i * 7}`,
    name,
    group,
    state,
    // relative to the real clock so live timers tick from a believable value
    stateSince: new Date(Date.now() - stateSecs * 1000),
    breakReason,
    breakLimit,
    campaignId,
    campaign: CAMPAIGNS.find((c) => c.id === campaignId)?.name,
    campaigns: groupCampaigns.length ? groupCampaigns : ['cmp_inbound'],
    callsToday,
    talkToday: callsToday * int(80, 190),
    connectedToday: Math.round(callsToday * (0.32 + (i % 5) * 0.05)),
    qa: int(58, 96),
    active: i !== 26,
    lastLogin: minutesAgo(int(30, 420)),
    extension: `${7100 + i}`,
    currentCall:
      state === 'In call'
        ? { contact: person(), phone: phone(), sentiment: pickWeighted([['Positive', 35], ['Neutral', 45], ['Negative', 20]]), direction: pickWeighted([['outbound', 80], ['inbound', 20]]) }
        : null,
  };
});

CAMPAIGNS.forEach((c) => {
  c.agentCount = AGENTS.filter((a) => a.campaigns.includes(c.id)).length;
});

/* ---------------- groups & lines (DIDs) ---------------- */

export const GROUPS = [
  { id: 'grp_pune', name: 'Pune Sales', description: 'New-launch leads for Wakad and Hinjewadi', dids: ['8069 410 220', '8069 410 221', '8069 410 222'], inbound: false },
  { id: 'grp_mum', name: 'Mumbai Sales', description: 'Thane and Navi Mumbai projects', dids: ['2248 930 116', '2248 930 117'], inbound: false },
  { id: 'grp_ret', name: 'Retention', description: 'Renewals, upgrades and cross-sell', dids: ['2248 930 115'], inbound: false },
  { id: 'grp_in', name: 'Inbound Desk', description: 'Toll-free and website callbacks', dids: ['1800 270 4455', '8069 410 230'], inbound: true },
].map((g) => ({
  ...g,
  agents: AGENTS.filter((a) => a.group === g.name).map((a) => a.id),
  campaigns: CAMPAIGNS.filter((c) => c.group === g.name).map((c) => c.id),
}));

const OPERATORS = ['Jio', 'Airtel', 'Vi', 'BSNL'];
const DID_DEFS = [
  ['8069 410 220', 'Pune Sales', 'Healthy'],
  ['8069 410 221', 'Pune Sales', 'Likely spam'],
  ['8069 410 222', 'Pune Sales', 'Healthy'],
  ['2248 930 115', 'Retention', 'Healthy'],
  ['2248 930 116', 'Mumbai Sales', 'Healthy'],
  ['2248 930 117', 'Mumbai Sales', 'Likely spam'],
  ['1800 270 4455', 'Inbound Desk', 'Healthy'],
  ['8069 410 230', 'Inbound Desk', 'Line down'],
];
export const DIDS = DID_DEFS.map(([number, group, verdict], i) => {
  const baseline = int(36, 48);
  const today = verdict === 'Healthy' ? baseline + int(-4, 5) : verdict === 'Likely spam' ? Math.round(baseline * (0.38 + i * 0.02)) : 0;
  const spark = range(14, (d) => (verdict === 'Likely spam' && d > 9 ? Math.round(baseline * (0.85 - (d - 9) * 0.1)) : verdict === 'Line down' && d === 13 ? 0 : baseline + int(-5, 5)));
  const labelFor = (op) => {
    if (verdict === 'Likely spam') return op === 'Jio' ? 'Spam' : op === 'Airtel' ? 'Suspected fraud' : op === 'Vi' ? 'Spam' : 'Clean';
    return 'Clean';
  };
  return {
    id: `did_${i}`,
    number,
    group,
    type: number.startsWith('1800') ? 'Toll-free' : 'Mobile-range DID',
    callsToday: verdict === 'Line down' ? 0 : int(180, 640),
    connectToday: today,
    baseline,
    spark: [...spark.slice(0, 13), today],
    verdict,
    reason:
      verdict === 'Likely spam'
        ? `Connect rate fell from ${baseline}% to ${today}% in 4 days; ${i % 2 ? '2' : '3'} operators show a spam label.`
        : verdict === 'Line down'
          ? 'No call has connected since 11:42. Carrier returns "503 Service unavailable".'
          : 'Connect rate within the usual range.',
    lastCheck: minutesAgo(int(40, 600)),
    spamChecks: OPERATORS.map((op) => ({ operator: op, label: verdict === 'Line down' ? 'Not checked' : labelFor(op), checkedAt: minutesAgo(int(60, 900)) })),
  };
});

/* ---------------- dispositions (manager + workspace picker) ---------------- */

export const DISPOSITION_ITEMS = [
  { id: 1, name: 'Interested', description: 'Wants to go ahead; share details and follow up.', category: 'Positive', callback: true, active: true, sub: ['Hot: ready this month', 'Warm: 1–3 months', 'Needs loan help'], count: 412 },
  { id: 2, name: 'Site visit booked', description: 'Date and time fixed for a project visit.', category: 'Positive', callback: true, active: true, sub: ['Weekday', 'Weekend'], count: 186 },
  { id: 3, name: 'Token amount paid', description: 'Booking amount received.', category: 'Positive', callback: false, active: true, sub: [], count: 22 },
  { id: 4, name: 'Call back later', description: 'Asked to be called at another time.', category: 'Neutral', callback: true, active: true, sub: ['Busy right now', 'Talk to family first', 'Call after salary'], count: 538 },
  { id: 5, name: 'Send details on WhatsApp', description: 'Wants brochure / price sheet first.', category: 'Neutral', callback: true, active: true, sub: ['Brochure', 'Price sheet', 'Location pin'], count: 301 },
  { id: 6, name: 'Not interested', description: 'Does not want to buy.', category: 'Negative', callback: false, active: true, sub: ['Budget mismatch', 'Location not suitable', 'Already bought', 'Just browsing'], count: 744 },
  { id: 7, name: 'DNC requested', description: 'Asked not to be called again. Adds to Do Not Call.', category: 'Negative', callback: false, active: true, sub: [], count: 19 },
  { id: 8, name: 'Wrong number', description: 'Number does not belong to the lead.', category: 'Negative', callback: false, active: true, sub: [], count: 63 },
  { id: 9, name: 'No answer', description: 'Rang out.', category: 'Not reached', callback: false, active: true, sub: [], count: 1290 },
  { id: 10, name: 'Switched off', description: 'Phone switched off or not reachable.', category: 'Not reached', callback: false, active: true, sub: [], count: 402 },
  { id: 11, name: 'Voicemail', description: 'Went to voicemail.', category: 'Not reached', callback: false, active: false, sub: [], count: 31 },
];

/* ---------------- break / pause codes ---------------- */

export const BREAK_CODES = [
  { id: 'brk_lunch', name: 'Lunch', countsAsBreak: true, maxMinutes: 30, active: true, usedToday: 21, avgMinutes: 27 },
  { id: 'brk_tea', name: 'Tea break', countsAsBreak: true, maxMinutes: 10, active: true, usedToday: 44, avgMinutes: 9 },
  { id: 'brk_bio', name: 'Bio break', countsAsBreak: true, maxMinutes: 5, active: true, usedToday: 63, avgMinutes: 4 },
  { id: 'brk_training', name: 'Training', countsAsBreak: false, maxMinutes: 60, active: true, usedToday: 6, avgMinutes: 48 },
  { id: 'brk_meeting', name: 'Team meeting', countsAsBreak: false, maxMinutes: 30, active: true, usedToday: 4, avgMinutes: 22 },
  { id: 'brk_system', name: 'System issue', countsAsBreak: false, maxMinutes: 15, active: true, usedToday: 3, avgMinutes: 11 },
  { id: 'brk_qa', name: 'QA feedback', countsAsBreak: false, maxMinutes: 20, active: false, usedToday: 0, avgMinutes: 0 },
];

/* ---------------- contact lists ---------------- */

export const LISTS = [
  { id: 'lst_wakad', name: 'Wakad website enquiries', records: 2600, dialable: 812, source: 'Website form', uploadedAt: daysAgo(18), uploadedBy: 'Riya Malhotra' },
  { id: 'lst_fb_nov', name: 'Facebook leads – Nov', records: 1600, dialable: 574, source: 'Facebook Lead Ads', uploadedAt: daysAgo(9), uploadedBy: 'Riya Malhotra' },
  { id: 'lst_hinj', name: 'Hinjewadi expo walk-ins', records: 1850, dialable: 612, source: 'CSV upload', uploadedAt: daysAgo(12), uploadedBy: 'Sameer Khan' },
  { id: 'lst_renew', name: 'Maintenance renewals 2026', records: 1240, dialable: 96, source: 'CRM export', uploadedAt: daysAgo(26), uploadedBy: 'Sameer Khan' },
  { id: 'lst_diwali', name: 'Diwali offer – Mumbai', records: 6400, dialable: 0, source: 'CSV upload', uploadedAt: daysAgo(40), uploadedBy: 'Riya Malhotra' },
  { id: 'lst_loan', name: 'Home loan pre-approved', records: 780, dialable: 780, source: 'Partner bank', uploadedAt: daysAgo(3), uploadedBy: 'Riya Malhotra' },
].map((l) => {
  const done = l.records - l.dialable;
  const breakdown = [
    ['No answer', 0.3],
    ['Not interested', 0.22],
    ['Call back later', 0.16],
    ['Interested', 0.12],
    ['Switched off', 0.1],
    ['Busy', 0.06],
    ['Wrong number', 0.04],
  ].map(([name, share]) => ({ name, value: Math.round(done * share) }));
  return {
    ...l,
    campaigns: CAMPAIGNS.filter((c) => c.lists.includes(l.id)).map((c) => c.name),
    breakdown,
    churns: l.id === 'lst_wakad' || l.id === 'lst_diwali'
      ? [
          { id: `${l.id}_c1`, at: daysAgo(6, 10), by: 'Riya Malhotra', dispositions: ['No answer', 'Busy'], records: 612 },
          { id: `${l.id}_c2`, at: daysAgo(2, 17), by: 'Riya Malhotra', dispositions: ['Call back later', 'Switched off'], records: 288 },
        ]
      : [],
  };
});

/* ---------------- inbound routing ---------------- */

export const INBOUND_ROUTES = [
  { id: 'in_1', did: '1800 270 4455', label: 'Toll-free (website & ads)', group: 'Inbound Desk', strategy: 'Longest available', hours: 'Mon–Sat · 09:00–21:00', overflow: 'Voicemail', holdMusic: 'Calm piano', maxWait: 120, active: true, waiting: 3 },
  { id: 'in_2', did: '8069 410 230', label: 'Pune site office', group: 'Inbound Desk', strategy: 'Round robin', hours: 'Mon–Sun · 10:00–19:00', overflow: 'Pune Sales', holdMusic: 'RR Parko jingle', maxWait: 90, active: true, waiting: 0 },
  { id: 'in_3', did: '2248 930 115', label: 'Retention call-backs', group: 'Retention', strategy: 'Last agent first', hours: 'Mon–Fri · 09:30–18:30', overflow: 'Callback request', holdMusic: 'Calm piano', maxWait: 60, active: true, waiting: 1 },
  { id: 'in_4', did: '8069 410 220', label: 'Wakad missed-call returns', group: 'Pune Sales', strategy: 'Last agent first', hours: 'Mon–Sat · 10:00–19:30', overflow: 'Voicemail', holdMusic: 'None (ringback)', maxWait: 45, active: false, waiting: 0 },
];

/* ---------------- DNC ---------------- */

export const DNC = range(34, (i) => ({
  id: `dnc_${i}`,
  phone: phone(),
  reason: pick(['Customer request', 'Customer request', 'Legal complaint', 'Wrong number', 'TRAI DND']),
  scope: 'tenant',
  addedBy: pick(['Riya Malhotra', 'Rahul Verma', 'Priya Nair', 'System']),
  addedAt: daysAgo(int(0, 80)),
  source: pick(['Disposition', 'Manual', 'CSV upload']),
}));

/* ---------------- huddles ---------------- */

export const HUDDLES = [
  { id: 'hd_1', at: minutesAgo(22), by: 'Riya Malhotra', message: 'Wakad price revision: 2BHK now starts at ₹82 L (not ₹79 L). Please update the pitch.', agents: 14, acked: 12, needsAck: true },
  { id: 'hd_2', at: minutesAgo(140), by: 'Riya Malhotra', message: 'Lunch in two batches today: A at 1:00, B at 1:30.', agents: 26, acked: 26, needsAck: false },
  { id: 'hd_3', at: minutesAgo(310), by: 'Sameer Khan', message: 'Saturday site-visit slots are full. Offer Sunday 11 AM instead.', agents: 9, acked: 9, needsAck: true },
];

/* ---------------- calls ---------------- */

const LIVE_CAMPAIGNS = CAMPAIGNS.filter((c) => c.status === 'Active');
export const CALLS = range(220, () => {
  const a = pick(AGENTS);
  const c = makeCall({ agentKind: 'human', agentName: a.name, campaign: pick(LIVE_CAMPAIGNS).name, withScore: int(0, 2) === 0 });
  c.agentId = a.id;
  return c;
}).sort((a, b) => b.startedAt - a.startedAt);

export const MY_CALLS = range(64, (i) => {
  const c = makeCall({ agentKind: 'human', agentName: 'Rahul Verma', campaign: pick(['Wakad 2BHK leads', 'Wakad 2BHK leads', 'Hinjewadi site visits']), minutesBack: i < 20 ? int(5, 360) : undefined });
  c.agentId = 'AG-1042';
  return c;
}).sort((a, b) => b.startedAt - a.startedAt);

export const LIVE_CALLS = AGENTS.filter((a) => a.state === 'In call').map((a) => ({
  id: `live_${a.id}`,
  agent: a,
  contact: { name: a.currentCall.contact, phone: a.currentCall.phone },
  campaign: a.campaign,
  direction: a.currentCall.direction,
  startedAt: a.stateSince,
  sentiment: a.currentCall.sentiment,
}));

/* ---------------- workspace (agent) ---------------- */

export const SCRIPT = {
  title: 'Wakad 2BHK – first call',
  blocks: [
    { id: 'open', label: 'Opening', text: 'Namaste {lead_name} ji, main {agent_name} bol raha hoon RR Parko se. Aapne {source} par {project} ke baare mein enquiry ki thi. Kya 2 minute baat kar sakte hain?' },
    { id: 'need', label: 'Discovery', text: 'Aap kis configuration ke liye dekh rahe hain, aur aapka budget roughly kitna hai? Possession kab tak chahiye?' },
    { id: 'pitch', label: 'Pitch', text: '{project} mein 2BHK {price} se start hote hain, possession {possession}. Covered parking aur clubhouse included hai.' },
    { id: 'close', label: 'Close', text: 'Kya main aapke liye is weekend site visit book kar doon? Saturday ya Sunday, kaunsa din theek rahega?' },
  ],
  vars: { project: 'Parko Heights, Wakad', price: '₹82 L', possession: 'December 2027' },
};

export const COLLECT_FIELDS = [
  { key: 'budget', label: 'Budget', type: 'select', options: ['Under ₹60 L', '₹60–80 L', '₹80 L–1 Cr', 'Above ₹1 Cr'] },
  { key: 'config', label: 'Configuration', type: 'select', options: ['1BHK', '2BHK', '3BHK'] },
  { key: 'timeline', label: 'Buying in', type: 'select', options: ['This month', '1–3 months', '3–6 months', 'Just exploring'] },
  { key: 'loan', label: 'Needs home loan', type: 'select', options: ['Yes', 'No', 'Not sure'] },
  { key: 'email', label: 'Email', type: 'text', placeholder: 'name@example.com' },
];

const LEAD_TAGS = [['First call'], ['Hot', 'Site visit due'], ['Callback'], ['NRI'], ['Repeat enquiry'], ['Loan needed']];
export const LEADS = range(12, (i) => {
  const name = person();
  const prior = int(0, 3);
  return {
    id: `lead_${i}`,
    name,
    phone: phone(),
    city: pick(CITIES),
    source: pick(['Website form', 'Facebook Lead Ads', '99acres', 'MagicBricks', 'Walk-in']),
    tags: LEAD_TAGS[i % LEAD_TAGS.length],
    attempts: prior,
    history: range(prior, (k) => ({
      at: daysAgo(int(1, 9) + k * 3, int(10, 18)),
      agent: pick(AGENT_NAMES.slice(0, 8)),
      disposition: pick(['No answer', 'Call back later', 'Busy', 'Send details on WhatsApp']),
      duration: int(0, 1) ? int(30, 240) : 0,
      note: pick(['Asked to call after 6 PM.', 'Comparing with Kolte Patil project.', '', 'Wife will join the next call.']),
    })),
  };
});

export const WORKSPACE_CAMPAIGNS = CAMPAIGNS.filter((c) => ['cmp_wakad', 'cmp_hinj', 'cmp_inbound'].includes(c.id));

export const MY_STATS = { calls: 37, talk: 5160, connected: 16, target: 60 };

/** Callbacks are relative to the real clock so "due in 10 min" stays true. */
const realAgo = (m) => new Date(Date.now() - m * 60000);
export const CALLBACKS = [
  ...range(4, (i) => ({ id: `cb_due_${i}`, section: 'due', due: realAgo(int(-10, 25)), name: person(), phone: phone(), campaign: 'Wakad 2BHK leads', lastDisposition: pick(['Call back later', 'Interested']), note: pick(['Call after office hours, wife will also join.', 'Wants price for 2BHK east-facing.', 'Asked for Saturday visit slot.', 'Loan eligibility discuss karna hai.']) })),
  ...range(7, (i) => ({ id: `cb_up_${i}`, section: 'upcoming', due: new Date(Date.now() + int(40, 60 * 48) * 60000), name: person(), phone: phone(), campaign: pick(['Wakad 2BHK leads', 'Hinjewadi site visits']), lastDisposition: pick(['Call back later', 'Send details on WhatsApp', 'Interested']), note: pick(['Brochure bhej diya, feedback lena hai.', 'After salary credit (1st).', '', 'Comparing with another project.']) })),
  ...range(3, (i) => ({ id: `cb_miss_${i}`, section: 'missed', due: realAgo(int(120, 60 * 30)), name: person(), phone: phone(), campaign: 'Wakad 2BHK leads', lastDisposition: 'Call back later', note: pick(['Was driving, asked to call back.', 'Call in the evening.', '']) })),
].sort((a, b) => a.due - b.due);

/* ---------------- overview + reports ---------------- */

export const HOURLY = range(12, (i) => {
  const h = 9 + i;
  const past = h <= 15;
  const dialled = past ? int(180, 420) + (h === 11 || h === 12 ? 140 : 0) : 0;
  return { hour: `${h}:00`, dialled, connected: Math.round(dialled * (0.34 + (i % 3) * 0.03)), lastWeek: int(200, 440) };
});

export const CALLS_14D = lastDays(14, () => ({ dialled: int(2400, 3600), connected: int(860, 1300) }));

const SHIFT_START = 9 * 60; // 09:00
const SHIFT_END = 18 * 60 + 30; // 18:30
const NOW_MIN = 15 * 60 + 30;

/** Status segments for one agent's day. Deterministic per agent id + date. */
export function statusDay(agentId, dateKey = 'today') {
  const seed = ([...`${agentId}:${dateKey}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) % 2147483646) + 1;
  reseed(seed);
  const end = dateKey === 'today' ? NOW_MIN : SHIFT_END;
  const segs = [];
  let t = SHIFT_START + int(0, 20);
  let lunchDone = false;
  while (t < end) {
    let state;
    let len;
    if (!lunchDone && t > 13 * 60) {
      state = 'Paused';
      len = int(26, 44);
      lunchDone = true;
      segs.push({ state, start: t, end: Math.min(end, t + len), reason: 'Lunch' });
      t += len;
      continue;
    }
    state = pickWeighted([['In call', 46], ['Ready', 22], ['Wrap-up', 16], ['Paused', 6], ['Manual dial', 6]]);
    len = state === 'In call' ? int(4, 18) : state === 'Ready' ? int(2, 9) : state === 'Wrap-up' ? int(1, 3) : state === 'Paused' ? int(4, 15) : int(1, 4);
    const prev = segs[segs.length - 1];
    if (prev && prev.state === state) prev.end = Math.min(end, t + len);
    else segs.push({ state, start: t, end: Math.min(end, t + len), reason: state === 'Paused' ? pick(['Tea break', 'Bio break', 'Team meeting', 'System issue']) : undefined });
    t += len;
  }
  return { start: SHIFT_START, end: SHIFT_END, now: dateKey === 'today' ? NOW_MIN : null, login: segs[0]?.start, segments: segs };
}

/** APR rows: Login = Available + Talk + Wrap + Hold + Pauses (seconds). */
export function aprRows(campaignId = 'all', days = 1) {
  reseed(campaignId.length * 97 + days * 13);
  const pool = AGENTS.filter((a) => campaignId === 'all' || a.campaigns.includes(campaignId)).filter((a) => a.active);
  return pool.map((a) => {
    const login = Math.round(days * int(6.2 * 3600, 8.6 * 3600));
    const pauses = Math.round(login * (int(8, 22) / 100));
    const hold = Math.round(login * (int(1, 5) / 100));
    const wrap = Math.round(login * (int(7, 14) / 100));
    const talk = Math.round(login * (int(34, 56) / 100));
    const available = login - pauses - hold - wrap - talk;
    const calls = Math.round(days * int(48, 96));
    return { id: a.id, name: a.name, group: a.group, login, available, talk, wrap, hold, pauses, calls, aht: Math.round((talk + wrap + hold) / Math.max(calls, 1)) };
  });
}
