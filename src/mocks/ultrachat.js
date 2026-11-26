/*
 * UltraChat (WhatsApp business CRM) mock data. Deterministic: reseeds before generating so screens
 * look the same on every reload. Shapes here are the contract the real API should follow.
 */
import { reseed, int, pick, pickWeighted, range, phone, minutesAgo, daysAgo, lastDays, person, CITIES, rand } from './seed';

reseed(7007);

/* ---------------- people ---------------- */

export const AGENTS = [
  { id: 'ag_rahul', name: 'Rahul Verma', status: 'online', role: 'Agent' },
  { id: 'ag_sneha', name: 'Sneha Kapoor', status: 'online', role: 'Agent' },
  { id: 'ag_karan', name: 'Karan Mehta', status: 'away', role: 'Agent' },
  { id: 'ag_divya', name: 'Divya Nair', status: 'online', role: 'Agent' },
  { id: 'ag_amit', name: 'Amit Joshi', status: 'offline', role: 'Agent' },
];
export const ME_AGENT = 'Rahul Verma';

export const LABELS = [
  { id: 'hot', name: 'Hot lead', tone: 'danger' },
  { id: 'visit', name: 'Site visit', tone: 'success' },
  { id: 'payment', name: 'Payment', tone: 'warning' },
  { id: 'complaint', name: 'Complaint', tone: 'accent' },
  { id: 'brochure', name: 'Brochure sent', tone: 'info' },
  { id: 'nri', name: 'NRI', tone: 'violet' },
];

export const QUICK_REPLIES = [
  { id: 'qr1', shortcut: 'hi', title: 'Greeting', text: 'Namaste! Main RR Parko se baat kar raha hoon. Aapki kaise madad kar sakta hoon?' },
  { id: 'qr2', shortcut: 'visit', title: 'Book site visit', text: 'Site visit ke liye Saturday ya Sunday, 11 AM se 6 PM tak slots available hain. Aapko kaunsa time suit karega?' },
  { id: 'qr3', shortcut: 'price', title: 'Price list', text: 'Parko Heights, Wakad: 2BHK ₹82 L se, 3BHK ₹1.14 Cr se (all inclusive). Detailed price sheet bhej raha hoon.' },
  { id: 'qr4', shortcut: 'loc', title: 'Location pin', text: 'Site location: https://maps.app.goo.gl/parko-heights-wakad. Hinjewadi Phase 1 se 10 minute.' },
  { id: 'qr5', shortcut: 'emi', title: 'EMI options', text: 'HDFC, SBI aur ICICI ke saath tie-up hai. ₹82 L par EMI lagbhag ₹62,400/month (20 saal, 8.5%).' },
  { id: 'qr6', shortcut: 'thanks', title: 'Closing', text: 'Dhanyavaad! Koi bhi sawaal ho to isi number par message kijiye.' },
];

/* ---------------- templates ---------------- */

const T = (o) => ({ language: 'English', header: null, footer: '', buttons: [], samples: [], status: 'Approved', sent: 0, readRate: 0, replyRate: 0, ...o });

