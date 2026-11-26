import { reseed, rand, int, pick, pickWeighted, range, person, phone, minutesAgo, daysAgo, id, now } from './seed';
import { makeCall } from './calls';

/*
 * Business Pulse mock data. Everything is scoped to a process (a client project such as "RR Parko – Sales").
 * Each process is generated once, from its own seed, so screens look the same on every reload.
 */

/* ---------------- QA parameters (shape matches makeCall().parameters) ---------------- */

export const PARAMS = [
  { key: 'opening', name: 'Opening and introduction', short: 'Opening', max: 10 },
  { key: 'discovery', name: 'Need discovery', short: 'Discovery', max: 20 },
  { key: 'product', name: 'Product knowledge', short: 'Product', max: 20 },
  { key: 'objection', name: 'Objection handling', short: 'Objections', max: 20 },
  { key: 'compliance', name: 'Compliance: price disclosure', short: 'Compliance', max: 10, fatal: true },
  { key: 'closing', name: 'Closing and next step', short: 'Closing', max: 20 },
];

export const PASS_MARK = 70;

export const VIBES = ['Happy', 'Neutral', 'Confused', 'Frustrated', 'Angry'];

export const FEATURES = [
  { key: 'scoring', label: 'Call scoring', description: 'Transcribe and score every call against the QA checklist.' },
  { key: 'coach', label: 'AI coach', description: 'Coaching plans and role-play with Diya.' },
  { key: 'emails', label: 'Daily agent emails', description: 'Each agent gets yesterday’s scores and one tip.' },
  { key: 'metrics', label: 'Custom metrics', description: 'Track anything described in plain English.', enterprise: true },
  { key: 'delta', label: 'Quality delta', description: 'Before / after view of quality per parameter.', enterprise: true },
  { key: 'compare', label: 'Compare periods', description: 'Up to 10 periods side by side.', enterprise: true },
  { key: 'ghost', label: 'Ghost leads', description: 'High-intent calls where revenue slipped away.', enterprise: true },
  { key: 'sync', label: 'Dialer sync', description: 'Pull recordings from Vicidial on a schedule.' },
];

const NOTES = {
  opening: { good: 'Greeted by name, introduced self and company within 10 seconds.', bad: 'Skipped the company name and jumped straight to the pitch.' },
  discovery: { good: 'Asked budget, location, family size and timeline.', bad: 'Asked budget and location, missed timeline and decision maker.' },
  product: { good: 'Explained carpet area, possession date and amenities correctly.', bad: 'Quoted the wrong possession quarter for Tower B.' },
  objection: { good: 'Handled the “price zyada hai” objection with the EMI breakup.', bad: 'Went silent when the customer compared with a Hinjewadi project.' },
  compliance: { good: 'Disclosed GST, parking and maintenance charges.', bad: 'Said “koi hidden charge nahi” without disclosing GST and parking.' },
  closing: { good: 'Booked a site visit with date and time, confirmed on WhatsApp.', bad: 'Ended with “sochke batana” and no next step.' },
};

const FATAL_QUOTES = [
  '“Sir yeh all-inclusive price hai, upar se kuch nahi lagega.”',
  '“GST ka tension mat lijiye, woh hum adjust kar denge.”',
  '“Parking free hai sir, likh ke de sakta hoon.”',
  '“Loan toh guaranteed approve ho jayega, main bol raha hoon.”',
  '“Possession next year pakka, builder ne promise kiya hai.”',
  '“Aaj book karo toh 5 lakh off, yeh offer sirf aaj ke liye hai.”',
];

const COLLECTION_SCRIPT = [
  ['agent', 'Namaste {name} ji, main {agent} bol raha hoon RR Parko Finance se. Aapki November ki EMI ke baare mein call kiya hai.'],
  ['customer', 'Haan, salary late aayi hai is baar.'],
  ['agent', 'Samajh sakta hoon. ₹24,500 due hai aur 5 tareekh ke baad late fee lagegi. Kya aap 3 December tak pay kar paayenge?'],
  ['customer', '3 tak toh mushkil hai, 7 tak ho jayega.'],
  ['agent', 'Theek hai, main 7 December ka promise-to-pay note kar raha hoon. Payment link WhatsApp par bhej deta hoon.'],
  ['customer', 'Okay, bhej dijiye.'],
  ['agent', 'Dhanyavaad {name} ji. Link par UPI ya net banking dono chalenge.'],
];

