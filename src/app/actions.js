import { ChalkboardTeacher, CloudArrowUp, Headset, Megaphone, Notepad, PhoneOutgoing, Plus, Broadcast, Sparkle, Wallet, Buildings, Coins } from '@phosphor-icons/react';

/*
 * Things people do often, offered in ⌘K next to pages. Same role rules as the sidebar.
 * { productId, label, to, icon, roles?, keywords? }
 */
const ADMIN = ['admin'];
export const ACTIONS = [
  { productId: 'agentflow', label: 'New AI campaign', to: '/agentflow/campaigns/new', icon: Plus, roles: ADMIN, keywords: 'create outbound calling' },
  { productId: 'agentflow', label: 'Make a test call', to: '/agentflow/test-call', icon: PhoneOutgoing, roles: ADMIN, keywords: 'try agent' },
  { productId: 'dialflow', label: 'Open my workspace', to: '/dialflow/workspace', icon: Headset, roles: ['agent'], keywords: 'start calling softphone dial' },
  { productId: 'dialflow', label: 'Watch the live floor', to: '/dialflow/realtime', icon: Broadcast, roles: ADMIN, keywords: 'realtime agents supervise' },
  { productId: 'dialflow', label: 'New dialer campaign', to: '/dialflow/campaigns/new', icon: Plus, roles: ADMIN, keywords: 'create' },
  { productId: 'ultrachat', label: 'New WhatsApp campaign', to: '/ultrachat/campaigns/new', icon: Megaphone, roles: ADMIN, keywords: 'broadcast create send' },
  { productId: 'ultrachat', label: 'New message template', to: '/ultrachat/templates/new', icon: Notepad, keywords: 'create whatsapp' },
  { productId: 'ultrachat', label: 'Top up WhatsApp wallet', to: '/ultrachat/wallet?topup=1', icon: Wallet, roles: ADMIN, keywords: 'recharge balance credits' },
  { productId: 'businesspulse', label: 'Upload calls for QA', to: '/businesspulse/upload', icon: CloudArrowUp, roles: ADMIN, keywords: 'audio score' },
  { productId: 'businesspulse', label: 'Practise with the AI coach', to: '/businesspulse/coach', icon: ChalkboardTeacher, keywords: 'role-play training' },
  { productId: 'insights', label: 'Ask a question about your data', to: '/insights', icon: Sparkle, roles: ADMIN, keywords: 'ai chat report' },
  { productId: 'commons', label: 'Onboard a new tenant', to: '/admin/tenants/new', icon: Buildings, roles: ['superadmin'], keywords: 'create client' },
  { productId: 'commons', label: 'Add credits to a tenant', to: '/admin/credits', icon: Coins, roles: ['superadmin'], keywords: 'top up' },
];