export const TEMPLATES = [
  T({ id: 'tp_diwali', name: 'diwali_offer_2026', category: 'Marketing', header: { type: 'image', text: 'diwali-banner.jpg' }, body: 'Hi {{1}}, is Diwali RR Parko ki taraf se special offer! 🪔 Book a 2BHK at Parko Heights before {{2}} and get *zero stamp duty* + modular kitchen free.', samples: ['Priya', '15 Nov'], footer: 'Reply STOP to opt out', buttons: [{ type: 'url', text: 'View offer', url: 'https://rrparko.in/diwali' }, { type: 'quick', text: 'Call me back' }], sent: 48210, readRate: 71.4, replyRate: 6.2, updatedAt: daysAgo(30) }),
  T({ id: 'tp_visit', name: 'site_visit_reminder', category: 'Utility', body: 'Hi {{1}}, reminder: your site visit at {{2}} is on {{3}}. Our relationship manager {{4}} will meet you at the sales lounge.', samples: ['Rohan', 'Parko Heights, Wakad', 'Sat 30 Nov, 11:00 AM', 'Sneha'], footer: 'RR Parko', buttons: [{ type: 'quick', text: 'Confirm' }, { type: 'quick', text: 'Reschedule' }], sent: 3120, readRate: 92.1, replyRate: 48.3, updatedAt: daysAgo(12) }),
  T({ id: 'tp_payment', name: 'payment_due_notice', category: 'Utility', header: { type: 'text', text: 'Payment reminder' }, body: 'Dear {{1}}, your instalment of ₹{{2}} for unit {{3}} is due on {{4}}. Please ignore if already paid.', samples: ['Vikram', '4,50,000', 'B-1204', '5 Dec'], buttons: [{ type: 'url', text: 'Pay now', url: 'https://pay.rrparko.in/{{1}}' }], sent: 1840, readRate: 88.6, replyRate: 12.1, updatedAt: daysAgo(40) }),
  T({ id: 'tp_otp', name: 'login_otp', category: 'Authentication', body: '{{1}} is your verification code. For your security, do not share this code.', samples: ['482913'], buttons: [{ type: 'copy', text: 'Copy code' }], expiry: 10, sent: 12640, readRate: 96.2, replyRate: 0, updatedAt: daysAgo(90) }),
  T({ id: 'tp_brochure', name: 'brochure_share', category: 'Marketing', header: { type: 'document', text: 'Parko-Heights-Brochure.pdf' }, body: 'Hi {{1}}, as requested here is the brochure for {{2}}. Floor plans, amenities and price sheet are inside.', samples: ['Ananya', 'Parko Heights'], buttons: [{ type: 'quick', text: 'Book site visit' }, { type: 'call', text: 'Call sales', phone: '+91 20 4890 1200' }], sent: 6420, readRate: 79.8, replyRate: 14.6, updatedAt: daysAgo(18) }),
  T({ id: 'tp_launch', name: 'new_launch_baner', category: 'Marketing', header: { type: 'video', text: 'baner-walkthrough.mp4' }, body: 'Pre-launch alert 🚀 Parko Greens, Baner: 3 & 4 BHK from ₹1.6 Cr. EOI window open till {{1}}. Early birds get ₹3 L off.', samples: ['10 Dec'], footer: 'Reply STOP to opt out', buttons: [{ type: 'url', text: 'Register EOI', url: 'https://rrparko.in/greens' }], sent: 22100, readRate: 64.2, replyRate: 3.9, updatedAt: daysAgo(6) }),
  T({ id: 'tp_feedback', name: 'visit_feedback', category: 'Utility', body: 'Thank you for visiting {{1}}, {{2}}! How was your experience with us today?', samples: ['Parko Heights', 'Meera'], buttons: [{ type: 'quick', text: 'Loved it' }, { type: 'quick', text: 'It was okay' }, { type: 'quick', text: 'Not happy' }], sent: 2210, readRate: 90.4, replyRate: 38.7, updatedAt: daysAgo(22) }),
  T({ id: 'tp_optin', name: 'optin_request', category: 'Marketing', body: 'Hi {{1}}, would you like to receive project updates, offers and site visit slots from RR Parko on WhatsApp?', samples: ['Arjun'], buttons: [{ type: 'quick', text: 'Yes, opt me in' }, { type: 'quick', text: 'No thanks' }], sent: 9100, readRate: 74.0, replyRate: 41.2, updatedAt: daysAgo(55) }),
  T({ id: 'tp_carousel', name: 'project_showcase', category: 'Marketing', body: 'Hi {{1}}, swipe through our ready-to-move projects in Pune 👇', samples: ['Kavya'], carousel: [{ title: 'Parko Heights, Wakad', text: '2 & 3 BHK · from ₹82 L', button: 'View' }, { title: 'Parko Greens, Baner', text: '3 & 4 BHK · from ₹1.6 Cr', button: 'View' }, { title: 'Parko Vista, Hinjewadi', text: '1 & 2 BHK · from ₹54 L', button: 'View' }], status: 'Pending', updatedAt: daysAgo(1) }),
  T({ id: 'tp_hindi', name: 'site_visit_reminder_hi', category: 'Utility', language: 'Hindi', body: 'नमस्ते {{1}} जी, आपकी साइट विज़िट {{2}} को है। हमारी टीम आपका इंतज़ार करेगी।', samples: ['राहुल', 'शनिवार 11 बजे'], buttons: [{ type: 'quick', text: 'ठीक है' }], sent: 540, readRate: 89.0, replyRate: 33.0, updatedAt: daysAgo(14) }),
  T({ id: 'tp_flash', name: 'flash_sale_weekend', category: 'Marketing', header: { type: 'text', text: 'Only this weekend!' }, body: 'GUARANTEED lowest price!!! Book now or lose forever. Limited units. Hurry {{1}}!!!', samples: ['Sahil'], status: 'Rejected', rejectReason: 'Promotional content is misleading (“guaranteed lowest price”) and uses excessive capital letters and punctuation.', updatedAt: daysAgo(3) }),
  T({ id: 'tp_kyc', name: 'kyc_documents', category: 'Utility', body: 'Hi {{1}}, to complete your booking for unit {{2}}, please share PAN, Aadhaar and a cancelled cheque on this chat.', samples: ['Nikhil', 'A-704'], status: 'Pending', updatedAt: minutesAgo(180) }),
  T({ id: 'tp_handover', name: 'possession_handover', category: 'Utility', header: { type: 'image', text: 'keys.jpg' }, body: 'Congratulations {{1}}! 🎉 Your home {{2}} is ready for possession. Pick a handover slot below.', samples: ['Divya', 'B-1204'], buttons: [{ type: 'url', text: 'Pick a slot', url: 'https://rrparko.in/handover' }], sent: 312, readRate: 97.1, replyRate: 61.0, updatedAt: daysAgo(48) }),
  T({ id: 'tp_referral', name: 'referral_reward', category: 'Marketing', body: 'Refer a friend to RR Parko and earn ₹1,00,000 when they book. Share your code {{1}}.', samples: ['PARKO-PRIYA'], status: 'Rejected', rejectReason: 'Variable used at the start of a new line without surrounding text; add context around {{1}}.', updatedAt: daysAgo(9) }),
];

/* ---------------- contacts & conversations ---------------- */