/* ---------------- Process definitions ---------------- */

const PROCESS_DEFS = [
  {
    id: 'proc_sales',
    name: 'RR Parko – Sales',
    short: 'Sales',
    kind: 'sales',
    active: true,
    enterprise: true,
    campaigns: ['Wakad 2BHK', 'Hinjewadi launch', 'Baner NRI', 'Diwali offer'],
    dispositions: ['Interested', 'Site visit booked', 'Call back later', 'Not interested', 'Wrong number'],
    agents: 12,
    seed: 101,
    parameterSet: 'Sales QA v3',
  },
  {
    id: 'proc_collections',
    name: 'RR Parko – Collections',
    short: 'Collections',
    kind: 'collections',
    active: true,
    enterprise: true,
    campaigns: ['EMI due Nov', 'Bounce recovery', 'Maintenance dues'],
    dispositions: ['Promise to pay', 'Paid', 'Refused to pay', 'Call back later', 'Wrong number'],
    agents: 9,
    seed: 202,
    parameterSet: 'Collections QA v2',
  },
  {
    id: 'proc_support',
    name: 'RR Parko – Support',
    short: 'Support',
    kind: 'support',
    active: true,
    enterprise: false,
    campaigns: ['Possession queries', 'Complaints'],
    dispositions: ['Resolved', 'Escalated', 'Call back later', 'Ticket raised'],
    agents: 7,
    seed: 303,
    parameterSet: 'Support QA v1',
  },
];

const TEAMS = ['Team Phoenix', 'Team Falcon', 'Team Orion'];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function buildAgents(def) {
  return range(def.agents, (i) => {
    const name = i === 2 ? 'Rahul Verma' : person();
    const skill = i === 2 ? 0.71 : 0.52 + rand() * 0.4;
    const bias = Object.fromEntries(PARAMS.map((p) => [p.key, (rand() - 0.5) * 0.36]));
    const drift = i === 2 ? 0.09 : -0.09 + rand() * 0.22; // how fast the agent is improving (or slipping)
    return {
      id: `ag_${def.short.toLowerCase()}_${i + 1}`,
      name,
      empId: `AG-${1040 + i + (def.seed % 7) * 20}`,
      email: `${name.split(' ')[0].toLowerCase()}@rrparko.in`,
      team: TEAMS[i % 3],
      status: i === def.agents - 1 ? 'Inactive' : i === 5 ? 'On leave' : 'Active',
      skill,
      bias,
      drift,
      joinedAt: daysAgo(int(60, 900)),
    };
  }).filter((a, i, all) => all.findIndex((b) => b.name === a.name) === i);
}

function scoreParams(agent, daysBack) {
  const growth = ((60 - Math.min(daysBack, 60)) / 60) * agent.drift;
  const fatalChance = 0.03 + (1 - agent.skill) * 0.16;
  const fatal = rand() < fatalChance;
  const params = PARAMS.map((p) => {
    if (p.fatal) return { name: p.name, key: p.key, score: fatal ? 0 : p.max, max: p.max, fatal: true, note: fatal ? NOTES[p.key].bad : undefined };
    const ratio = clamp(agent.skill + agent.bias[p.key] + growth + (rand() - 0.5) * 0.3, 0.15, 1);
    const score = Math.round(ratio * p.max);
    const note = ratio < 0.6 ? NOTES[p.key].bad : ratio > 0.85 && rand() < 0.5 ? NOTES[p.key].good : undefined;
    return { name: p.name, key: p.key, score, max: p.max, note };
  });
  return { params, fatal };
}

