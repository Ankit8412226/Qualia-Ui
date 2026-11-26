import { reseed, int, pick, pickWeighted, person, phone, minutesAgo, daysAgo, lastDays, range, id, CITIES } from './seed';
import { makeCall, makeTranscript } from './calls';

/*
 * Agent Flow mock data. Deterministic: the module reseeds before generating, so screens look the same on every reload.
 * Shapes here are the contract the API should return later (see services/agentflow.js).
 */
reseed(7001);

/* ---------------- Reference lists ---------------- */

export const LANGUAGES = ['Hindi', 'English', 'Hinglish', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Malayalam'];
export const ENGINES = [
  { value: 'sarvam', label: 'Sarvam', description: 'Best for Indian languages' },
  { value: 'elevenlabs', label: 'ElevenLabs', description: 'Most natural English' },
  { value: 'google', label: 'Google', description: 'Fast, wide language list' },
  { value: 'azure', label: 'Azure', description: 'Stable, many accents' },
];
export const TONES = ['Friendly', 'Professional', 'Warm', 'Energetic', 'Calm'];
export const BACKGROUND_SOUNDS = [
  { value: 'none', label: 'None' },
  { value: 'office', label: 'Office chatter' },
  { value: 'callcentre', label: 'Call centre' },
  { value: 'cafe', label: 'Quiet café' },
];
export const FIELD_TYPES = [
  { value: 'yesno', label: 'Yes / No' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'options', label: 'Options' },
];
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const PROMPT_VARIABLES = ['name', 'phone', 'city', 'project', 'budget', 'agent_name', 'company'];
export const COST_PER_MIN = 6.5;

/* ---------------- Voices ---------------- */

export const VOICES = [
  { id: 'v_diya', name: 'Diya', gender: 'Female', languages: ['Hindi', 'Hinglish', 'English'], accent: 'North Indian', style: 'Warm, conversational', engines: ['sarvam', 'elevenlabs'], popular: true, sample: 'Namaste! Main Diya bol rahi hoon. Kya aapke paas do minute hain?' },
  { id: 'v_arjun', name: 'Arjun', gender: 'Male', languages: ['Hindi', 'Hinglish', 'English'], accent: 'Delhi', style: 'Confident, clear', engines: ['sarvam', 'google'], popular: true, sample: 'Hello, main Arjun bol raha hoon. Aapki enquiry ke baare mein call kiya tha.' },
  { id: 'v_meera', name: 'Meera', gender: 'Female', languages: ['English', 'Hinglish'], accent: 'Neutral Indian', style: 'Professional', engines: ['elevenlabs', 'azure'], popular: true, sample: 'Hi, this is Meera calling about your recent enquiry. Is this a good time?' },
  { id: 'v_kabir', name: 'Kabir', gender: 'Male', languages: ['English'], accent: 'Neutral Indian', style: 'Calm, reassuring', engines: ['elevenlabs'], sample: 'Hi, I am Kabir. I will take just two minutes of your time.' },
  { id: 'v_anika', name: 'Anika', gender: 'Female', languages: ['Marathi', 'Hindi'], accent: 'Pune', style: 'Friendly', engines: ['sarvam'], sample: 'Namaskar! Mi Anika boltey. Tumchyashi don minute bolu shakte ka?' },
  { id: 'v_vikram', name: 'Vikram', gender: 'Male', languages: ['Marathi', 'Hindi'], accent: 'Mumbai', style: 'Energetic', engines: ['sarvam', 'google'], sample: 'Namaskar, mi Vikram. Tumhi aamchya website var enquiry keli hoti.' },
  { id: 'v_kavya', name: 'Kavya', gender: 'Female', languages: ['Tamil', 'English'], accent: 'Chennai', style: 'Warm', engines: ['sarvam', 'azure'], sample: 'Vanakkam! Naan Kavya pesuren. Ungalukku rendu nimisham irukka?' },
  { id: 'v_surya', name: 'Surya', gender: 'Male', languages: ['Tamil'], accent: 'Madurai', style: 'Professional', engines: ['sarvam'], sample: 'Vanakkam, naan Surya. Ungal enquiry patri pesa call panninen.' },
  { id: 'v_lakshmi', name: 'Lakshmi', gender: 'Female', languages: ['Telugu', 'English'], accent: 'Hyderabad', style: 'Friendly', engines: ['sarvam', 'google'], sample: 'Namaskaram! Nenu Lakshmi. Meeku rendu nimishalu unnaya?' },
  { id: 'v_ravi', name: 'Ravi', gender: 'Male', languages: ['Telugu'], accent: 'Vijayawada', style: 'Calm', engines: ['sarvam'], sample: 'Namaskaram, nenu Ravi matladutunnanu.' },
  { id: 'v_nandini', name: 'Nandini', gender: 'Female', languages: ['Kannada', 'English'], accent: 'Bengaluru', style: 'Professional', engines: ['sarvam', 'azure'], sample: 'Namaskara! Naanu Nandini. Nimage eradu nimisha ideya?' },
  { id: 'v_arnab', name: 'Arnab', gender: 'Male', languages: ['Bengali', 'Hindi'], accent: 'Kolkata', style: 'Warm', engines: ['sarvam', 'google'], sample: 'Nomoshkar! Ami Arnab bolchhi. Apnar ki dui minute somoy hobe?' },
  { id: 'v_hetal', name: 'Hetal', gender: 'Female', languages: ['Gujarati', 'Hindi'], accent: 'Ahmedabad', style: 'Energetic', engines: ['sarvam'], sample: 'Kem cho! Hu Hetal bolu chhu. Tamari paase be minute chhe?' },
  { id: 'v_anjali', name: 'Anjali', gender: 'Female', languages: ['Malayalam', 'English'], accent: 'Kochi', style: 'Calm', engines: ['sarvam', 'google'], sample: 'Namaskaram! Njan Anjali aanu. Randu minute samsarikkamo?' },
  { id: 'v_rohan', name: 'Rohan', gender: 'Male', languages: ['English', 'Hinglish'], accent: 'Bengaluru', style: 'Upbeat, young', engines: ['elevenlabs', 'google'], sample: 'Hey! Rohan here from the team. Got a quick minute?' },
  { id: 'v_sana', name: 'Sana', gender: 'Female', languages: ['Hindi', 'Hinglish'], accent: 'Lucknow', style: 'Soft, polite', engines: ['sarvam', 'elevenlabs', 'azure'], sample: 'Adaab! Main Sana. Aapse do minute baat ho sakti hai?' },
];
export const ENGINE_LABEL = Object.fromEntries(ENGINES.map((e) => [e.value, e.label]));

/* ---------------- Campaign definitions ---------------- */

const FIELDSETS = {
  realty: [
    { id: 'f1', label: 'Interested in site visit', type: 'yesno', required: true },
    { id: 'f2', label: 'Budget', type: 'options', options: ['Under ₹60 L', '₹60–90 L', '₹90 L–1.2 Cr', 'Above ₹1.2 Cr'], required: true },
    { id: 'f3', label: 'Preferred location', type: 'text', required: false },
    { id: 'f4', label: 'Visit date', type: 'date', required: false },
  ],
  loan: [
    { id: 'f1', label: 'Needs a loan', type: 'yesno', required: true },
    { id: 'f2', label: 'Loan amount (₹)', type: 'number', required: true },
    { id: 'f3', label: 'Employment', type: 'options', options: ['Salaried', 'Self-employed', 'Business'], required: true },
    { id: 'f4', label: 'Has existing EMI', type: 'yesno', required: false },
  ],
  renewal: [
    { id: 'f1', label: 'Will renew', type: 'yesno', required: true },
    { id: 'f2', label: 'Wants a callback', type: 'yesno', required: false },
    { id: 'f3', label: 'Reason if not', type: 'text', required: false },
  ],
  feedback: [
    { id: 'f1', label: 'Satisfied with service', type: 'yesno', required: true },
    { id: 'f2', label: 'Rating (1–5)', type: 'number', required: true },
    { id: 'f3', label: 'Comments', type: 'text', required: false },
  ],
};

const PROMPTS = {
  realty: 'You are {{agent_name}}, a friendly property advisor from {{company}}. Call {{name}} who enquired about {{project}}. Find out their budget, preferred location and whether they want a site visit this weekend. Keep answers short. Speak in Hinglish unless the customer prefers English.',
  loan: 'You are {{agent_name}} from {{company}}. {{name}} showed interest in a personal loan. Confirm the loan amount they need, their employment type and any existing EMI. Never promise approval or an interest rate.',
  renewal: 'You are {{agent_name}} from {{company}}. {{name}}’s policy is due for renewal. Remind them of the due date, ask if they will renew, and offer a callback from an advisor if they have questions.',
  feedback: 'You are {{agent_name}} from {{company}}. Ask {{name}} how their recent service visit went, collect a rating from 1 to 5 and any comments. Thank them warmly.',
};

const CAMPAIGN_DEFS = [
  ['Wakad 2BHK leads', 'Running', 'realty', 'v_diya', 2500, 0.68, 'Hinglish'],
  ['Home loan follow-up · Nov', 'Running', 'loan', 'v_arjun', 1800, 0.41, 'Hindi'],
  ['Hinjewadi site visit reminders', 'Running', 'realty', 'v_anika', 640, 0.86, 'Marathi'],
  ['Health renewals · Dec batch', 'Scheduled', 'renewal', 'v_meera', 3200, 0, 'English'],
  ['Chennai service feedback', 'Scheduled', 'feedback', 'v_kavya', 900, 0, 'Tamil'],
  ['Car insurance renewals', 'Paused', 'renewal', 'v_sana', 1450, 0.37, 'Hindi'],
  ['Kharadi villa enquiries', 'Paused', 'realty', 'v_arjun', 420, 0.52, 'Hinglish'],
  ['Gold loan cross-sell', 'Draft', 'loan', 'v_vikram', 0, 0, 'Hindi'],
  ['Hyderabad showroom feedback', 'Draft', 'feedback', 'v_lakshmi', 0, 0, 'Telugu'],
  ['Diwali offer · Baner 3BHK', 'Completed', 'realty', 'v_diya', 3100, 1, 'Hinglish'],
  ['Personal loan pre-approved', 'Completed', 'loan', 'v_meera', 2200, 1, 'English'],
  ['Two-wheeler insurance Oct', 'Completed', 'renewal', 'v_rohan', 1750, 1, 'Hinglish'],
];

const voiceById = (vid) => VOICES.find((v) => v.id === vid);

function setupFor(type, voiceId, language, contacts) {
  const v = voiceById(voiceId);
  return {
    contacts: { fileName: `${type}_leads_nov.csv`, total: contacts, removedDnc: Math.round(contacts * 0.018), removedDuplicates: Math.round(contacts * 0.031), mapping: { name: 'Full Name', phone: 'Mobile', city: 'City' } },
    answeredBy: 'ai',
    script: {
      prompt: PROMPTS[type],
      opening: type === 'realty' ? 'Namaste {{name}} ji! Main {{agent_name}} bol rahi hoon {{company}} se. Aapne {{project}} ke baare mein enquiry ki thi, kya do minute baat kar sakte hain?' : 'Namaste {{name}} ji, main {{agent_name}} bol rahi hoon {{company}} se. Kya abhi baat karna theek rahega?',
      closing: 'Dhanyavaad {{name}} ji, aapka din shubh rahe!',
      knowledge: type === 'realty' ? { kind: 'pdf', files: ['Parko_Heights_brochure.pdf', 'Price_sheet_Nov.pdf'] } : { kind: 'text', text: 'Office hours 10 AM to 7 PM. Documents needed: PAN, Aadhaar, last 3 salary slips.' },
    },
    voice: { voiceId, voiceName: v.name, engine: v.engines[0], language, speed: 1, tone: 'Friendly', interruptions: true, background: 'office' },
    fields: FIELDSETS[type],
    rules: { from: '10:00', to: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], concurrency: 10, retryMode: 'delay', retryDelay: 120, retrySlots: 3, maxAttempts: 3, retryOn: ['No answer', 'Busy'] },
  };
}

