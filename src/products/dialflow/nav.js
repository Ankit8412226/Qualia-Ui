import { Broadcast, ChartBar, ChartPieSlice, ClockCounterClockwise, Headset, ListChecks, Megaphone, PhoneCall, PhoneIncoming, Prohibit, Pulse, Tag, Timer, UsersFour, UsersThree, CalendarCheck, Heartbeat } from '@phosphor-icons/react';

const AGENT = ['agent'];
const ADMIN = ['admin', 'superadmin'];

export const nav = {
  groups: [
    {
      label: 'My work',
      items: [
        { to: '/dialflow/workspace', label: 'Workspace', icon: Headset, roles: AGENT },
        { to: '/dialflow/my-calls', label: 'My calls', icon: ClockCounterClockwise, roles: AGENT },
        { to: '/dialflow/callbacks', label: 'Callbacks', icon: CalendarCheck, roles: AGENT, badge: 4 },
      ],
    },
    {
      label: 'Monitor',
      items: [
        { to: '/dialflow', end: true, label: 'Overview', icon: ChartPieSlice, roles: ADMIN },
        { to: '/dialflow/realtime', label: 'Real-time floor', icon: Broadcast, roles: ADMIN },
        { to: '/dialflow/live-calls', label: 'Live calls', icon: PhoneCall, roles: ADMIN, badge: 12, badgeTone: 'success' },
      ],
    },
    {
      label: 'Dialing',
      items: [
        { to: '/dialflow/campaigns', label: 'Campaigns', icon: Megaphone, roles: ADMIN },
        { to: '/dialflow/lists', label: 'Contact lists', icon: ListChecks, roles: ADMIN },
        { to: '/dialflow/agents', label: 'Agents', icon: UsersThree, roles: ADMIN },
        { to: '/dialflow/groups', label: 'Agent groups', icon: UsersFour, roles: ADMIN },
      ],
    },
    {
      label: 'Reports',
      items: [
        { to: '/dialflow/reports/apr', label: 'Agent performance', icon: ChartBar, roles: ADMIN, keywords: 'apr report' },
        { to: '/dialflow/reports/status', label: 'Status history', icon: Timer, roles: ADMIN },
        { to: '/dialflow/calls', label: 'Call history', icon: ClockCounterClockwise, roles: ADMIN },
        { to: '/dialflow/number-health', label: 'Number health', icon: Heartbeat, roles: ADMIN, keywords: 'spam did line' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { to: '/dialflow/dispositions', label: 'Dispositions', icon: Tag, roles: ADMIN },
        { to: '/dialflow/statuses', label: 'Agent statuses', icon: Pulse, roles: ADMIN, keywords: 'break pause' },
        { to: '/dialflow/inbound', label: 'Inbound routing', icon: PhoneIncoming, roles: ADMIN },
        { to: '/dialflow/dnc', label: 'Do Not Call', icon: Prohibit, roles: ADMIN },
      ],
    },
  ],
};