const SNIPPETS_IN = [
  'Price list bhej do please',
  'Is the 3BHK still available?',
  'Kal site visit ho sakta hai kya?',
  'Payment link not working',
  'Loan ke liye kaunsa bank best hai?',
  'Brochure mil gaya, thanks',
  'Possession kab tak milega?',
  'Can I get a call back after 6 PM?',
  'Parking included hai?',
  'Mera booking amount refund kab hoga?',
  'Sample flat dekh sakte hai?',
  'Need floor plan for B wing',
];

const CONTACT_NAMES = ['Priya Sharma', 'Rohan Gupta', 'Ananya Iyer', 'Vikram Reddy', 'Sneha Joshi', 'Arjun Nair', 'Kavya Mehta', 'Nikhil Kapoor', 'Meera Kulkarni', 'Sahil Malhotra', 'Isha Bose', 'Varun Chauhan', 'Tanvi Patel', 'Aditya Das', 'Ritika Singh', 'Manish Verma', 'Pooja Iyer', 'Karan Sharma', 'Divya Reddy', 'Amit Gupta', 'Simran Kaur', 'Neha Joshi'];

export const CONVERSATIONS = CONTACT_NAMES.map((name, i) => {
  const status = i < 14 ? 'Open' : i < 18 ? 'Pending' : 'Resolved';
  const assignee = i % 5 === 3 || i === 0 ? null : i % 3 === 0 ? ME_AGENT : pick(AGENTS).name;
  const lastIn = i < 14 ? int(1, 70) + i * 4 : int(120, 60 * 30);
  const lastDir = i % 4 === 1 ? 'out' : 'in';
  const handledBy = i === 0 || i === 6 || i === 11 ? 'bot' : i === 9 ? 'flow' : 'agent';
  return {
    id: `cv_${i + 1}`,
    contact: { name, phone: phone(), city: pick(CITIES.slice(0, 6)), email: `${name.split(' ')[0].toLowerCase()}@gmail.com` },
    status,
    assignee: handledBy === 'bot' ? null : assignee,
    labels: i % 3 === 0 ? ['hot'] : i % 4 === 0 ? ['visit', 'brochure'] : i % 5 === 0 ? ['payment'] : i === 7 ? ['complaint'] : [],
    unread: lastDir === 'in' && status === 'Open' ? int(1, 4) : 0,
    last: { dir: lastDir, text: i === 2 ? '📄 Floor-plan-B-wing.pdf' : i === 5 ? '📷 Photo' : SNIPPETS_IN[i % SNIPPETS_IN.length], at: minutesAgo(lastIn) },
    waitingMin: lastDir === 'in' && status !== 'Resolved' ? lastIn : 0,
    handledBy,
    // minutes left in the 24h customer-service window (negative = closed)
    windowLeftMin: i === 4 || i === 12 || i >= 18 ? -int(30, 600) : 24 * 60 - lastIn,
    optIn: i === 15 ? 'Opted out' : 'Opted in',
    source: pick(['Click-to-WhatsApp ad', 'Website widget', 'Diwali campaign', 'AI call follow-up', 'Walk-in QR']),
  };
});

const CAMPAIGN_NAMES = ['Diwali offer 2026', 'Baner pre-launch EOI', 'Site visit reminders — Sat', 'Payment due Dec', 'Brochure follow-up', 'Opt-in drive Q4'];

/** Full thread for one conversation. Built on demand so the list stays light. */
export function buildThread(conv) {
  reseed(conv.id.length * 97 + Number(conv.id.split('_')[1]) * 13);
  const first = conv.contact.name.split(' ')[0];
  const base = conv.last.at.getTime();
  const at = (minBefore) => new Date(base - minBefore * 60000);
  const msgs = [];
  let n = 0;
  const push = (m) => msgs.push({ id: `${conv.id}_m${n++}`, status: 'read', ...m });

  push({ type: 'template', dir: 'out', at: at(60 * 26 + 40), author: 'Campaign', template: { ...TEMPLATES[0], filled: [first, '30 Nov'] } });
  push({ type: 'text', dir: 'in', at: at(60 * 26 + 12), text: 'Hi, interested. 2BHK ka price kya hai?' });
  push({ type: 'system', at: at(60 * 26 + 12), text: 'Flow “Price enquiry” started' });
  push({ type: 'text', dir: 'out', at: at(60 * 26 + 11), author: 'AI bot', bot: true, text: `Namaste ${first} ji! Parko Heights, Wakad mein 2BHK ₹82 L se start hota hai (all inclusive). Kya aap site visit karna chahenge?` });
  push({ type: 'text', dir: 'in', at: at(60 * 26 + 2), text: 'Haan, but pehle floor plan dekhna hai' });
  push({ type: 'document', dir: 'out', at: at(60 * 26), author: 'AI bot', bot: true, media: { name: 'Parko-Heights-Floor-Plans.pdf', size: '2.4 MB', pages: 12 } });
  if (conv.handledBy !== 'bot') {
    push({ type: 'system', at: at(60 * 25 + 50), text: 'AI bot handed over to an agent: customer asked for a negotiation' });
    push({ type: 'system', at: at(60 * 25 + 48), text: `Assigned to ${conv.assignee || 'Sneha Kapoor'}` });
    push({ type: 'text', dir: 'out', at: at(60 * 25 + 40), author: conv.assignee || 'Sneha Kapoor', text: `Hi ${first} ji, main ${(conv.assignee || 'Sneha Kapoor').split(' ')[0]}. Floor plan mein koi specific wing pasand aaya?` });
    push({ type: 'image', dir: 'in', at: at(60 * 25 + 20), media: { name: 'IMG_2031.jpg', caption: 'B wing ka ye wala layout' } });
    push({ type: 'note', at: at(60 * 25 + 18), author: conv.assignee || 'Sneha Kapoor', text: 'Budget 85 L max. Wants east facing, B wing, 9th floor+. Loan pre-approved with HDFC.' });
    push({ type: 'text', dir: 'out', at: at(60 * 25 + 10), author: conv.assignee || 'Sneha Kapoor', text: 'B-904 east facing available hai, ₹84.2 L final. Is weekend site visit karein?' });
  }
  if (conv.windowLeftMin > 0) {
    push({ type: 'text', dir: 'in', at: at(int(20, 40)), text: 'Saturday 11 baje theek rahega' });
    push({ type: 'text', dir: 'out', at: at(int(12, 18)), author: conv.assignee || 'AI bot', bot: !conv.assignee, text: 'Done! Saturday 30 Nov, 11 AM confirm hai. Location pin bhej raha hoon.', status: 'read' });
    push({ type: 'location', dir: 'out', at: at(11), author: conv.assignee || 'AI bot', bot: !conv.assignee, media: { name: 'Parko Heights Sales Lounge', address: 'Survey 42, Wakad, Pune 411057' }, status: 'delivered' });
  }
  push({ type: 'text', dir: conv.last.dir, at: conv.last.at, text: conv.last.text, author: conv.last.dir === 'out' ? conv.assignee || 'Sneha Kapoor' : undefined, status: conv.last.dir === 'out' ? 'delivered' : undefined });
  return msgs;
}