export const CAMPAIGNS = CAMPAIGN_DEFS.map(([name, status, type, voiceId, contacts, done, language], i) => {
  const dialled = Math.round(contacts * done);
  const connected = Math.round(dialled * (0.42 + (i % 4) * 0.06));
  const failed = dialled - connected;
  const qualified = Math.round(connected * (0.24 + (i % 3) * 0.05));
  const picked = Math.round(connected * 1.04);
  const createdDays = status === 'Completed' ? 20 + i * 2 : status === 'Draft' ? i % 3 : 2 + i;
  return {
    id: `cmp_${String(101 + i)}`,
    name,
    status,
    type,
    contacts,
    dialled,
    picked: Math.min(picked, dialled),
    connected,
    failed,
    pending: contacts - dialled,
    qualified,
    connectRate: dialled ? (connected / dialled) * 100 : null,
    avgDuration: int(70, 170),
    minutesUsed: Math.round((connected * int(90, 150)) / 60),
    createdAt: daysAgo(createdDays, 10),
    scheduledFor: status === 'Scheduled' ? daysAgo(-1 - (i % 2), 10) : null,
    createdBy: pick(['Neha Kapoor', 'Rahul Mehta', 'Priya Iyer']),
    voice: voiceById(voiceId).name,
    language,
    setup: setupFor(type, voiceId, language, contacts),
  };
});

