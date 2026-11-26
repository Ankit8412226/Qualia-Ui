import { Buildings, ChartLineUp, ChatCircleDots, Coins, Gauge, Headset, Heartbeat, Microphone, Prohibit, ShieldWarning, SquaresFour, Waveform } from '@phosphor-icons/react';

export const nav = {
  groups: [
    {
      items: [
        { to: '/admin', end: true, label: 'Dashboard', icon: SquaresFour },
        { to: '/admin/tenants', label: 'Tenants & users', icon: Buildings, keywords: 'clients create user onboard' },
      ],
    },
    {
      label: 'Products',
      items: [
        { to: '/admin/agentflow', label: 'Agent Flow', icon: Waveform, keywords: 'voice telephony sip minutes' },
        { to: '/admin/dialflow', label: 'DialFlow', icon: Headset, keywords: 'sip lines max agents' },
        { to: '/admin/businesspulse', label: 'Business Pulse', icon: ChartLineUp, keywords: 'callpulse qa features' },
        { to: '/admin/ultrachat', label: 'UltraChat', icon: ChatCircleDots, keywords: 'whatsapp tenant' },
      ],
    },
    {
      label: 'Platform',
      items: [
        { to: '/admin/credits', label: 'Credits', icon: Coins },
        { to: '/admin/usage', label: 'Usage', icon: Gauge },
        { to: '/admin/dnc', label: 'Global Do Not Call', icon: Prohibit },
      ],
    },
    {
      label: 'Tools',
      items: [
        { to: '/admin/voice-lab', label: 'Voice lab', icon: Microphone, keywords: 'dialer test stt tts llm' },
        { to: '/admin/spam-check', label: 'Spam check', icon: ShieldWarning },
        { to: '/admin/number-health', label: 'Number health', icon: Heartbeat },
      ],
    },
  ],
};
