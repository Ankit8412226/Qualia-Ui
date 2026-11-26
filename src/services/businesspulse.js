import { mock } from './client';
import { CREDITS, FEATURES, PARAMS, PASS_MARK, VIBES, now, processData, processList, sharedData } from '@/mocks/businesspulse';

/*
 * Business Pulse service. Every function is scoped to a process id and returns mock(...) today.
 * The aggregations below stand in for backend endpoints; when the API lands, each function becomes one http() call.
 */

const DAY = 86400000;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const dayKey = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** {preset, from, to} → [start, end] and the previous period of the same length. */
export function rangeBounds(range = { preset: '7d' }) {
  const end = now();
  const sod = new Date(end);
  sod.setHours(0, 0, 0, 0);
  let start;
  let stop = end;
  switch (range.preset) {
    case 'today':
      start = sod;
      break;
    case 'yesterday':
      start = new Date(sod.getTime() - DAY);
      stop = sod;
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * DAY);
      break;
    case '60d':
      start = new Date(end.getTime() - 60 * DAY);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * DAY);
      break;
    case 'mtd':
      start = new Date(sod.getFullYear(), sod.getMonth(), 1);
      break;
    case 'custom':
      start = range.from ? new Date(range.from) : new Date(end.getTime() - 7 * DAY);
      stop = range.to ? new Date(new Date(range.to).getTime() + DAY - 1) : end;
      break;
    default:
      start = new Date(end.getTime() - 7 * DAY);
  }
  const len = stop - start;
  return { start, end: stop, prevStart: new Date(start.getTime() - len), prevEnd: start };
}

const inRange = (c, a, b) => c.startedAt >= a && c.startedAt < b;
const scored = (calls) => calls.filter((c) => c.score != null);
const pctOf = (c, key) => {
  const p = c.parameters?.find((x) => x.key === key);
  return p ? (p.score / p.max) * 100 : null;
};

function kpis(calls) {
  const s = scored(calls);
  return {
    scored: s.length,
    avgScore: round1(avg(s.map((c) => c.score))),
    passRate: s.length ? round1((s.filter((c) => c.status === 'Passed').length / s.length) * 100) : null,
    fatal: s.filter((c) => c.fatal).length,
    avgTalk: Math.round(avg(calls.map((c) => c.duration)) || 0),
  };
}

function paramAverages(calls) {
  const s = scored(calls);
  return PARAMS.map((p) => ({ key: p.key, name: p.name, short: p.short, max: p.max, fatal: !!p.fatal, pct: round1(avg(s.map((c) => pctOf(c, p.key)).filter((v) => v != null))) }));
}

function dailySeries(calls, start, end, extra) {
  const days = Math.max(7, Math.ceil((end - start) / DAY));
  const from = new Date(end.getTime() - days * DAY);
  const out = [];
  for (let i = 0; i < days; i++) {
    const a = new Date(from.getTime() + i * DAY);
    const b = new Date(a.getTime() + DAY);
    const dayCalls = scored(calls).filter((c) => inRange(c, a, b));
    out.push({ date: dayKey(b), score: round1(avg(dayCalls.map((c) => c.score))), calls: dayCalls.length, pass: dayCalls.length ? round1((dayCalls.filter((c) => c.status === 'Passed').length / dayCalls.length) * 100) : null, fatal: dayCalls.filter((c) => c.fatal).length, ...(extra ? extra(a, b) : {}) });
  }
  return out;
}

/** Forward-fill gaps and smooth with a 3-day rolling mean, so sparse per-agent lines read as a trend. */
function smooth(rows, keys) {
  const last = {};
  const filled = rows.map((r) => {
    const o = { ...r };
    keys.forEach((k) => {
      if (o[k] == null) o[k] = last[k] ?? null;
      else last[k] = o[k];
    });
    return o;
  });
  return filled.map((r, i) => {
    const o = { ...r };
    keys.forEach((k) => {
      const win = filled.slice(Math.max(0, i - 2), i + 1).map((x) => x[k]).filter((v) => v != null);
      o[k] = win.length ? round1(avg(win)) : null;
    });
    return o;
  });
}