function buildCalls(def, agents) {
  const calls = [];
  agents.forEach((agent) => {
    const n = agent.status === 'Inactive' ? int(6, 12) : int(30, 52);
    for (let k = 0; k < n; k++) {
      const minutesBack = k === 0 ? int(20, 300) : int(30, 60 * 24 * 60);
      let call;
      for (let tries = 0; tries < 6; tries++) {
        call = makeCall({ agentKind: 'human', agentName: agent.name, campaign: pick(def.campaigns), withScore: true, minutesBack });
        if (call.status === 'Completed') break;
      }
      if (call.status !== 'Completed') continue;
      const daysBack = minutesBack / 1440;
      const { params, fatal } = scoreParams(agent, daysBack);
      const score = params.reduce((a, p) => a + p.score, 0);
      const processing = minutesBack < 90 && rand() < 0.5;
      call.agent = { name: agent.name, kind: 'human', id: agent.id };
      call.agentId = agent.id;
      call.processId = def.id;
      call.vibe = call.sentiment === 'Positive' ? pickWeighted([['Happy', 80], ['Neutral', 20]]) : call.sentiment === 'Negative' ? pickWeighted([['Frustrated', 60], ['Angry', 25], ['Confused', 15]]) : pickWeighted([['Neutral', 70], ['Confused', 30]]);
      call.duration = Math.max(call.duration, 70);
      if (def.kind !== 'sales') {
        call.disposition = pick(def.dispositions);
        if (def.kind === 'collections') {
          let t = 2;
          call.transcript = COLLECTION_SCRIPT.map(([speaker, text]) => {
            const line = { speaker, text: text.replace('{agent}', agent.name.split(' ')[0]).replace('{name}', call.contact.name.split(' ')[0]), t };
            t += int(5, 14);
            return line;
          });
          call.summary = `${call.contact.name.split(' ')[0]} has ₹24,500 EMI due. Salary delayed this month. ${call.disposition === 'Promise to pay' ? 'Promised to pay by 7 Dec; payment link sent on WhatsApp.' : 'No firm commitment yet.'}`;
          call.fields = [
            { label: 'Amount due', value: '₹24,500' },
            { label: 'Days past due', value: String(int(3, 40)) },
            { label: 'Promise date', value: call.disposition === 'Promise to pay' ? '7 Dec' : '—' },
          ];
        } else {
          call.summary = `${call.contact.name.split(' ')[0]} called about possession timeline for Tower B. ${call.disposition === 'Resolved' ? 'Shared the updated date and handover checklist.' : 'Raised a ticket with the site team.'}`;
          call.fields = [{ label: 'Tower', value: 'B' }, { label: 'Issue', value: 'Possession date' }];
        }
      }
      if (processing) {
        call.status = 'Processing';
        call.score = undefined;
        call.parameters = undefined;
        call.fatal = false;
      } else {
        call.parameters = params;
        call.score = score;
        call.fatal = fatal;
        call.status = fatal || score < PASS_MARK ? 'Failed' : 'Passed';
        if (fatal) {
          call.tags = ['Fatal error'];
          call.fatalQuote = pick(FATAL_QUOTES);
        }
      }
      call.meta = [
        { label: 'Process', value: def.name },
        { label: 'Parameter set', value: def.parameterSet },
        { label: 'Call vibe', value: call.vibe },
      ];
      calls.push(call);
    }
  });
  return calls.sort((a, b) => b.startedAt - a.startedAt);
}

/* ---------------- Coaching sessions ---------------- */

const SKILLS = ['Need discovery', 'Objection handling', 'Price disclosure', 'Closing', 'Product knowledge'];