export function customerProfile(conv) {
  reseed(Number(conv.id.split('_')[1]) * 31);
  return {
    ...conv.contact,
    language: pick(['Hinglish', 'English', 'Hindi', 'Marathi']),
    firstSeen: daysAgo(int(20, 200)),
    optInAt: daysAgo(int(10, 120)),
    tags: ['2BHK', 'Wakad', pick(['Budget 80–90 L', 'Budget 1–1.2 Cr']), pick(['Loan needed', 'Self funded'])],
    notes: [{ by: 'Sneha Kapoor', at: daysAgo(3), text: 'Wife will join site visit. Prefers weekend slots.' }],
    orders: int(0, 1)
      ? [{ id: 'BK-20981', item: 'Booking amount · B-904', amount: 200000, status: 'Paid', at: daysAgo(8) }, { id: 'BK-21004', item: 'Stamp duty advance', amount: 85000, status: 'Pending', at: daysAgo(1) }]
      : [],
    campaigns: [
      { name: 'Diwali offer 2026', at: daysAgo(14), status: 'Read' },
      { name: 'Brochure follow-up', at: daysAgo(6), status: 'Delivered' },
    ],
    leadFields: [
      { label: 'Budget', value: '₹85 L' },
      { label: 'Configuration', value: '2BHK' },
      { label: 'Timeline', value: 'Within 3 months' },
    ],
  };
}

/* ---------------- campaigns ---------------- */

const camp = (o) => {
  const sent = o.sent ?? 0;
  const delivered = Math.round(sent * (o.dRate ?? 0.94));
  const read = Math.round(delivered * (o.rRate ?? 0.72));
  const replied = Math.round(read * (o.repRate ?? 0.09));
  return { audience: sent, delivered, read, replied, failed: sent - delivered, cost: Math.round(sent * (o.category === 'Utility' ? 0.14 : 0.88)), progress: 100, ...o };
};