function agentStats(agents, calls) {
  return agents.map((a) => {
    const mine = scored(calls.filter((c) => c.agentId === a.id));
    return {
      id: a.id,
      name: a.name,
      empId: a.empId,
      team: a.team,
      status: a.status,
      email: a.email,
      calls: mine.length,
      avgScore: round1(avg(mine.map((c) => c.score))),
      passRate: mine.length ? round1((mine.filter((c) => c.status === 'Passed').length / mine.length) * 100) : null,
      fatal: mine.filter((c) => c.fatal).length,
      params: Object.fromEntries(PARAMS.map((p) => [p.key, round1(avg(mine.map((c) => pctOf(c, p.key)).filter((v) => v != null)))])),
    };
  });
}

/* ---------------- Processes ---------------- */

export const listProcesses = () => mock(processList);
export const getFeatures = () => mock(FEATURES);

export function getProcess(id) {
  return mock(() => {
    const p = processList().find((x) => x.id === id);
    if (!p) return null;
    const { agents } = processData(id);
    return { ...p, agents: agentStats(agents, processData(id).calls).map((a) => ({ ...a, included: a.status !== 'Inactive' })) };
  });
}

/* ---------------- Overview ---------------- */

export function getOverview(processId, range) {
  return mock(() => {
    const { calls, agents } = processData(processId);
    const { start, end, prevStart, prevEnd } = rangeBounds(range);
    const cur = calls.filter((c) => inRange(c, start, end));
    const prev = calls.filter((c) => inRange(c, prevStart, prevEnd));
    const k = kpis(cur);
    const pk = kpis(prev);
    const trend = dailySeries(calls, start, end);
    const params = paramAverages(cur).map((p, i) => ({ ...p, prev: paramAverages(prev)[i].pct }));
    const stats = agentStats(agents, cur).filter((a) => a.calls > 0);
    const ranked = [...stats].sort((a, b) => b.avgScore - a.avgScore);
    const vibes = VIBES.map((v) => ({ name: v, value: cur.filter((c) => c.vibe === v).length }));
    const fatalAlerts = cur
      .filter((c) => c.fatal)
      .slice(0, 8)
      .map((c) => ({ id: c.id, agent: c.agent.name, parameter: c.parameters.find((p) => p.fatal).name, quote: c.fatalQuote, at: c.startedAt, customer: c.contact.name }));
    return {
      kpis: k,
      prev: pk,
      trend,
      params,
      heatmap: { columns: PARAMS.map((p) => p.short), rows: ranked.map((a) => ({ label: a.name, id: a.id, values: PARAMS.map((p) => a.params[p.key]) })) },
      top: ranked.slice(0, 5),
      bottom: ranked.slice(-5).reverse(),
      vibes,
      fatalAlerts,
      callsById: Object.fromEntries(cur.filter((c) => c.fatal).map((c) => [c.id, c])),
      updatedAt: new Date(now().getTime() - 2 * 60000),
    };
  });
}

/** Personal overview for an agent (matched by name from the session). */
export function getAgentOverview(processId, agentName, range) {
  return mock(() => {
    const { calls, agents, sessions } = processData(processId);
    const agent = agents.find((a) => a.name === agentName) || agents[0];
    const { start, end, prevStart, prevEnd } = rangeBounds(range);
    const mineAll = calls.filter((c) => c.agentId === agent.id);
    const cur = mineAll.filter((c) => inRange(c, start, end));
    const prev = mineAll.filter((c) => inRange(c, prevStart, prevEnd));
    const team = calls.filter((c) => inRange(c, start, end));
    const teamStats = agentStats(agents, team).filter((a) => a.calls > 0).sort((a, b) => b.avgScore - a.avgScore);
    const rank = teamStats.findIndex((a) => a.id === agent.id) + 1;
    const mineParams = paramAverages(cur);
    const teamParams = paramAverages(team);
    const params = mineParams.map((p, i) => ({ ...p, team: teamParams[i].pct, diff: round1((p.pct ?? 0) - (teamParams[i].pct ?? 0)) }));
    const sorted = [...params].filter((p) => !p.fatal).sort((a, b) => b.pct - a.pct);
    const feedbackCall = scored(mineAll).find((c) => c.parameters.some((p) => p.note));
    const nextTask = sessions.find((s) => s.agentId === agent.id && ['Plan ready', 'Not attempted', 'Unfinished', 'In progress'].includes(s.status));
    const trend = dailySeries(calls, start, end, (a, b) => {
      const mine = scored(mineAll).filter((c) => inRange(c, a, b));
      return { mine: round1(avg(mine.map((c) => c.score))) };
    }).map((d) => ({ date: d.date, mine: d.mine, team: d.score }));
    return {
      agent: { id: agent.id, name: agent.name, team: agent.team, empId: agent.empId },
      trendRaw: trend,
      kpis: kpis(cur),
      prev: kpis(prev),
      teamAvg: round1(avg(scored(team).map((c) => c.score))),
      rank,
      of: teamStats.length,
      trend: smooth(trend, ['mine', 'team']),
      params,
      strengths: sorted.slice(0, 2),
      weaknesses: sorted.slice(-2).reverse(),
      feedback: feedbackCall ? { call: feedbackCall, notes: feedbackCall.parameters.filter((p) => p.note) } : null,
      nextTask,
      recent: mineAll.slice(0, 5),
    };
  });
}

