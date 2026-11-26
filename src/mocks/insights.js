import { lastDays, int, reseed, daysAgo, minutesAgo } from './seed';

/*
 * Insights mock answers. Every question ends in one of five outcomes:
 * metric (numbers + chart), narrative (verified quotes), action (needs Confirm), report (download), decline.
 * Plus `clarify` (which product?) and `compare` (side by side across products).
 */

export const SCOPES = [
  { value: 'all', label: 'All products' },
  { value: 'agentflow', label: 'Agent Flow' },
  { value: 'dialflow', label: 'DialFlow' },
  { value: 'ultrachat', label: 'UltraChat' },
  { value: 'businesspulse', label: 'Business Pulse' },
];

export const STARTERS = [
  {
    group: 'Diagnose',
    items: ['Kal kitne leads convert hue?', 'Why did connect rate drop on Tuesday?', 'Which agents scored below 60 this week?'],
  },
  {
    group: 'Compare',
    items: ['Compare AI vs human connect rate for November', 'How did Wakad leads do on calls vs WhatsApp?'],
  },
  {
    group: 'Act',
    items: ['Pause the Wakad 2BHK leads campaign', 'Add 98765 43210 to Do Not Call'],
  },
  {
    group: 'Report',
    items: ['Excel report of every fatal error this month, per agent', 'What did customers say about parking?'],
  },
];

export const CAPABILITIES = [
  { title: 'Numbers and charts', text: 'Counts, rates and trends from real records. Never an estimate.', kind: 'metric' },
  { title: 'Quotes from calls', text: 'Yes/no checks across thousands of calls, with verified quotes.', kind: 'narrative' },
  { title: 'Take actions', text: 'Pause a campaign, add a DNC number, place a test call. You confirm first.', kind: 'action' },
  { title: 'Build reports', text: 'Multi-sheet Excel files built in the background.', kind: 'report' },
];

export const SESSIONS = [
  { id: 's1', title: 'November conversions by source', updatedAt: minutesAgo(25), product: 'all', pinned: true },
  { id: 's2', title: 'Low QA agents this week', updatedAt: minutesAgo(180), product: 'businesspulse' },
  { id: 's3', title: 'Diwali WhatsApp campaign failures', updatedAt: daysAgo(1, 17), product: 'ultrachat' },
  { id: 's4', title: 'AI vs human connect rate', updatedAt: daysAgo(2, 12), product: 'all' },
  { id: 's5', title: 'Parking objections in Wakad calls', updatedAt: daysAgo(4, 10), product: 'businesspulse' },
  { id: 's6', title: 'Callbacks missed by evening shift', updatedAt: daysAgo(9, 19), product: 'dialflow' },
];

export const PINNED = [
  { id: 'p1', title: 'Leads converted per day', product: 'all', kind: 'trend', value: '612', delta: 14.2, updated: 'Updated 10 min ago' },
  { id: 'p2', title: 'Connect rate: AI vs human', product: 'all', kind: 'compare', value: '44% vs 37%', delta: 3.1, updated: 'Updated 1 h ago' },
  { id: 'p3', title: 'Fatal errors by agent', product: 'businesspulse', kind: 'bars', value: '23', delta: -18, inverse: true, updated: 'Updated 3 h ago' },
  { id: 'p4', title: 'WhatsApp reply rate by template', product: 'ultrachat', kind: 'bars', value: '6.2%', delta: 0.8, updated: 'Updated today' },
];

export const REPORTS = [
  { id: 'r1', name: 'Fatal errors by agent — November', product: 'businesspulse', sheets: 3, rows: 412, status: 'Ready', createdAt: minutesAgo(40), size: '186 KB' },
  { id: 'r2', name: 'Campaign outcomes, AI vs human', product: 'all', sheets: 4, rows: 9820, status: 'Ready', createdAt: daysAgo(1, 16), size: '1.2 MB' },
  { id: 'r3', name: 'Diwali template delivery failures', product: 'ultrachat', sheets: 2, rows: 312, status: 'Ready', createdAt: daysAgo(3, 11), size: '64 KB' },
  { id: 'r4', name: 'Callbacks due vs done — 30 days', product: 'dialflow', sheets: 2, rows: 1840, status: 'Processing', createdAt: minutesAgo(2), size: '—', progress: 62 },
];

export const DIGESTS = [
  { id: 'd1', name: 'Morning summary', when: 'Every day, 9:00', channel: 'WhatsApp', to: 'Riya Malhotra', active: true },
  { id: 'd2', name: 'Weekly QA digest', when: 'Mondays, 10:00', channel: 'Email', to: 'qa-team@rrparko.in', active: true },
  { id: 'd3', name: 'Anomaly alerts', when: 'When a metric moves 2σ', channel: 'Email', to: 'ops@rrparko.in', active: false },
];