export const CAMPAIGNS = [
  camp({ id: 'cp_101', name: 'Diwali offer 2026', template: 'diwali_offer_2026', category: 'Marketing', status: 'Completed', sent: 48210, startedAt: daysAgo(16, 10), createdBy: 'Riya Malhotra', dRate: 0.952, rRate: 0.75, repRate: 0.087 }),
  camp({ id: 'cp_102', name: 'Baner pre-launch EOI', template: 'new_launch_baner', category: 'Marketing', status: 'Running', sent: 14820, audience: 22100, progress: 67, startedAt: minutesAgo(95), createdBy: 'Riya Malhotra', dRate: 0.93, rRate: 0.61, repRate: 0.06 }),
  camp({ id: 'cp_103', name: 'Site visit reminders — Sat', template: 'site_visit_reminder', category: 'Utility', status: 'Scheduled', sent: 0, audience: 186, progress: 0, scheduledAt: new Date('2026-11-29T09:00:00+05:30'), createdBy: 'Sneha Kapoor' }),
  camp({ id: 'cp_104', name: 'Payment due Dec', template: 'payment_due_notice', category: 'Utility', status: 'Scheduled', sent: 0, audience: 412, progress: 0, scheduledAt: new Date('2026-12-01T10:00:00+05:30'), createdBy: 'Riya Malhotra' }),
  camp({ id: 'cp_105', name: 'Brochure follow-up', template: 'brochure_share', category: 'Marketing', status: 'Completed', sent: 6420, startedAt: daysAgo(6, 12), createdBy: 'Karan Mehta', dRate: 0.96, rRate: 0.8, repRate: 0.15 }),
  camp({ id: 'cp_106', name: 'Opt-in drive Q4', template: 'optin_request', category: 'Marketing', status: 'Completed', sent: 9100, startedAt: daysAgo(22, 11), createdBy: 'Riya Malhotra', dRate: 0.9, rRate: 0.74, repRate: 0.41 }),
  camp({ id: 'cp_107', name: 'Weekend flash sale', template: 'flash_sale_weekend', category: 'Marketing', status: 'Failed', sent: 0, audience: 8200, progress: 0, startedAt: daysAgo(3, 9), createdBy: 'Karan Mehta', failNote: 'Template was rejected by Meta before sending.' }),
  camp({ id: 'cp_108', name: 'Hinjewadi cold leads', template: 'diwali_offer_2026', category: 'Marketing', status: 'Failed', sent: 3400, startedAt: daysAgo(9, 15), createdBy: 'Amit Joshi', dRate: 0.41, rRate: 0.5, repRate: 0.03, failNote: 'Stopped: 59% failed (mostly numbers not on WhatsApp and Meta marketing limits).' }),
  camp({ id: 'cp_109', name: 'Visit feedback — Nov', template: 'visit_feedback', category: 'Utility', status: 'Completed', sent: 2210, startedAt: daysAgo(2, 18), createdBy: 'Sneha Kapoor', dRate: 0.98, rRate: 0.9, repRate: 0.38 }),
  camp({ id: 'cp_110', name: 'Possession handover B wing', template: 'possession_handover', category: 'Utility', status: 'Running', sent: 212, audience: 312, progress: 68, startedAt: minutesAgo(30), createdBy: 'Riya Malhotra', dRate: 0.99, rRate: 0.92, repRate: 0.5 }),
  camp({ id: 'cp_111', name: 'Christmas offer draft', template: 'project_showcase', category: 'Marketing', status: 'Draft', sent: 0, audience: 15400, progress: 0, createdBy: 'Riya Malhotra' }),
  camp({ id: 'cp_112', name: 'KYC chase', template: 'kyc_documents', category: 'Utility', status: 'Draft', sent: 0, audience: 64, progress: 0, createdBy: 'Divya Nair' }),
];

export const FAILURE_REASONS = [
  { code: '131026', label: 'Number not on WhatsApp', meaning: 'The phone number has no WhatsApp account, or is a landline. Clean these from your lists.', share: 0.42 },
  { code: '131049', label: 'Meta marketing limit', meaning: 'Meta limits how many marketing messages one person gets per day. Retry after 24 hours.', share: 0.27 },
  { code: '131047', label: '24-hour window closed', meaning: 'Free-form message sent outside the 24-hour window. Send an approved template instead.', share: 0.11 },
  { code: '131050', label: 'User stopped marketing', meaning: 'The person turned off marketing messages from your business on WhatsApp.', share: 0.09 },
  { code: '131000', label: 'Something went wrong', meaning: 'A temporary error at Meta. Usually succeeds on retry.', share: 0.06 },
  { code: '132012', label: 'Variable format mismatch', meaning: 'A template variable was empty or too long. Check the column you mapped.', share: 0.05 },
];

export function campaignRecipients(c) {
  reseed(Number(c.id.split('_')[1]) * 17);
  const n = Math.min(120, c.audience);
  const sentShare = c.audience ? c.sent / c.audience : 0;
  return range(n, (i) => {
    const sent = rand() < sentShare;
    const status = !sent ? (c.status === 'Failed' ? 'Failed' : 'Queued') : pickWeighted([['Read', c.read], ['Delivered', c.delivered - c.read], ['Failed', c.failed], ['Sent', Math.max(1, c.sent * 0.01)]]);
    const replied = status === 'Read' && rand() < (c.replied / Math.max(1, c.read));
    const reason = status === 'Failed' ? pickWeighted(FAILURE_REASONS.map((r) => [r, r.share])) : null;
    return {
      id: `${c.id}_r${i}`,
      name: person(),
      phone: phone(),
      status: replied ? 'Replied' : status,
      reason: reason?.label,
      code: reason?.code,
      at: sent ? minutesAgo(int(5, 60 * 24 * 3)) : null,
    };
  });
}

/* ---------------- opt-ins, groups ---------------- */

export const OPT_INS = range(64, (i) => {
  const status = pickWeighted([['Opted in', 82], ['Opted out', 12], ['Pending', 6]]);
  return {
    id: `oi_${i}`,
    name: person(),
    phone: phone(),
    status,
    source: pick(['Website form', 'Click-to-WhatsApp ad', 'Opt-in template reply', 'Zoho CRM', 'Walk-in QR', 'CSV import']),
    at: daysAgo(int(0, 120), int(9, 20)),
    city: pick(CITIES),
  };
});