/* ---------------- Calls ---------------- */

export function listCalls(processId) {
  return mock(() => processData(processId).calls);
}

export function getCall(processId, callId) {
  return mock(() => processData(processId).calls.find((c) => c.id === callId) || null);
}

/** Pure helper the Call history page uses to keep KPIs in step with filters. */
export const summarizeCalls = kpis;

/* ---------------- Upload ---------------- */

export function getUploadMeta(processId) {
  return mock(() => {
    const { agents, def } = processData(processId);
    const sets = sharedData().parameterSets;
    return {
      agents: agents.filter((a) => a.status !== 'Inactive').map((a) => ({ value: a.id, label: a.name })),
      dispositions: def.dispositions,
      parameterSets: sets.map((s) => ({ value: s.id, label: s.name })),
      defaultSet: sets.find((s) => s.processId === processId)?.id || sets[0].id,
      credits: CREDITS,
    };
  });
}

/* ---------------- Agents ---------------- */

export function listAgents(processId, range = { preset: '30d' }) {
  return mock(() => {
    const { agents, calls } = processData(processId);
    const { start, end, prevStart, prevEnd } = rangeBounds(range);
    const cur = agentStats(agents, calls.filter((c) => inRange(c, start, end)));
    const prev = agentStats(agents, calls.filter((c) => inRange(c, prevStart, prevEnd)));
    return cur.map((a, i) => {
      const spark = dailySeries(
        calls.filter((c) => c.agentId === a.id),
        new Date(end.getTime() - 14 * DAY),
        end,
      ).map((d) => d.score).filter((v) => v != null);
      return { ...a, prevScore: prev[i].avgScore, spark, lastCall: calls.find((c) => c.agentId === a.id)?.startedAt };
    });
  });
}

export function getAgent(processId, agentId) {
  return mock(() => {
    const { agents, calls, sessions } = processData(processId);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return null;
    const mine = calls.filter((c) => c.agentId === agent.id);
    const { start, end } = rangeBounds({ preset: '30d' });
    const cur = mine.filter((c) => inRange(c, start, end));
    const teamParams = paramAverages(calls.filter((c) => inRange(c, start, end)));
    const trend = smooth(dailySeries(calls, start, end, (a, b) => ({ mine: round1(avg(scored(mine).filter((c) => inRange(c, a, b)).map((c) => c.score))) })).map((d) => ({ date: d.date, mine: d.mine, team: d.score })), ['mine', 'team']);
    return {
      ...agentStats([agent], cur)[0],
      joinedAt: agent.joinedAt,
      kpis: kpis(cur),
      trend,
      params: paramAverages(cur).map((p, i) => ({ ...p, team: teamParams[i].pct })),
      calls: mine.slice(0, 40),
      sessions: sessions.filter((s) => s.agentId === agent.id),
    };
  });
}

/* ---------------- Coaching ---------------- */

const OBJECTIONS = {
  sales: [
    { text: 'Price is too high', quote: '“85 lakh thoda zyada hai, Hinjewadi mein 78 mein mil raha hai.”', handled: 0.42 },
    { text: 'Need to discuss with family', quote: '“Wife se baat karke batata hoon.”', handled: 0.61 },
    { text: 'Possession date doubts', quote: '“2027 bol rahe ho, pichhle builder ne bhi yahi bola tha.”', handled: 0.35 },
    { text: 'Loan eligibility', quote: '“Mera CIBIL 690 hai, loan milega?”', handled: 0.28 },
  ],
  collections: [
    { text: 'Salary delayed', quote: '“Is mahine salary late aayi hai.”', handled: 0.66 },
    { text: 'Disputes the late fee', quote: '“Late fee kyun? Maine toh 2 din late kiya.”', handled: 0.38 },
    { text: 'Asks for EMI date shift', quote: '“10 tareekh kar do EMI ki.”', handled: 0.31 },
  ],
  support: [
    { text: 'Possession delay anger', quote: '“Teen baar date badal chuke ho aap log.”', handled: 0.44 },
    { text: 'Wants a written answer', quote: '“Mail par bhejo, phone pe nahi chalega.”', handled: 0.57 },
  ],
};

