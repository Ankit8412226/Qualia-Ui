import { ChartLineUp, ChatCircleDots, Headset, ShieldCheck, Sparkle, Waveform } from '@phosphor-icons/react';

/*
 * Product registry: the single source for names, colours, icons and entry points.
 * One name per product, used everywhere (names follow the landing page).
 */
export const PRODUCTS = [
  {
    id: 'agentflow',
    name: 'Agent Flow',
    tagline: 'AI voice agents',
    description: 'AI agents that call your leads and answer inbound calls in Hindi, English and 8 more languages.',
    icon: Waveform,
    path: '/agentflow',
    logo: '/brand/app-agentflow.svg',
    roles: ['admin'],
  },
  {
    id: 'dialflow',
    name: 'DialFlow',
    tagline: 'Dialer and live supervision',
    description: 'Browser softphone for your agents, auto-dial campaigns and a live floor view for supervisors.',
    icon: Headset,
    path: '/dialflow',
    logo: '/brand/app-dialflow.svg',
    roles: ['admin', 'agent'],
  },
  {
    id: 'ultrachat',
    name: 'UltraChat',
    tagline: 'WhatsApp engagement',
    description: 'Shared WhatsApp inbox, template campaigns, an AI bot and a no-code flow builder.',
    icon: ChatCircleDots,
    path: '/ultrachat',
    logo: '/brand/app-ultrachat.svg',
    roles: ['admin', 'agent'],
  },
  {
    id: 'businesspulse',
    name: 'Business Pulse',
    tagline: 'AI call QA and coaching',
    description: 'Every call scored against your checklist, coaching plans for each agent and revenue you missed.',
    icon: ChartLineUp,
    path: '/businesspulse',
    logo: '/brand/app-businesspulse.svg',
    roles: ['admin', 'agent'],
  },
  {
    id: 'insights',
    name: 'Insights',
    tagline: 'Ask your business',
    description: 'Ask questions in English or Hinglish across every product and get charts, quotes and reports.',
    icon: Sparkle,
    path: '/insights',
    roles: ['admin'],
  },
];

export const CONSOLE = { id: 'commons', name: 'Admin Console', tagline: 'Qualia team', icon: ShieldCheck, path: '/admin' };

export const productById = (id) => PRODUCTS.find((p) => p.id === id) || (id === 'commons' ? CONSOLE : null);

/** Products a tenant role can open. The super admin uses only the internal console. */
export function productsFor(role, tenantProducts) {
  if (role === 'superadmin') return [];
  return PRODUCTS.filter((p) => p.roles.includes(role) && tenantProducts.includes(p.id));
}