export const GROUPS = [
  { id: 'gr_1', name: 'Parko Heights Residents', members: 248, capacity: 1024, description: 'Owners of Parko Heights, Wakad. Maintenance and society updates.', admins: ['Riya Malhotra', 'Divya Nair'], createdAt: daysAgo(210), lastActivity: minutesAgo(40) },
  { id: 'gr_2', name: 'Baner EOI — Early birds', members: 512, capacity: 1024, description: 'Pre-launch EOI holders for Parko Greens.', admins: ['Riya Malhotra'], createdAt: daysAgo(12), lastActivity: minutesAgo(180) },
  { id: 'gr_3', name: 'Channel Partners Pune', members: 86, capacity: 1024, description: 'Brokers and channel partners. Inventory and payout updates.', admins: ['Karan Mehta'], createdAt: daysAgo(400), lastActivity: daysAgo(1) },
  { id: 'gr_4', name: 'Site visit — this weekend', members: 41, capacity: 256, description: 'Everyone booked for a Sat/Sun visit. Directions and parking info.', admins: ['Sneha Kapoor'], createdAt: daysAgo(3), lastActivity: minutesAgo(15) },
  { id: 'gr_5', name: 'Parko Vista NRI buyers', members: 133, capacity: 1024, description: 'NRI customers across UAE, US and UK.', admins: ['Divya Nair'], createdAt: daysAgo(150), lastActivity: daysAgo(4) },
  { id: 'gr_6', name: 'Possession B wing', members: 96, capacity: 256, description: 'Handover schedule for B wing owners.', admins: ['Riya Malhotra'], createdAt: daysAgo(30), lastActivity: daysAgo(2) },
].map((g) => ({ ...g, invite: `https://chat.whatsapp.com/${g.id.replace('gr_', 'Prk')}Lx${g.members}Qz7` }));

/* ---------------- flows ---------------- */

export const FLOWS = [
  { id: 'fl_price', name: 'Price enquiry', status: 'Live', trigger: 'price, rate, cost, kitna', runs: 4820, completion: 71, updatedAt: daysAgo(4) },
  { id: 'fl_visit', name: 'Book a site visit', status: 'Live', trigger: 'visit, site, dekhna', runs: 1960, completion: 64, updatedAt: daysAgo(9) },
  { id: 'fl_welcome', name: 'Welcome & menu', status: 'Live', trigger: 'Any first message', runs: 12840, completion: 82, updatedAt: daysAgo(20) },
  { id: 'fl_payment', name: 'Payment help', status: 'Draft', trigger: 'payment, pay, emi', runs: 0, completion: 0, updatedAt: minutesAgo(140) },
  { id: 'fl_complaint', name: 'Complaint intake', status: 'Paused', trigger: 'complaint, issue, problem', runs: 312, completion: 58, updatedAt: daysAgo(33) },
];

/** Graph for the editor. Node positions are canvas pixels. */
export const FLOW_GRAPH = {
  nodes: [
    { id: 'n1', type: 'trigger', x: 0, y: 190, data: { keywords: 'price, rate, cost, kitna' } },
    { id: 'n2', type: 'message', x: 270, y: 170, data: { text: 'Namaste {{name}}! 🙏 RR Parko mein aapka swagat hai. Kis project ka price chahiye?' } },
    { id: 'n3', type: 'buttons', x: 540, y: 130, data: { text: 'Project chuniye:', options: ['Parko Heights', 'Parko Greens', 'Parko Vista'] } },
    { id: 'n4', type: 'media', x: 810, y: 10, data: { media: 'Heights-price-sheet.pdf', caption: '2BHK from ₹82 L, 3BHK from ₹1.14 Cr' } },
    { id: 'n5', type: 'ask', x: 810, y: 200, data: { question: 'Aapka budget kitna hai?', saveAs: 'budget', validation: 'Number' } },
    { id: 'n6', type: 'condition', x: 1080, y: 200, data: { field: 'budget', op: '≥', value: '15000000' } },
    { id: 'n7', type: 'crm', x: 1350, y: 330, data: { action: 'Create lead in Zoho CRM', url: '' } },
    { id: 'n8', type: 'handover', x: 1350, y: 110, data: { team: 'Sales — Pune', note: 'High budget lead' } },
    { id: 'n9', type: 'ai', x: 810, y: 390, data: { goal: 'Answer questions about Parko Vista from the knowledge base' } },
  ],
  edges: [
    { id: 'e1', from: 'n1', port: 0, to: 'n2' },
    { id: 'e2', from: 'n2', port: 0, to: 'n3' },
    { id: 'e3', from: 'n3', port: 0, to: 'n4' },
    { id: 'e4', from: 'n3', port: 1, to: 'n5' },
    { id: 'e5', from: 'n3', port: 2, to: 'n9' },
    { id: 'e6', from: 'n5', port: 0, to: 'n6' },
    { id: 'e7', from: 'n6', port: 0, to: 'n8' },
    { id: 'e8', from: 'n6', port: 1, to: 'n7' },
  ],
};

/* ---------------- AI bot ---------------- */