const DRILLS = {
  discovery: 'Ask the 4 Ws (budget, where, when, who decides) before any pitch.',
  product: 'Learn Tower A/B possession dates and the 3 most-asked carpet areas by heart.',
  objection: 'Use acknowledge → fact → question. Never answer price with “discount milega”.',
  compliance: 'Always read out GST, parking and maintenance before quoting a final number.',
  closing: 'End every call with a date and time for the next step, then confirm on WhatsApp.',
  opening: 'Name, company and reason for calling inside 10 seconds.',
};

export function getCoachPlan(processId, agentId, range = { preset: '30d' }) {
  return mock(() => {
    const { agents, calls, def } = processData(processId);
    const agent = agents.find((a) => a.id === agentId) || agents[0];
    const { start, end } = rangeBounds(range);
    const team = calls.filter((c) => inRange(c, start, end));
    const mine = team.filter((c) => c.agentId === agent.id);
    const mp = paramAverages(mine);
    const tp = paramAverages(team);
    const radar = mp.map((p, i) => ({ parameter: p.short, agent: Math.round(p.pct ?? 0), team: Math.round(tp[i].pct ?? 0) }));
    const weakest = mp
      .map((p, i) => ({ ...p, team: tp[i].pct, gap: (p.pct ?? 0) - (tp[i].pct ?? 0) }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
    const notes = scored(mine)
      .flatMap((c) => c.parameters.filter((p) => p.note && p.score / p.max < 0.7).map((p) => ({ callId: c.id, call: c, parameter: p.name, note: p.note, at: c.startedAt, reviewer: 'AI · checked by Sameer QA' })))
      .slice(0, 4);
    const s = scored(mine);
    return {
      agent: { id: agent.id, name: agent.name, team: agent.team },
      calls: s.length,
      avgScore: round1(avg(s.map((c) => c.score))),
      teamAvg: round1(avg(scored(team).map((c) => c.score))),
      fatal: s.filter((c) => c.fatal).length,
      radar,
      blockers: [
        { title: `Weak ${weakest[0]?.short.toLowerCase()} on ${Math.round(100 - (weakest[0]?.pct ?? 60))}% of calls`, detail: NOTESHORT[weakest[0]?.key], calls: Math.round(s.length * (1 - (weakest[0]?.pct ?? 60) / 100)) },
        { title: 'Talks 68% of the call', detail: 'Customers speak for under a third of the call, so needs come out late.', calls: Math.round(s.length * 0.4) },
        s.filter((c) => c.fatal).length
          ? { title: `${s.filter((c) => c.fatal).length} fatal price-disclosure misses`, detail: 'Said there are no extra charges without listing GST and parking.', calls: s.filter((c) => c.fatal).length, fatal: true }
          : { title: 'Ends calls without a next step', detail: '“Sochke batana” endings with no date or time.', calls: Math.round(s.length * 0.22) },
      ],
      objections: (OBJECTIONS[def.kind] || OBJECTIONS.sales).map((o, i) => ({ ...o, count: Math.max(2, Math.round(s.length * (0.32 - i * 0.06))) })),
      notes,
      focus: weakest.map((w) => ({ key: w.key, name: w.short, score: Math.round(w.pct ?? 0), team: Math.round(w.team ?? 0), drill: DRILLS[w.key] })),
    };
  });
}

const NOTESHORT = {
  opening: 'Name and company missing in the first 15 seconds.',
  discovery: 'Budget is asked, but timeline and decision maker are not.',
  product: 'Possession quarter and carpet area quoted wrong.',
  objection: 'Goes quiet or offers a discount instead of answering.',
  compliance: 'Charges not disclosed before quoting a price.',
  closing: 'No date or time agreed for the next step.',
};

export function listSessions(processId) {
  return mock(() => processData(processId).sessions);
}

/** Grade a finished role-play (mock: derived from the plan so it feels connected). */
export function gradeSession(processId, agentId, plan) {
  return mock(() => {
    const base = (plan?.avgScore ?? 70) + 6;
    const skills = (plan?.focus || []).concat([{ name: 'Rapport' }, { name: 'Clarity' }]).map((f, i) => ({ name: f.name, score: Math.max(35, Math.min(96, Math.round(base + (i - 1) * 7 - (i === 0 ? 14 : 0)))) }));
    const overall = Math.round(avg(skills.map((s) => s.score)));
    const { sessions } = processData(processId);
    const history = sessions.filter((s) => s.agentId === agentId && s.overall != null).map((s) => s.overall).slice(0, 4).reverse();
    return {
      id: `cs_new_${Date.now()}`,
      overall,
      verdict: overall >= 78 ? 'Ready' : overall >= 62 ? 'Needs retraining' : 'Not ready',
      skills,
      practise: [`${skills[0].name}: ${DRILLS[plan?.focus?.[0]?.key] || 'Repeat the scenario once more tomorrow.'}`, 'Pause after each question; let the customer finish.', 'Close with a date, time and WhatsApp confirmation.'],
      history: [...(history.length ? history : [58, 63]), overall],
      highlights: [
        { tone: 'success', text: 'Good: acknowledged the price concern before answering.' },
        { tone: 'danger', text: 'Missed: did not mention GST and parking when quoting ₹82 L.' },
      ],
    };
  });
}

/* ---------------- Custom metrics ---------------- */

export function listMetrics(processId) {
  return mock(() => {
    const { metrics, calls } = processData(processId);
    const byId = Object.fromEntries(calls.map((c) => [c.id, c]));
    return metrics.map((m) => ({ ...m, calls: m.callIds.slice(0, 30).map((cid) => byId[cid]) }));
  });
}

const WON = ['Interested', 'Site visit booked', 'Promise to pay', 'Paid'];

/**
 * Charts for the Custom metrics page, for one process:
 * - trend: % of calls matching each metric, per day (last 14 days)
 * - byAgent: agents × metrics, % of each agent's calls that matched (heatmap)
 * - per metric: byAgent bars, byDisposition, and conversion with vs without the metric
 */
export function getMetricsAnalytics(processId) {
  return mock(() => {
    const { metrics, calls } = processData(processId);
    const all = scored(calls);
    const byId = Object.fromEntries(all.map((c) => [c.id, c]));
    const end = now();
    const trend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(end.getTime() - (13 - i) * DAY);
      const row = { date: dayKey(d) };
      metrics.forEach((m) => (row[m.id] = m.spark[i] ?? null));
      return row;
    });

    const agentTotals = {};
    all.forEach((c) => (agentTotals[c.agent.name] = (agentTotals[c.agent.name] || 0) + 1));
    const agents = Object.entries(agentTotals)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    const winRate = (list) => (list.length ? (list.filter((c) => WON.includes(c.disposition)).length / list.length) * 100 : 0);

    const perMetric = metrics.map((m) => {
      const matched = m.callIds.map((id) => byId[id]).filter(Boolean);
      const ids = new Set(m.callIds);
      const rest = all.filter((c) => !ids.has(c.id));
      const agentHits = {};
      matched.forEach((c) => (agentHits[c.agent.name] = (agentHits[c.agent.name] || 0) + 1));
      const dispo = {};
      matched.forEach((c) => (dispo[c.disposition] = (dispo[c.disposition] || 0) + 1));
      return {
        id: m.id,
        name: m.name,
        pct: round1(m.pct),
        byAgent: agents.map((a) => ({ name: a, pct: round1(((agentHits[a] || 0) / agentTotals[a]) * 100) })).sort((a, b) => b.pct - a.pct),
        byDisposition: Object.entries(dispo)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
        convertedWith: round1(winRate(matched)),
        convertedWithout: round1(winRate(rest)),
        avgScoreWith: round1(avg(matched.map((c) => c.score))),
        avgScoreWithout: round1(avg(rest.map((c) => c.score))),
      };
    });

    const heatmap = agents.map((a) => ({ label: a, values: perMetric.map((pm) => pm.byAgent.find((x) => x.name === a)?.pct ?? null) }));
    return { trend, perMetric, heatmap, columns: metrics.map((m) => m.name), totalCalls: all.length };
  });
}