export const CAMPAIGN_STATUSES = ['Running', 'Scheduled', 'Paused', 'Draft', 'Completed'];

/* ---------------- Calls ---------------- */

const FIELD_VALUE = (f, answered, disp) => {
  if (!answered) return '—';
  if (f.type === 'yesno') return ['Interested', 'Site visit booked'].includes(disp) ? 'Yes' : disp === 'Call back later' ? pick(['Yes', 'No']) : 'No';
  if (f.type === 'options') return pick(f.options);
  if (f.type === 'number') return f.label.includes('Rating') ? String(int(2, 5)) : `${int(2, 25)},00,000`;
  if (f.type === 'date') return pick(['Sat, 30 Nov', 'Sun, 1 Dec', 'Sat, 7 Dec', '—']);
  if (f.label.includes('location')) return pick(['Wakad', 'Baner', 'Hinjewadi', 'Kharadi', 'Aundh']);
  if (f.label.includes('Reason')) return pick(['Premium too high', 'Switched insurer', 'Will decide later', '—']);
  return pick(['Very helpful staff', 'Took too long', 'Good experience', '—']);
};

function callsFor(c, n) {
  const fields = c.setup.fields;
  return range(n, () => {
    const call = makeCall({ agentKind: 'ai', agentName: `${c.voice} (AI)`, campaign: c.name, minutesBack: c.status === 'Running' ? int(2, 60 * 30) : int(60 * 24, 60 * 24 * 20) });
    call.direction = 'outbound';
    call.campaignId = c.id;
    call.language = c.language;
    call.attempt = pickWeighted([[1, 70], [2, 22], [3, 8]]);
    call.fields = fields.map((f) => ({ label: f.label, value: FIELD_VALUE(f, call.status === 'Completed', call.disposition) }));
    call.cost = Math.round((call.duration / 60) * COST_PER_MIN * 100) / 100;
    return call;
  });
}