export const BOT = {
  enabled: true,
  name: 'Parko Assistant',
  sources: [
    { id: 'ks1', kind: 'file', name: 'Parko-Heights-Brochure.pdf', size: '4.2 MB', status: 'Ready', chunks: 184, updatedAt: daysAgo(10) },
    { id: 'ks2', kind: 'file', name: 'Price-sheet-Nov-2026.xlsx', size: '220 KB', status: 'Ready', chunks: 36, updatedAt: daysAgo(4) },
    { id: 'ks3', kind: 'url', name: 'https://rrparko.in/projects', status: 'Ready', chunks: 92, updatedAt: daysAgo(2) },
    { id: 'ks4', kind: 'file', name: 'Home-loan-FAQ.docx', size: '88 KB', status: 'Processing', chunks: 0, updatedAt: minutesAgo(3) },
    { id: 'ks5', kind: 'url', name: 'https://rrparko.in/greens-baner', status: 'Failed', error: 'Page blocked crawlers (403)', chunks: 0, updatedAt: minutesAgo(50) },
  ],
  leadFields: [
    { id: 'lf1', label: 'Name', key: 'name', required: true },
    { id: 'lf2', label: 'Budget', key: 'budget', required: true },
    { id: 'lf3', label: 'Preferred location', key: 'location', required: true },
    { id: 'lf4', label: 'Configuration (BHK)', key: 'bhk', required: false },
    { id: 'lf5', label: 'Site visit date', key: 'visit_date', required: false },
  ],
  behaviour: {
    tone: 'Friendly',
    languages: ['English', 'Hindi', 'Hinglish', 'Marathi'],
    handover: ['Customer asks for a human', 'Price negotiation or discount', 'Complaint or angry tone', 'Bot is unsure twice in a row'],
    hours: '24x7',
    greeting: 'Namaste! Main Parko Assistant hoon. Projects, prices ya site visit ke baare mein poochiye.',
  },
  stats: { answered: 8420, resolved: 68.2, handedOver: 21.4, leads: 1124 },
};

/* ---------------- media ---------------- */

export const MEDIA = [
  ['diwali-banner.jpg', 'image', '820 KB', 'Diwali offer 2026'],
  ['baner-walkthrough.mp4', 'video', '14.2 MB', 'Baner pre-launch'],
  ['Parko-Heights-Brochure.pdf', 'document', '4.2 MB', 'Brochure follow-up'],
  ['keys.jpg', 'image', '410 KB', 'Possession handover'],
  ['Heights-price-sheet.pdf', 'document', '310 KB', 'Price enquiry flow'],
  ['sample-flat-living.jpg', 'image', '1.1 MB', null],
  ['sample-flat-kitchen.jpg', 'image', '980 KB', null],
  ['greens-aerial.jpg', 'image', '2.3 MB', 'Baner pre-launch'],
  ['clubhouse-tour.mp4', 'video', '22.8 MB', null],
  ['Floor-plans-B-wing.pdf', 'document', '2.4 MB', null],
  ['welcome-voice-note.ogg', 'audio', '96 KB', 'Welcome & menu'],
  ['vista-elevation.jpg', 'image', '1.6 MB', null],
  ['loan-partners.png', 'image', '340 KB', null],
  ['Allotment-letter-format.pdf', 'document', '120 KB', null],
  ['site-directions.mp4', 'video', '8.1 MB', 'Site visit reminders — Sat'],
  ['rera-certificate.pdf', 'document', '660 KB', null],
].map(([name, type, size, usedIn], i) => ({ id: `md_${i}`, name, type, size, usedIn, uploadedBy: pick(['Riya Malhotra', 'Karan Mehta', 'Divya Nair']), at: daysAgo(int(0, 60)), url: `https://cdn.ultrachat.in/rrparko/${name}` }));

/* ---------------- reports ---------------- */

export const NUMBERS = ['+91 20 4890 1200', '+91 98220 41100'];

export const DELIVERY_ROWS = range(160, (i) => {
  const tp = pick(TEMPLATES.filter((t) => t.status === 'Approved'));
  const status = pickWeighted([['Read', 58], ['Delivered', 22], ['Sent', 6], ['Failed', 9], ['Replied', 5]]);
  const charge = status === 'Failed' ? 0 : tp.category === 'Marketing' ? 0.88 : tp.category === 'Utility' ? 0.14 : 0.14;
  return {
    id: `dl_${i}`,
    to: phone(),
    name: person(),
    template: tp.name,
    category: tp.category,
    status,
    reason: status === 'Failed' ? pick(FAILURE_REASONS).label : null,
    charge,
    number: pick(NUMBERS),
    agent: pickWeighted([['Campaign', 60], ['AI bot', 15], ...AGENTS.map((a) => [a.name, 5])]),
    at: minutesAgo(int(5, 60 * 24 * 7)),
  };
}).sort((a, b) => b.at - a.at);

export const AGENT_STATS = AGENTS.map((a, i) => ({
  ...a,
  assigned: [142, 128, 96, 118, 54][i],
  replied: [138, 117, 81, 112, 40][i],
  pending: [4, 11, 15, 6, 14][i],
  firstResponse: [62, 94, 186, 78, 240][i], // seconds
  resolution: [42, 55, 88, 47, 120][i], // minutes
  csat: [4.7, 4.5, 4.1, 4.6, 3.9][i],
}));

/* ---------------- overview ---------------- */