/** Live preview: "test on 20 calls". Deterministic per description so typing feels stable. */
export function testMetric(processId, description) {
  return mock(() => {
    const sample = scored(processData(processId).calls).slice(0, 20);
    let h = 0;
    for (const ch of description) h = (h * 31 + ch.charCodeAt(0)) % 9973;
    const results = sample.map((c, i) => {
      const hit = ((h + i * 37) % 100) < 18 + (h % 30);
      return { call: c, hit, confidence: hit ? 72 + ((h + i) % 26) : 80 + ((h + i * 3) % 19), evidence: hit ? c.transcript.find((l) => l.speaker === 'customer')?.text : null };
    });
    return { results, matched: results.filter((r) => r.hit).length };
  });
}

/* ---------------- Quality delta & compare ---------------- */

export function getQualityDelta(processId, before, after) {
  return mock(() => {
    const { calls, agents } = processData(processId);
    const A = rangeBounds(before);
    const B = rangeBounds(after);
    const ca = calls.filter((c) => inRange(c, A.start, A.end));
    const cb = calls.filter((c) => inRange(c, B.start, B.end));
    const pa = paramAverages(ca);
    const pb = paramAverages(cb);
    const sa = agentStats(agents, ca);
    const sb = agentStats(agents, cb);
    const movers = sa
      .map((a, i) => ({ id: a.id, name: a.name, team: a.team, before: a.avgScore, after: sb[i].avgScore, change: a.avgScore != null && sb[i].avgScore != null ? round1(sb[i].avgScore - a.avgScore) : null }))
      .filter((m) => m.change != null)
      .sort((x, y) => y.change - x.change);
    return {
      before: kpis(ca),
      after: kpis(cb),
      params: pa.map((p, i) => ({ key: p.key, name: p.name, short: p.short, fatal: p.fatal, before: p.pct, after: pb[i].pct, change: round1((pb[i].pct ?? 0) - (p.pct ?? 0)) })),
      movers,
    };
  });
}