export const CALLS = CAMPAIGNS.filter((c) => c.dialled > 0)
  .flatMap((c) => callsFor(c, c.status === 'Running' ? 26 : 14))
  .sort((a, b) => b.startedAt - a.startedAt);

/* ---------------- Inbound ---------------- */

export const INBOUND_NUMBERS = [
  { id: 'did_1', number: '07965110243', label: 'Sales line · Pune', status: 'Active', provider: 'Tata Tele', callsToday: 84, answeredBy: 'AI agent' },
  { id: 'did_2', number: '02248931200', label: 'Customer care', status: 'Active', provider: 'Airtel', callsToday: 61, answeredBy: 'AI agent' },
  { id: 'did_3', number: '08046812290', label: 'Bengaluru projects', status: 'Paused', provider: 'Tata Tele', callsToday: 0, answeredBy: 'AI agent' },
  { id: 'did_4', number: '18002701100', label: 'Toll-free helpline', status: 'Pending', provider: 'Exotel', callsToday: 0, answeredBy: '—' },
];

export const INBOUND_CONFIG = {
  answeredBy: 'ai',
  voiceId: 'v_meera',
  tone: 'Professional',
  language: 'Hinglish',
  greeting: 'Namaste! RR Parko mein aapka swagat hai. Main Meera, aapki kya madad kar sakti hoon?',
  fields: [
    { id: 'i1', label: 'Reason for calling', type: 'options', options: ['New enquiry', 'Site visit', 'Payment', 'Complaint'], required: true },
    { id: 'i2', label: 'Project of interest', type: 'text', required: false },
    { id: 'i3', label: 'Wants a callback', type: 'yesno', required: false },
  ],
  hours: { from: '09:00', to: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  afterHours: 'ai',
  afterHoursMessage: 'Abhi humara office band hai. Aapka naam aur number note kar liya hai, kal subah 10 baje tak call back karenge.',
};

export const INBOUND_CALLS = range(48, () => {
  const call = makeCall({ agentKind: 'ai', agentName: 'Meera (AI)', campaign: 'Inbound', minutesBack: int(5, 60 * 24 * 6) });
  call.direction = 'inbound';
  call.did = pick(INBOUND_NUMBERS.slice(0, 2)).number;
  call.fields = INBOUND_CONFIG.fields.map((f) => ({ label: f.label, value: call.status === 'Completed' ? (f.type === 'options' ? pick(f.options) : f.type === 'yesno' ? pick(['Yes', 'No']) : pick(['Parko Heights', 'Baner Greens', '—'])) : '—' }));
  call.cost = Math.round((call.duration / 60) * COST_PER_MIN * 100) / 100;
  return call;
}).sort((a, b) => b.startedAt - a.startedAt);

export const ALL_CALLS = [...CALLS, ...INBOUND_CALLS].sort((a, b) => b.startedAt - a.startedAt);

/* ---------------- Overview ---------------- */

const trend = lastDays(14, (i) => {
  const attempted = 1500 + i * 60 + int(-180, 220);
  return { attempted, connected: Math.round(attempted * (0.44 + int(-4, 6) / 100)) };
});

const DISPO_COUNTS = [
  { name: 'Interested', value: 1384, color: 'success' },
  { name: 'Call back later', value: 1162 },
  { name: 'Site visit booked', value: 642 },
  { name: 'Not interested', value: 1720 },
  { name: 'No answer / busy', value: 2980 },
  { name: 'Other', value: 412 },
];

export const OVERVIEW = {
  kpis: {
    calls: { value: 18420, delta: 12.4, spark: trend.map((d) => d.attempted) },
    connectRate: { value: 46.8, delta: 3.1, spark: trend.map((d) => Math.round((d.connected / d.attempted) * 1000) / 10) },
    talkMinutes: { value: 21870, delta: 8.6, spark: trend.map((d) => Math.round(d.connected * 1.6)) },
    qualified: { value: 2026, delta: 18.2, spark: trend.map((d) => Math.round(d.connected * 0.26)) },
  },
  trend,
  outcomes: DISPO_COUNTS,
  hours: [0, 0, 0, 0, 0, 0, 0, 2, 18, 96, 182, 214, 196, 160, 172, 205, 230, 211, 168, 92, 24, 4, 0, 0],
  avgHandle: 112,
  costToday: 14220,
};

export const CREDITS = { used: 41250, total: 50000 };

/* ---------------- Contacts directory ---------------- */

const TAGS = ['Hot lead', 'NRI', 'Repeat buyer', 'Investor', 'Pune', 'Mumbai', 'Loan', 'Renewal due', 'VIP'];

export const CONTACTS = range(64, (i) => {
  const name = person();
  const nCamps = int(1, 3);
  const camps = range(nCamps, () => pick(CAMPAIGNS.filter((c) => c.dialled > 0))).filter((c, j, arr) => arr.findIndex((x) => x.id === c.id) === j);
  const lastDisp = pickWeighted([['Interested', 18], ['Site visit booked', 8], ['Call back later', 20], ['Not interested', 22], ['No answer', 22], ['Busy', 6], ['DNC requested', 2], [null, 6]]);
  return {
    id: `ct_${1000 + i}`,
    name,
    phone: phone(),
    email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@${pick(['gmail.com', 'yahoo.in', 'outlook.com'])}`,
    city: pick(CITIES),
    tags: range(int(0, 2), () => pick(TAGS)).filter((t, j, arr) => arr.indexOf(t) === j),
    lastCallAt: lastDisp ? minutesAgo(int(10, 60 * 24 * 14)) : null,
    lastDisposition: lastDisp,
    calls: lastDisp ? int(1, 6) : 0,
    campaigns: camps.map((c) => ({ id: c.id, name: c.name })),
    addedAt: daysAgo(int(5, 90)),
    source: pick(['CSV upload', 'CRM sync', 'Inbound call', 'Manual']),
  };
});

export function contactTimeline(contact) {
  if (!contact.calls) return [];
  return range(contact.calls, (i) => {
    const call = makeCall({ agentKind: 'ai', agentName: `${pick(['Diya', 'Arjun', 'Meera'])} (AI)`, campaign: contact.campaigns[i % contact.campaigns.length]?.name || 'Inbound', minutesBack: int(60, 60 * 24 * 30) });
    call.contact = { name: contact.name, phone: contact.phone };
    call.direction = 'outbound';
    return call;
  }).sort((a, b) => b.startedAt - a.startedAt);
}

/* Per-campaign contact list (generated on demand, deterministic per campaign). */
export function campaignContacts(c) {
  reseed(9000 + Number(c.id.split('_')[1]));
  const n = Math.min(c.contacts, 140);
  const ratioDone = c.contacts ? c.dialled / c.contacts : 0;
  return range(n, (i) => {
    const done = i / n < ratioDone;
    const status = !done ? pickWeighted([['Pending', 90], ['In queue', 10]]) : pickWeighted([['Connected', Math.round((c.connected / (c.dialled || 1)) * 100)], ['No answer', 22], ['Busy', 8], ['Failed', 6]]);
    return {
      id: `${c.id}_c${i}`,
      name: person(),
      phone: phone(),
      city: pick(CITIES.slice(0, 6)),
      status,
      attempts: done ? int(1, c.setup.rules.maxAttempts) : 0,
      lastCallAt: done ? minutesAgo(int(5, 60 * 24 * 4)) : null,
      disposition: status === 'Connected' ? pickWeighted([['Interested', 30], ['Site visit booked', 12], ['Call back later', 24], ['Not interested', 30], ['DNC requested', 2]]) : null,
    };
  });
}

/* Collected-field results for one campaign. */
export function campaignResults(c) {
  return CALLS.filter((x) => x.campaignId === c.id && x.status === 'Completed').map((x) => ({
    id: x.id,
    callId: x.id,
    name: x.contact.name,
    phone: x.contact.phone,
    disposition: x.disposition,
    at: x.startedAt,
    values: Object.fromEntries(x.fields.map((f) => [f.label, f.value])),
  }));
}

/* ---------------- Dispositions ---------------- */

export const DISPOSITIONS = [
  { id: 1, name: 'Interested', description: 'Wants more details or a follow-up from sales.', category: 'Positive', callback: true, active: true, sub: ['Hot', 'Warm'], count: 1384 },
  { id: 2, name: 'Site visit booked', description: 'Agreed on a date and time for a site visit.', category: 'Positive', callback: false, active: true, sub: [], count: 642 },
  { id: 3, name: 'Call back later', description: 'Busy right now, asked us to call at another time.', category: 'Neutral', callback: true, active: true, sub: ['Tomorrow', 'Next week'], count: 1162 },
  { id: 4, name: 'Not interested', description: 'Clearly said no to the offer.', category: 'Negative', callback: false, active: true, sub: ['Price', 'Location', 'Already bought'], count: 1720 },
  { id: 5, name: 'Wrong number', description: 'The person is not the contact we were trying to reach.', category: 'Negative', callback: false, active: true, sub: [], count: 241 },
  { id: 6, name: 'DNC requested', description: 'Asked not to be called again. Number is added to Do Not Call.', category: 'Negative', callback: false, active: true, sub: [], count: 38 },
  { id: 7, name: 'No answer', description: 'Phone rang but nobody picked up.', category: 'Not reached', callback: true, active: true, sub: [], count: 2210 },
  { id: 8, name: 'Busy', description: 'Line was busy or the call was rejected.', category: 'Not reached', callback: true, active: true, sub: [], count: 770 },
  { id: 9, name: 'Language barrier', description: 'Customer could not continue in the call language.', category: 'Neutral', callback: false, active: false, sub: [], count: 64 },
];

/* ---------------- DNC ---------------- */

export const DNC = range(38, (i) => ({
  id: `dnc_${i}`,
  phone: phone(),
  reason: pickWeighted([['Customer request', 50], ['Asked on call', 26], ['Regulatory (NDNC)', 14], ['Wrong number', 10]]),
  addedBy: pick(['AI agent', 'Neha Kapoor', 'Rahul Mehta', 'CSV import']),
  addedAt: daysAgo(int(0, 120)),
  source: pick(['Call', 'Manual', 'CSV']),
}));

/* ---------------- Integrations ---------------- */

export const INTEGRATIONS = [
  {
    id: 'int_lsq',
    name: 'LeadSquared CRM',
    kind: 'CRM',
    status: 'Connected',
    baseUrl: 'https://api-in21.leadsquared.com/v2',
    headers: [
      { id: 'h1', key: 'x-LSQ-AccessKey', value: 'u$r8f2c1d9a6b4e7', secret: true },
      { id: 'h2', key: 'x-LSQ-SecretKey', value: 'b91f0e77c2a43d18', secret: true },
    ],
    lastSync: minutesAgo(6),
    callsToday: 412,
    actions: [
      { id: 'a1', name: 'Look up lead by phone', method: 'GET', path: '/LeadManagement.svc/RetrieveLeadByPhoneNumber?phone={{phone}}', live: true, description: 'Fetch name, project and budget before the call starts.', fields: ['phone'], body: null },
      { id: 'a2', name: 'Update lead stage', method: 'POST', path: '/LeadManagement.svc/Lead.Update?leadId={{lead_id}}', live: false, description: 'Set stage after the call ends.', fields: ['lead_id', 'disposition', 'budget'], body: { Attribute: 'ProspectStage', Value: '{{disposition}}', mx_Budget: '{{budget}}' } },
      { id: 'a3', name: 'Book site visit', method: 'POST', path: '/ProspectActivity.svc/Create', live: true, description: 'Create a site-visit activity when the customer agrees.', fields: ['lead_id', 'visit_date', 'project'], body: { RelatedProspectId: '{{lead_id}}', ActivityEvent: 211, ActivityNote: 'Site visit for {{project}}', ActivityDateTime: '{{visit_date}}' } },
    ],
  },
  {
    id: 'int_zoho',
    name: 'Zoho CRM',
    kind: 'CRM',
    status: 'Connected',
    baseUrl: 'https://www.zohoapis.in/crm/v5',
    headers: [{ id: 'h1', key: 'Authorization', value: 'Zoho-oauthtoken 1000.a8f3c', secret: true }],
    lastSync: minutesAgo(42),
    callsToday: 96,
    actions: [
      { id: 'a1', name: 'Search contact', method: 'GET', path: '/Contacts/search?phone={{phone}}', live: true, description: 'Find the contact record during the call.', fields: ['phone'], body: null },
      { id: 'a2', name: 'Add call note', method: 'POST', path: '/Notes', live: false, description: 'Save summary as a note after the call.', fields: ['contact_id', 'summary'], body: { data: [{ Note_Title: 'AI call', Note_Content: '{{summary}}', Parent_Id: '{{contact_id}}', se_module: 'Contacts' }] } },
    ],
  },
  {
    id: 'int_pay',
    name: 'Payments API',
    kind: 'Custom',
    status: 'Error',
    baseUrl: 'https://pay.rrparko.in/api',
    headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer sk_live_9f2', secret: true }],
    lastSync: minutesAgo(60 * 5),
    callsToday: 0,
    error: '401 Unauthorized: the token expired on 24 Nov.',
    actions: [{ id: 'a1', name: 'Check EMI due', method: 'GET', path: '/emi/due?mobile={{phone}}', live: true, description: 'Tell the customer their next EMI date and amount.', fields: ['phone'], body: null }],
  },
  {
    id: 'int_sheet',
    name: 'Google Sheets export',
    kind: 'Spreadsheet',
    status: 'Disconnected',
    baseUrl: 'https://sheets.googleapis.com/v4',
    headers: [],
    lastSync: null,
    callsToday: 0,
    actions: [],
  },
];

/* ---------------- Email alerts ---------------- */

export const ALERTS = {
  senders: [
    { id: 's1', email: 'alerts@rrparko.in', provider: 'Google Workspace', verified: true, default: true },
    { id: 's2', email: 'sales-bot@rrparko.in', provider: 'SMTP', verified: true, default: false },
    { id: 's3', email: 'noreply@rrparko.co', provider: 'SMTP', verified: false, default: false },
  ],
  rules: [
    { id: 'r1', name: 'Hot lead to sales team', active: true, sender: 's1', recipients: ['sales@rrparko.in', 'neha.kapoor@rrparko.in'], dispositions: ['Interested', 'Site visit booked'], fieldRules: [{ field: 'Interested in site visit', equals: 'Yes' }], campaigns: 'all', includeTranscript: true, includeRecording: true, sentThisWeek: 186 },
    { id: 'r2', name: 'DNC request to compliance', active: true, sender: 's2', recipients: ['compliance@rrparko.in'], dispositions: ['DNC requested'], fieldRules: [], campaigns: 'all', includeTranscript: true, includeRecording: false, sentThisWeek: 7 },
    { id: 'r3', name: 'Loan above ₹10 L', active: false, sender: 's1', recipients: ['loans@rrparko.in'], dispositions: ['Interested'], fieldRules: [{ field: 'Loan amount (₹)', equals: '> 10,00,000' }], campaigns: 'Home loan follow-up · Nov', includeTranscript: false, includeRecording: false, sentThisWeek: 0 },
  ],
};

/* ---------------- Webhook tools ---------------- */

export const TOOLS = [
  { id: 'tl_1', name: 'check_unit_availability', description: 'Check if a flat type is available in a project before offering it.', url: 'https://api.rrparko.in/inventory/availability', method: 'GET', headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer inv_live_77a', secret: true }], params: [{ id: 'p1', name: 'project', type: 'string', required: true, description: 'Project name, e.g. Parko Heights' }, { id: 'p2', name: 'bhk', type: 'number', required: true, description: '1, 2 or 3' }], active: true, usedToday: 214, avgLatency: 340, lastUsed: minutesAgo(3) },
  { id: 'tl_2', name: 'book_site_visit', description: 'Book a site visit slot and send a WhatsApp confirmation.', url: 'https://api.rrparko.in/visits', method: 'POST', headers: [{ id: 'h1', key: 'Authorization', value: 'Bearer inv_live_77a', secret: true }, { id: 'h2', key: 'Content-Type', value: 'application/json', secret: false }], params: [{ id: 'p1', name: 'name', type: 'string', required: true, description: 'Customer name' }, { id: 'p2', name: 'phone', type: 'string', required: true, description: '10-digit mobile' }, { id: 'p3', name: 'date', type: 'string', required: true, description: 'YYYY-MM-DD' }, { id: 'p4', name: 'slot', type: 'string', required: false, description: 'Morning or evening' }], active: true, usedToday: 58, avgLatency: 610, lastUsed: minutesAgo(18) },
  { id: 'tl_3', name: 'get_emi_quote', description: 'Calculate EMI for an amount and tenure.', url: 'https://loans.rrparko.in/emi', method: 'POST', headers: [], params: [{ id: 'p1', name: 'amount', type: 'number', required: true, description: 'Loan amount in ₹' }, { id: 'p2', name: 'tenure_months', type: 'number', required: true, description: '12 to 360' }], active: false, usedToday: 0, avgLatency: 220, lastUsed: daysAgo(6) },
  { id: 'tl_4', name: 'transfer_to_human', description: 'Warm-transfer the call to the sales desk when the customer asks for a person.', url: 'https://api.rrparko.in/telephony/transfer', method: 'POST', headers: [{ id: 'h1', key: 'X-Api-Key', value: 'tx_4b9e2', secret: true }], params: [{ id: 'p1', name: 'call_id', type: 'string', required: true, description: 'Current call ID' }, { id: 'p2', name: 'queue', type: 'string', required: false, description: 'sales or support' }], active: true, usedToday: 23, avgLatency: 180, lastUsed: minutesAgo(41) },
];

/* ---------------- Test calls ---------------- */

export const TEST_PRESETS = [
  { id: 'tp1', label: 'Real estate · Hinglish', voiceId: 'v_diya', engine: 'sarvam', tone: 'Friendly', language: 'Hinglish', knowledge: 'Parko Heights brochure' },
  { id: 'tp2', label: 'Loan · Hindi', voiceId: 'v_arjun', engine: 'sarvam', tone: 'Professional', language: 'Hindi', knowledge: 'Loan FAQ' },
  { id: 'tp3', label: 'Renewal · English', voiceId: 'v_meera', engine: 'elevenlabs', tone: 'Warm', language: 'English', knowledge: 'Policy terms' },
  { id: 'tp4', label: 'Feedback · Tamil', voiceId: 'v_kavya', engine: 'sarvam', tone: 'Calm', language: 'Tamil', knowledge: 'None' },
];
export const KNOWLEDGE_BASES = ['None', 'Parko Heights brochure', 'Loan FAQ', 'Policy terms', 'Service centre list'];

export const TEST_SESSIONS = range(9, (i) => {
  const answered = i % 4 !== 3;
  return {
    id: `ts_${i}`,
    phone: phone(),
    name: person(),
    voice: pick(['Diya', 'Arjun', 'Meera', 'Kavya']),
    engine: pick(['Sarvam', 'ElevenLabs']),
    startedAt: minutesAgo(int(20, 60 * 24 * 5)),
    duration: answered ? int(40, 220) : 0,
    status: answered ? 'Completed' : 'No answer',
    disposition: answered ? pick(['Interested', 'Call back later', 'Site visit booked', 'Not interested']) : 'No answer',
    by: pick(['Neha Kapoor', 'Rahul Mehta', 'You']),
  };
}).sort((a, b) => b.startedAt - a.startedAt);

/** Scripted lines the live test-call panel streams in. */
export const TEST_SCRIPT = (agent, name) => makeTranscript(`${agent} (AI)`, name || 'Rohan Sharma', 11);

/* ---------------- Wizard defaults ---------------- */

export const CSV_SAMPLE = {
  fileName: 'wakad_leads_26nov.csv',
  headers: ['Full Name', 'Mobile', 'City', 'Project', 'Budget'],
  rows: [
    ['Aarav Sharma', '9876543210', 'Pune', 'Parko Heights', '85 L'],
    ['Priya Iyer', '9823011245', 'Pune', 'Parko Heights', '1.1 Cr'],
    ['Rohan Gupta', '9922314567', 'Mumbai', 'Baner Greens', '92 L'],
    ['Ananya Nair', '9765432109', 'Pune', 'Parko Heights', '78 L'],
    ['Vikram Reddy', '9158822330', 'Hyderabad', 'Baner Greens', '1.4 Cr'],
  ],
  total: 2486,
  invalid: 14,
  duplicates: 63,
  dnc: 41,
};

export const NEW_CAMPAIGN = {
  name: '',
  contacts: null,
  answeredBy: 'ai',
  script: { prompt: PROMPTS.realty, opening: 'Namaste {{name}} ji! Main {{agent_name}} bol rahi hoon {{company}} se. Aapne {{project}} ke baare mein enquiry ki thi, kya do minute baat kar sakte hain?', closing: 'Dhanyavaad {{name}} ji, aapka din shubh rahe!', knowledgeKind: 'pdf', knowledgeFiles: [], knowledgeText: '' },
  voice: { voiceId: 'v_diya', engine: 'sarvam', language: 'Hinglish', speed: 1, tone: 'Friendly', interruptions: true, background: 'office' },
  fields: FIELDSETS.realty.map((f) => ({ ...f })),
  rules: { from: '10:00', to: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], concurrency: 10, retryMode: 'delay', retryDelay: 120, retrySlots: 3, maxAttempts: 3, retryOn: ['No answer', 'Busy'] },
};

export { id as newId };
