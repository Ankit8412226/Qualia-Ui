import { int, pick, pickWeighted, person, phone, minutesAgo, id } from './seed';

/* Shared call generator used by Agent Flow, DialFlow and Business Pulse mocks. Shape matches CallDetailDrawer. */

const SCRIPT = [
  ['agent', 'Namaste! Main {agent} bol rahi hoon RR Parko se. Kya meri baat {name} ji se ho rahi hai?'],
  ['customer', 'Haan ji, boliye.'],
  ['agent', 'Aapne pichhle hafte humari website par 2BHK ke baare mein enquiry ki thi. Kya abhi 2 minute baat kar sakte hain?'],
  ['customer', 'Haan, actually main Wakad side mein dekh raha tha. Budget around 85 lakh hai.'],
  ['agent', 'Bahut badhiya. Wakad mein humara Parko Heights project hai, possession December 2027 hai aur starting price 82 lakh hai.'],
  ['customer', 'Parking aur clubhouse included hai kya?'],
  ['agent', 'Ji haan, ek covered parking aur clubhouse membership dono included hain. Kya aap is weekend site visit karna chahenge?'],
  ['customer', 'Saturday ko 11 baje ho sakta hai.'],
  ['agent', 'Perfect, maine Saturday 11 baje ka site visit book kar diya hai. Aapko WhatsApp par location bhej rahi hoon.'],
  ['customer', 'Theek hai, thank you.'],
  ['agent', 'Dhanyavaad {name} ji, aapka din shubh rahe!'],
];

export const DISPOSITIONS = ['Interested', 'Site visit booked', 'Call back later', 'Not interested', 'Wrong number', 'Busy', 'No answer', 'DNC requested'];
export const CALL_STATUSES = ['Completed', 'No answer', 'Busy', 'Failed'];

export function makeTranscript(agentName, contactName, upTo = SCRIPT.length) {
  let t = 2;
  return SCRIPT.slice(0, upTo).map(([speaker, text]) => {
    const line = { speaker, text: text.replace('{agent}', agentName.split(' ')[0]).replace('{name}', contactName.split(' ')[0]), t };
    t += int(4, 12);
    return line;
  });
}

/**
 * makeCall({ agentKind: 'ai'|'human', agentName, campaign, withScore })
 */
export function makeCall({ agentKind = 'human', agentName, campaign = 'Renewals Nov', withScore = false, minutesBack } = {}) {
  const status = pickWeighted([['Completed', 62], ['No answer', 20], ['Busy', 10], ['Failed', 8]]);
  const answered = status === 'Completed';
  const name = person();
  const agent = agentName || (agentKind === 'ai' ? pick(['Diya (AI)', 'Arjun (AI)', 'Meera (AI)']) : person());
  const duration = answered ? int(35, 420) : 0;
  const disposition = answered ? pickWeighted([['Interested', 22], ['Site visit booked', 12], ['Call back later', 20], ['Not interested', 28], ['Wrong number', 6], ['DNC requested', 2]]) : status === 'Busy' ? 'Busy' : 'No answer';
  const score = withScore && answered ? int(48, 98) : undefined;
  return {
    id: id('call'),
    contact: { name, phone: phone() },
    direction: pickWeighted([['outbound', 85], ['inbound', 15]]),
    status,
    startedAt: minutesAgo(minutesBack ?? int(3, 60 * 24 * 7)),
    duration,
    agent: { name: agent, kind: agentKind },
    campaign,
    disposition,
    sentiment: answered ? pickWeighted([['Positive', 40], ['Neutral', 42], ['Negative', 18]]) : undefined,
    summary: answered
      ? `${name.split(' ')[0]} is looking for a 2BHK in Wakad with a budget near ₹85 L. Asked about parking and clubhouse. ${disposition === 'Site visit booked' ? 'Site visit booked for Saturday 11 AM.' : 'Will decide after discussing with family.'}`
      : undefined,
    transcript: answered ? makeTranscript(agent, name, int(5, 11)) : [],
    fields: answered
      ? [
          { label: 'Budget', value: '₹85 L' },
          { label: 'Location', value: 'Wakad, Pune' },
          { label: 'Configuration', value: '2BHK' },
          { label: 'Site visit', value: disposition === 'Site visit booked' ? 'Sat, 11:00 AM' : 'Not yet' },
        ]
      : [],
    score,
    parameters:
      score != null
        ? [
            { name: 'Opening and introduction', score: int(6, 10), max: 10 },
            { name: 'Need discovery', score: int(10, 20), max: 20, note: 'Asked budget and location, missed timeline.' },
            { name: 'Product knowledge', score: int(12, 20), max: 20 },
            { name: 'Objection handling', score: int(8, 20), max: 20, note: 'Parking question answered confidently.' },
            { name: 'Compliance: price disclosure', score: int(0, 1) ? 10 : 0, max: 10, fatal: true },
            { name: 'Closing and next step', score: int(10, 20), max: 20 },
          ]
        : undefined,
  };
}

export const makeCalls = (n, opts) => Array.from({ length: n }, () => makeCall(opts)).sort((a, b) => b.startedAt - a.startedAt);
