import { ChartBar, ChartPieSlice, ChatsCircle, FlowArrow, Images, Megaphone, Notepad, Robot, UserCheck, UsersThree, Wallet, GearSix } from '@phosphor-icons/react';

const ADMIN = ['admin', 'superadmin'];

export const nav = {
  groups: [
    {
      label: 'Engage',
      items: [
        { to: '/ultrachat', end: true, label: 'Overview', icon: ChartPieSlice, roles: ADMIN },
        { to: '/ultrachat/inbox', label: 'Inbox', icon: ChatsCircle, badge: 18, badgeTone: 'success' },
        { to: '/ultrachat/campaigns', label: 'Campaigns', icon: Megaphone, roles: ADMIN },
        { to: '/ultrachat/templates', label: 'Templates', icon: Notepad },
      ],
    },
    {
      label: 'Audience',
      items: [
        { to: '/ultrachat/opt-ins', label: 'Opt-ins', icon: UserCheck, roles: ADMIN },
        { to: '/ultrachat/groups', label: 'WhatsApp groups', icon: UsersThree, roles: ADMIN },
      ],
    },
    {
      label: 'Automate',
      items: [
        { to: '/ultrachat/flows', label: 'Flow builder', icon: FlowArrow, roles: ADMIN },
        { to: '/ultrachat/ai-bot', label: 'AI bot', icon: Robot, roles: ADMIN },
        { to: '/ultrachat/media', label: 'Media library', icon: Images, roles: ADMIN },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/ultrachat/reports', label: 'Reports', icon: ChartBar, roles: ADMIN },
        { to: '/ultrachat/wallet', label: 'Wallet', icon: Wallet, roles: ADMIN },
        { to: '/ultrachat/settings', label: 'Settings', icon: GearSix, roles: ADMIN },
      ],
    },
  ],
};