export const OVERVIEW = {
  kpis: {
    sent: { value: 92480, delta: 14.2, spark: [9, 11, 10, 14, 12, 16, 18] },
    delivered: { value: 94.6, delta: 0.8, spark: [93, 94, 93.5, 94, 94.2, 94.8, 94.6] },
    read: { value: 71.8, delta: 3.4, spark: [66, 68, 69, 70, 70.5, 71, 71.8] },
    replyRate: { value: 8.9, delta: -0.6, spark: [9.8, 9.6, 9.4, 9.1, 9.3, 9, 8.9] },
    openChats: { value: 18, delta: -22, spark: [40, 32, 30, 26, 24, 20, 18] },
    firstResponse: { value: 94, delta: -12.5, spark: [140, 130, 120, 112, 104, 98, 94] },
  },
  funnel: [
    { label: 'Sent', value: 92480 },
    { label: 'Delivered', value: 87486 },
    { label: 'Read', value: 62815 },
    { label: 'Replied', value: 8231 },
  ],
  trend: lastDays(14, (i) => {
    const sent = 4200 + Math.round(Math.sin(i / 2) * 1400) + i * 260 + (i === 9 ? 9000 : 0);
    return { sent, delivered: Math.round(sent * 0.945), read: Math.round(sent * 0.71), replied: Math.round(sent * 0.088) };
  }),
  numberHealth: { number: '+91 20 4890 1200', displayName: 'RR Parko', displayNameStatus: 'Approved', quality: 'High', tier: 'Tier 3', tierLimit: 100000, used24h: 31240, verified: true },
  wallet: { balance: 18450, monthSpend: 61550, lowAt: 5000 },
};

/* ---------------- wallet ---------------- */

export const RATE_CARD = [
  { category: 'Marketing', rate: 0.88, description: 'Offers, launches, announcements, re-engagement.' },
  { category: 'Utility', rate: 0.14, description: 'Updates on an existing order or booking: reminders, payment due.' },
  { category: 'Authentication', rate: 0.14, description: 'One-time passwords for login or verification.' },
  { category: 'Service', rate: 0, description: 'Replies inside the 24-hour window after the customer messages you.' },
];

export const TRANSACTIONS = [
  { id: 'tx1', type: 'Debit', description: 'Baner pre-launch EOI · 14,820 messages', amount: -13042, at: minutesAgo(40) },
  { id: 'tx2', type: 'Credit', description: 'Top-up via UPI', amount: 5000, at: daysAgo(1, 10), ref: 'UPI 4829 1022 8812' },
  { id: 'tx3', type: 'Debit', description: 'Visit feedback — Nov · 2,210 messages', amount: -309, at: daysAgo(2, 18) },
  { id: 'tx4', type: 'Debit', description: 'Inbox templates · 1,182 messages', amount: -1040, at: daysAgo(3) },
  { id: 'tx5', type: 'Credit', description: 'Auto-refill (below ₹5,000)', amount: 20000, at: daysAgo(5, 9), ref: 'Card •• 4402' },
  { id: 'tx6', type: 'Debit', description: 'Brochure follow-up · 6,420 messages', amount: -5650, at: daysAgo(6, 12) },
  { id: 'tx7', type: 'Debit', description: 'Diwali offer 2026 · 48,210 messages', amount: -42425, at: daysAgo(16, 10) },
  { id: 'tx8', type: 'Credit', description: 'Top-up via Net banking', amount: 50000, at: daysAgo(17, 16), ref: 'HDFC NB 77120' },
  { id: 'tx9', type: 'Refund', description: 'Refund for failed messages · Hinjewadi cold leads', amount: 1764, at: daysAgo(8, 12) },
  { id: 'tx10', type: 'Debit', description: 'Opt-in drive Q4 · 9,100 messages', amount: -8008, at: daysAgo(22, 11) },
]
  .sort((a, b) => b.at - a.at)
  .map((t, i, all) => ({ ...t, balance: 18450 - all.slice(0, i).reduce((sum, x) => sum + x.amount, 0) }));

/* ---------------- settings ---------------- */

export const BUSINESS = {
  displayName: 'RR Parko',
  about: 'Homes that grow with you 🏡 Wakad · Baner · Hinjewadi',
  category: 'Real estate',
  description: 'RR Parko builds RERA-registered homes across West Pune. Message us for prices, floor plans and site visits.',
  address: 'Parko House, Baner Road, Pune 411045',
  email: 'sales@rrparko.in',
  website: 'https://rrparko.in',
  number: '+91 20 4890 1200',
  wabaId: '104829310022871',
};

export const TEAM = [
  { id: 'u1', name: 'Riya Malhotra', email: 'riya@rrparko.in', role: 'Admin', status: 'Active', lastActive: minutesAgo(2) },
  ...AGENTS.map((a, i) => ({ id: `u${i + 2}`, name: a.name, email: `${a.name.split(' ')[0].toLowerCase()}@rrparko.in`, role: 'Agent', status: i === 4 ? 'Invited' : 'Active', lastActive: minutesAgo(int(1, 600)) })),
];

export const INTEGRATIONS = {
  zoho: { connected: true, account: 'rrparko.zohocrm.in', lastSync: minutesAgo(12), synced: 18420, mapping: [['WhatsApp number', 'Mobile'], ['Opt-in status', 'WhatsApp_Opt_In'], ['Lead fields (AI bot)', 'Lead · custom fields'], ['Labels', 'Tags']] },
  webhooks: [
    { id: 'wh1', url: 'https://api.rrparko.in/hooks/whatsapp', events: ['message.received', 'message.status'], status: 'Healthy', lastDelivery: minutesAgo(1) },
    { id: 'wh2', url: 'https://hooks.zapier.com/hooks/catch/88210/abc', events: ['lead.captured'], status: 'Failing', lastDelivery: daysAgo(1) },
  ],
  apiKey: 'uc_live_8f2a91c4e7b3d6a05c19',
};