function hashSeed(str) {
  let h = 7;
  for (const ch of str) h = (h * 33 + ch.charCodeAt(0)) % 100003;
  return h;
}

/** Stats for arbitrary labelled periods (months, weeks, custom). Synthetic but stable per label. */
export function comparePeriods(processId, periods) {
  return mock(() => {
    const procBias = processId === 'proc_collections' ? -3 : processId === 'proc_support' ? 2 : 0;
    return periods.map((p, idx) => {
      const h = hashSeed(p.label + processId);
      const lift = idx * 1.1;
      const params = PARAMS.map((x, i) => ({ key: x.key, short: x.short, pct: Math.min(98, Math.round((62 + ((h >> i) % 22) + lift + procBias + (x.fatal ? 14 : 0)) * 10) / 10) }));
      const avgScore = round1(avg(params.map((x) => x.pct)));
      return {
        ...p,
        avgScore,
        passRate: Math.min(97, round1(avgScore + 4 + (h % 7))),
        calls: 900 + (h % 1400),
        fatal: 4 + (h % 19),
        params,
      };
    });
  });
}

/* ---------------- Ghost leads ---------------- */

export function listGhostLeads(processId) {
  return mock(() => {
    const { ghosts, calls } = processData(processId);
    const byId = Object.fromEntries(calls.map((c) => [c.id, c]));
    return ghosts.map((g) => ({ ...g, call: byId[g.callId] }));
  });
}

/* ---------------- Parameter sets ---------------- */

export const listParameterSets = () =>
  mock(() =>
    sharedData().parameterSets.map((s) => ({
      ...s,
      paramCount: s.sections.reduce((a, x) => a + x.parameters.length, 0),
      fatalCount: s.sections.reduce((a, x) => a + x.parameters.filter((p) => p.fatal).length, 0),
      processName: processList().find((p) => p.id === s.processId)?.name,
    })),
  );

export const getParameterSet = (id) => mock(() => sharedData().parameterSets.find((s) => s.id === id) || null);

/* ---------------- Dialer sync ---------------- */

export const getSync = () => mock(() => ({ ...sharedData().sync, processes: processList().map((p) => ({ value: p.id, label: p.name })) }));

export { PARAMS, PASS_MARK, VIBES };

/** Result of scoring an uploaded file (mock: reuses a scored call, stamped with the upload's metadata). */
export function getUploadResult(processId, index, meta = {}) {
  return mock(() => {
    const pool = scored(processData(processId).calls);
    const base = pool[(index * 5) % pool.length];
    const agent = processData(processId).agents.find((a) => a.id === meta.agentId);
    return {
      ...base,
      id: `up_${index}_${base.id}`,
      contact: { ...base.contact, name: meta.fileName || base.contact.name },
      agent: agent ? { name: agent.name, kind: 'human', id: agent.id } : base.agent,
      disposition: meta.disposition || base.disposition,
      startedAt: meta.callAt ? new Date(meta.callAt) : base.startedAt,
      meta: [...(base.meta || []), { label: 'Source', value: 'Manual upload' }],
    };
  });
}