export const CONNECTIONS = [
  { id: 'c1', client: 'ChatGPT', user: 'Riya Malhotra', connectedAt: daysAgo(6), lastUsed: minutesAgo(90), calls: 128 },
  { id: 'c2', client: 'Claude', user: 'Aditya Joshi', connectedAt: daysAgo(14), lastUsed: daysAgo(1, 18), calls: 54 },
];

/* ---------------- answer generators ---------------- */

const conversionTrend = () => {
  reseed(7);
  return lastDays(14, (i) => ({ converted: int(28, 52) + i, qualified: int(70, 110) + i * 2 }));
};

export function buildAnswer(question, scope = 'all') {
  const q = question.toLowerCase();
  const base = { id: Math.random().toString(36).slice(2), question, scope, createdAt: new Date() };

  if (/\b(pause|start|abort|add .*(dnc|do not call)|block|test call)\b/.test(q)) {
    const dnc = /dnc|do not call|block/.test(q);
    return {
      ...base,
      kind: 'action',
      product: dnc ? 'agentflow' : 'agentflow',
      text: dnc ? 'I can add this number to your Do Not Call list. Every campaign will skip it from now on.' : 'I found the campaign. Pausing stops new calls; calls in progress finish normally.',
      action: dnc
        ? { verb: 'Add to Do Not Call', target: '+91 98765 43210', details: [['List', 'RR Parko · tenant DNC'], ['Reason', 'Customer request'], ['Affects', '3 running campaigns']], confirmLabel: 'Add number' }
        : { verb: 'Pause campaign', target: 'Wakad 2BHK leads', details: [['Status now', 'Running · 68% done'], ['Contacts left', '798'], ['Calls in progress', '6 (will finish)']], confirmLabel: 'Pause campaign' },
      steps: ['Understanding the request', 'Finding the campaign', 'Preparing the action'],
    };
  }

  if (/report|excel|csv|sheet/.test(q)) {
    return {
      ...base,
      kind: 'report',
      product: 'businesspulse',
      text: 'I’m building this as an Excel file in the background. You can keep asking questions meanwhile.',
      report: { name: 'Fatal errors by agent — November.xlsx', sheets: ['Summary', 'By agent', 'Every call'], rows: 412 },
      steps: ['Planning the report', 'Querying 2,104 scored calls', 'Writing 3 sheets'],
    };
  }

  if (/compare|vs|versus/.test(q)) {
    reseed(11);
    return {
      ...base,
      kind: 'compare',
      product: 'all',
      text: 'AI agents connected more often and qualified a similar share of the calls they reached. Human agents booked more site visits per connected call.',
      compare: {
        columns: [
          { id: 'agentflow', label: 'Agent Flow (AI)' },
          { id: 'dialflow', label: 'DialFlow (human)' },
        ],
        rows: [
          { metric: 'Calls attempted', values: ['48,210', '21,904'] },
          { metric: 'Connect rate', values: ['44.1%', '37.2%'], better: 0 },
          { metric: 'Avg talk time', values: ['2m 14s', '3m 41s'] },
          { metric: 'Qualified', values: ['18.6%', '19.2%'], better: 1 },
          { metric: 'Site visits booked', values: ['4.1%', '6.8%'], better: 1 },
          { metric: 'Cost per qualified lead', values: ['₹38', '₹112'], better: 0 },
        ],
        chart: lastDays(10, () => ({ ai: int(40, 48), human: int(33, 40) })),
      },
      filters: ['November 2026', 'All campaigns', 'Outbound only'],
      coverage: 'Covers 70,114 calls. 212 calls without a recording were left out.',
      followUps: ['Which campaigns did AI beat humans on?', 'Show cost per site visit by week', 'Who are the top 5 human agents?'],
      steps: ['Routing to Agent Flow and DialFlow', 'Counting 70,114 calls', 'Lining up the numbers'],
    };
  }

  if (/why|said|say|quote|objection|parking|complain/.test(q)) {
    return {
      ...base,
      kind: 'narrative',
      product: 'businesspulse',
      text: 'Parking came up in 318 of 2,104 Wakad calls (15%). In most of them customers asked whether a second covered slot is available; 41 customers said it was a deal-breaker.',
      stats: [
        { label: 'Calls mentioning parking', value: '318', sub: '15.1% of calls' },
        { label: 'Said it’s a deal-breaker', value: '41', sub: '12.9% of those' },
        { label: 'Converted anyway', value: '96', sub: '30.2%' },
      ],
      quotes: [
        { text: 'Do gaadi hain humare paas, ek hi covered parking milegi toh mushkil hai.', who: 'Customer · call with Kavya Iyer', time: '02:14', verified: true },
        { text: 'Agar second parking ka option ho toh main isi weekend book kar dunga.', who: 'Customer · call with Rohan Mehta', time: '03:40', verified: true },
        { text: 'Visitors ke liye parking hai kya? Society mein jagah kam lagti hai.', who: 'Customer · Diya (AI)', time: '01:22', verified: true },
      ],
      followUps: ['Which agents handled the parking question best?', 'Create a metric for “asked about second parking”', 'Send these 41 customers a WhatsApp update'],
      coverage: 'Checked every Wakad call from 1–25 Nov. Quotes are verified word-for-word against transcripts.',
      steps: ['Routing to Business Pulse', 'Checking 2,104 transcripts', 'Verifying quotes'],
    };
  }

  if (/priyanka|xyz/.test(q)) {
    return {
      ...base,
      kind: 'decline',
      product: 'businesspulse',
      text: 'I couldn’t find an agent with that name, so I won’t guess a number.',
      suggestions: ['Kavya Iyer', 'Kavya Sharma'],
      steps: ['Looking up the agent'],
    };
  }

  if (/agent|below|score|qa/.test(q)) {
    return {
      ...base,
      kind: 'metric',
      product: 'businesspulse',
      headline: { value: '6', label: 'agents averaged below 60 this week', delta: -25, deltaLabel: 'vs last week (8)', inverse: true },
      text: 'Six agents averaged below 60. All six lost most points on objection handling, and three of them also missed the price-disclosure check (a fatal parameter).',
      chart: {
        type: 'bars',
        data: [
          { name: 'Sahil Chauhan', score: 48 },
          { name: 'Tanvi Bose', score: 52 },
          { name: 'Manish Das', score: 54 },
          { name: 'Ritika Nair', score: 56 },
          { name: 'Varun Patel', score: 57 },
          { name: 'Isha Kapoor', score: 59 },
        ],
        series: [{ key: 'score', label: 'Avg QA score' }],
      },
      filters: ['19–25 Nov 2026', 'Process: RR Parko – Sales', 'Min. 10 scored calls'],
      coverage: 'Based on 1,186 scored calls from 42 agents.',
      citations: ['call_4kd02', 'call_1mm9x'],
      followUps: ['Build coaching plans for these 6', 'Which parameter dropped the most?', 'Show their calls with fatal errors'],
      steps: ['Routing to Business Pulse', 'Averaging 1,186 scores', 'Ranking agents'],
    };
  }

  if (/today|yesterday|kal|week|month|kitne|how many|score|below|rate|drop/.test(q) || scope !== 'all') {
    const trend = conversionTrend();
    return {
      ...base,
      kind: 'metric',
      product: 'all',
      headline: { value: '47', label: 'leads converted yesterday', delta: 14.6, deltaLabel: 'vs the day before' },
      text: 'Yesterday 47 leads converted: 29 from AI calls, 12 from human calls and 6 from WhatsApp. That’s the best day this month; most of the lift came from the Wakad campaign.',
      chart: { type: 'trend', data: trend, series: [{ key: 'converted', label: 'Converted' }, { key: 'qualified', label: 'Qualified' }] },
      breakdown: [
        { name: 'Agent Flow (AI calls)', value: 29, color: 'series-4' },
        { name: 'DialFlow (human calls)', value: 12, color: 'series-3' },
        { name: 'UltraChat (WhatsApp)', value: 6, color: 'series-1' },
      ],
      filters: ['25 Nov 2026', 'All campaigns', 'Disposition: Interested, Site visit booked'],
      coverage: 'Based on 3,912 calls and 1,204 chats. Complete for this date.',
      citations: ['call_8f2k1', 'call_9a0x3', 'chat_77ab1'],
      followUps: ['Which campaign converted best?', 'Show this by agent', 'Compare with last Tuesday'],
      steps: ['Routing to all products', 'Counting conversions', 'Drawing the chart'],
    };
  }

  return {
    ...base,
    kind: 'clarify',
    product: 'all',
    text: 'This could come from more than one product. Which one should I use?',
    options: [
      { id: 'agentflow', label: 'Agent Flow', hint: 'AI calls' },
      { id: 'dialflow', label: 'DialFlow', hint: 'Human calls' },
      { id: 'ultrachat', label: 'UltraChat', hint: 'WhatsApp' },
      { id: 'all', label: 'All of them', hint: 'Side by side' },
    ],
    steps: ['Understanding the question'],
  };
}

/** A finished conversation for the demo session list. */
export function sampleThread() {
  return [buildAnswer('Kal kitne leads convert hue?'), buildAnswer('What did customers say about parking?')];
}