function buildSessions(def, agents) {
  return range(def.agents * 2 + 4, (i) => {
    const agent = agents[i % agents.length];
    const status = i < 3 ? ['Plan ready', 'In progress', 'Grading'][i] : pickWeighted([['Completed', 55], ['Not attempted', 10], ['Plan ready', 10], ['Unfinished', 10], ['In progress', 8], ['Grading', 7]]);
    const done = status === 'Completed';
    const overall = done ? int(48, 92) : null;
    const verdict = done ? (overall >= 78 ? 'Ready' : overall >= 62 ? 'Needs retraining' : 'Not ready') : null;
    const focus = [pick(SKILLS.slice(0, 2)), pick(SKILLS.slice(2))];
    return {
      id: id('cs'),
      agentId: agent.id,
      agentName: agent.name,
      status,
      focus,
      createdAt: daysAgo(Math.floor(i / 2), int(9, 18)),
      duration: done || status === 'Grading' || status === 'Unfinished' ? int(180, 720) : null,
      overall,
      verdict,
      skills: done
        ? SKILLS.map((s) => ({ name: s, score: clamp(overall / 100 + (rand() - 0.5) * 0.3, 0.3, 0.98) * 100 })).map((s) => ({ ...s, score: Math.round(s.score) }))
        : null,
      history: done ? range(int(2, 5), (k) => int(40, 70) + k * int(3, 8)).concat(overall) : null,
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------------- Custom metrics ---------------- */

const METRIC_DEFS = [
  { name: 'Customer asked for a discount', description: 'The customer asks for a lower price, an offer or a waiver in any language.', rate: 0.24, trend: 'up' },
  { name: 'Customer mentioned a competitor', description: 'The customer names another builder or project (Godrej, Kolte Patil, VTP…).', rate: 0.13, trend: 'up' },
  { name: 'Home loan question', description: 'The customer asks about loan eligibility, bank tie-ups or pre-approval.', rate: 0.31, trend: 'flat' },
  { name: 'Agent promised a callback', description: 'The agent commits to calling back at a specific time.', rate: 0.38, trend: 'down' },
  { name: 'Customer sounded rushed', description: 'The customer says they are busy, driving or in a meeting.', rate: 0.17, trend: 'down' },
  { name: 'Possession date doubt', description: 'The customer questions whether possession will happen on time.', rate: 0.09, trend: 'up' },
];

function buildMetrics(calls) {
  return METRIC_DEFS.map((m, i) => {
    const matched = calls.filter(() => rand() < m.rate);
    const base = m.rate * 100;
    const spark = range(14, (d) => Math.max(1, Math.round(base + (m.trend === 'up' ? d * 0.6 : m.trend === 'down' ? -d * 0.5 : 0) + (rand() - 0.5) * 6)));
    return {
      id: `met_${i + 1}`,
      ...m,
      count: matched.length,
      pct: (matched.length / Math.max(calls.length, 1)) * 100,
      delta: m.trend === 'up' ? int(4, 18) : m.trend === 'down' ? -int(3, 14) : (rand() - 0.5) * 3,
      spark,
      callIds: matched.map((c) => c.id),
      createdBy: pick(['Riya Malhotra', 'Sameer QA', 'Neha Ops']),
      createdAt: daysAgo(int(8, 60)),
    };
  });
}

/* ---------------- Ghost leads ---------------- */

const GHOSTS = [
  { want: '2BHK in Wakad under ₹85 L, possession by 2027', blocker: 'Agent could not answer the home-loan pre-approval question', value: 8200000 },
  { want: '3BHK with servant room in Baner for parents', blocker: 'No site visit offered even after the customer asked twice', value: 14500000 },
  { want: 'NRI booking with power of attorney support', blocker: 'Agent said NRI process “thoda complicated hai” and moved on', value: 11200000 },
  { want: 'Corner flat, east facing, higher floor', blocker: 'Agent did not check inventory and promised a callback that never happened', value: 9100000 },
  { want: 'Diwali offer: 5% off on 2BHK in Hinjewadi', blocker: 'Offer terms were unclear; customer thought GST was extra', value: 7400000 },
  { want: 'Ready-to-move 1BHK for rental income', blocker: 'Agent pitched an under-construction tower instead', value: 5600000 },
  { want: 'Two adjacent flats for a joint family', blocker: 'Combined pricing was never quoted', value: 17800000 },
  { want: 'Flexible payment plan (20:80)', blocker: 'Agent said payment plans are fixed, which is wrong', value: 8800000 },
];
const COLLECTION_GHOSTS = [
  { want: 'Wants to settle 3 pending EMIs in one go with a late-fee waiver', blocker: 'Agent had no authority to discuss a waiver and did not escalate', value: 96000 },
  { want: 'Asked for an EMI date shift to the 10th of every month', blocker: 'Agent said “nahi ho sakta” without checking policy', value: 294000 },
  { want: 'Ready to pay today if a UPI link is sent', blocker: 'Link never sent after the call', value: 24500 },
];

const MSG = (first, want, agent) =>
  `Namaste ${first} ji, main ${agent.split(' ')[0]} RR Parko se. Aapne “${want}” ke baare mein poocha tha — maine aapke liye details ready rakhi hain. Kya kal 11 baje 5 minute baat kar sakte hain? 🙏`;

function buildGhosts(def, calls) {
  const bank = def.kind === 'collections' ? COLLECTION_GHOSTS : GHOSTS;
  const pool = calls.filter((c) => c.score != null && ['Interested', 'Call back later', 'Promise to pay', 'Not interested', 'Escalated'].includes(c.disposition));
  return range(Math.min(27, pool.length), (i) => {
    const call = pool[(i * 7) % pool.length];
    const g = bank[i % bank.length];
    const first = call.contact.name.split(' ')[0];
    return {
      id: id('gl'),
      callId: call.id,
      customer: call.contact.name,
      phone: call.contact.phone,
      agentName: call.agent.name,
      agentId: call.agentId,
      intent: int(68, 97),
      want: g.want,
      blocker: g.blocker,
      value: Math.round(g.value * (0.85 + rand() * 0.3)),
      detectedAt: call.startedAt,
      status: i < 14 ? 'New' : pickWeighted([['Followed up', 50], ['Won', 22], ['Lost', 28]]),
      message: MSG(first, g.want, call.agent.name),
      signals: [pick(['Asked about price twice', 'Mentioned family visit', 'Asked for brochure', 'Said “budget is fine”']), pick(['Asked possession date', 'Compared with competitor', 'Asked about loan', 'Wanted site visit'])],
    };
  }).sort((a, b) => b.intent - a.intent);
}

/* ---------------- Parameter sets ---------------- */

const p = (name, description, max, opts = {}) => ({ id: id('prm'), name, description, max, weight: opts.weight ?? 1, fatal: !!opts.fatal, scorable: opts.scorable ?? true });

function buildParameterSets() {
  return [
    {
      id: 'ps_sales_v3',
      name: 'Sales QA v3',
      processId: 'proc_sales',
      status: 'Active',
      updatedAt: daysAgo(4),
      updatedBy: 'Riya Malhotra',
      documents: [
        { id: 'doc1', name: 'Parko Heights price sheet Nov.pdf', size: '1.2 MB', type: 'pdf' },
        { id: 'doc2', name: 'Objection handling playbook.docx', size: '340 KB', type: 'doc' },
        { id: 'doc3', name: 'RERA disclosure rules.txt', size: '18 KB', type: 'txt' },
      ],
      sections: [
        { id: 's1', name: 'Opening', parameters: [p('Greeting and introduction', 'Agent greets the customer by name and says their own name and “RR Parko” in the first 15 seconds.', 5), p('Permission to talk', 'Agent asks if this is a good time before pitching.', 5)] },
        { id: 's2', name: 'Discovery', parameters: [p('Budget and location', 'Agent asks for budget range and preferred location.', 10, { weight: 1.5 }), p('Timeline and decision maker', 'Agent asks when they plan to buy and who else decides.', 10)] },
        { id: 's3', name: 'Pitch', parameters: [p('Product knowledge', 'Carpet area, possession date, amenities and pricing are stated correctly as per the price sheet.', 20, { weight: 2 }), p('Objection handling', 'Agent acknowledges the concern and answers with facts (EMI breakup, comparisons) rather than pressure.', 20, { weight: 1.5 })] },
        { id: 's4', name: 'Compliance', parameters: [p('Price disclosure', 'All charges (GST, parking, maintenance, stamp duty) are disclosed. Saying there are no extra charges is a fatal error.', 10, { fatal: true, weight: 2 }), p('No false promises', 'Agent does not guarantee loan approval, returns or possession dates beyond RERA.', 0, { fatal: true, scorable: false })] },
        { id: 's5', name: 'Closing', parameters: [p('Next step booked', 'A site visit or callback is booked with date and time.', 15, { weight: 1.5 }), p('Summary and thanks', 'Agent summarises what was agreed and thanks the customer.', 5)] },
      ],
    },
    {
      id: 'ps_coll_v2',
      name: 'Collections QA v2',
      processId: 'proc_collections',
      status: 'Active',
      updatedAt: daysAgo(12),
      updatedBy: 'Sameer QA',
      documents: [{ id: 'doc4', name: 'RBI fair practices code.pdf', size: '2.4 MB', type: 'pdf' }],
      sections: [
        { id: 's1', name: 'Opening', parameters: [p('Identity verification', 'Agent confirms they are speaking to the borrower before sharing any loan detail.', 10, { fatal: true })] },
        { id: 's2', name: 'Negotiation', parameters: [p('Amount and due date stated', 'Exact due amount, late fee and date are stated.', 20), p('Promise to pay captured', 'Agent gets a specific date and mode of payment.', 30, { weight: 2 })] },
        { id: 's3', name: 'Conduct', parameters: [p('No threats or abuse', 'No threatening language, no calls to references about the debt.', 0, { fatal: true, scorable: false }), p('Empathy', 'Agent acknowledges hardship and offers options.', 20)] },
      ],
    },
    {
      id: 'ps_support_v1',
      name: 'Support QA v1',
      processId: 'proc_support',
      status: 'Draft',
      updatedAt: daysAgo(30),
      updatedBy: 'Neha Ops',
      documents: [],
      sections: [{ id: 's1', name: 'Resolution', parameters: [p('Issue understood', 'Agent restates the issue correctly.', 20), p('Resolution or ticket', 'Issue resolved or ticket raised with a number shared.', 30)] }],
    },
  ];
}

/* ---------------- Dialer sync ---------------- */

function buildSync() {
  const configs = [
    { id: 'sync_1', name: 'Pune floor Vicidial', server: 'https://vici-pune.rrparko.in', username: 'qa_sync', password: 'S3cure!pass', campaigns: ['WAKAD2BHK', 'HINJ_LAUNCH', 'BANER_NRI'], processId: 'proc_sales', schedule: 'Every 2 hours', window: '09:00–21:00', active: true, minDuration: 30, lastSync: minutesAgo(38), status: 'Healthy' },
    { id: 'sync_2', name: 'Collections dialer', server: 'https://vici-coll.rrparko.in', username: 'qa_sync', password: 'Coll#2026', campaigns: ['EMI_NOV', 'BOUNCE'], processId: 'proc_collections', schedule: 'Daily at 22:00', window: '—', active: true, minDuration: 20, lastSync: minutesAgo(60 * 17), status: 'Warning' },
  ];
  const history = range(16, (i) => {
    const cfg = configs[i % 2];
    const failed = i === 3;
    const fetched = failed ? 0 : int(40, 260);
    const skipped = failed ? 0 : int(0, 18);
    return {
      id: id('run'),
      configId: cfg.id,
      configName: cfg.name,
      startedAt: minutesAgo(38 + i * (i % 2 ? 300 : 120)),
      trigger: i === 0 ? 'Manual' : 'Schedule',
      fetched,
      scored: failed ? 0 : fetched - skipped - (i % 5 === 1 ? int(1, 6) : 0),
      skipped,
      errors: failed ? 1 : i % 5 === 1 ? int(1, 6) : 0,
      status: failed ? 'Failed' : i % 5 === 1 ? 'Partial' : 'Completed',
      errorText: failed ? 'Login failed: 401 from Vicidial API (password changed?)' : i % 5 === 1 ? 'Some recordings were shorter than 30 s or missing audio.' : null,
      duration: int(20, 180),
    };
  });
  return { configs, history: history.sort((a, b) => b.startedAt - a.startedAt) };
}

/* ---------------- Build + cache ---------------- */

const cache = {};

export function processData(processId) {
  if (cache[processId]) return cache[processId];
  const def = PROCESS_DEFS.find((d) => d.id === processId) || PROCESS_DEFS[0];
  reseed(def.seed);
  const agents = buildAgents(def);
  const calls = buildCalls(def, agents);
  const sessions = buildSessions(def, agents);
  const metrics = buildMetrics(calls.filter((c) => c.score != null));
  const ghosts = buildGhosts(def, calls);
  cache[processId] = { def, agents, calls, sessions, metrics, ghosts };
  return cache[processId];
}

let shared;
export function sharedData() {
  if (shared) return shared;
  reseed(909);
  shared = { parameterSets: buildParameterSets(), sync: buildSync() };
  return shared;
}

export function processList() {
  return PROCESS_DEFS.map((d) => {
    const { agents, calls } = processData(d.id);
    return {
      id: d.id,
      name: d.name,
      short: d.short,
      kind: d.kind,
      active: d.active,
      enterprise: d.enterprise,
      campaigns: d.campaigns,
      dispositions: d.dispositions,
      parameterSet: d.parameterSet,
      agentCount: agents.length,
      callCount: calls.length,
      dailyEmails: d.kind !== 'support',
      fatalRecipients: d.kind === 'collections' ? ['sameer@rrparko.in', 'compliance@rrparko.in'] : ['riya@rrparko.in', 'qa-leads@rrparko.in'],
      features: FEATURES.filter((f) => d.enterprise || !f.enterprise).map((f) => f.key).filter((k) => d.kind !== 'support' || k !== 'sync'),
      createdAt: daysAgo(d.kind === 'sales' ? 210 : d.kind === 'collections' ? 140 : 40),
    };
  });
}

export const CREDITS = { used: 8420, total: 10000, unit: 'calls' };

export { now };
