import { ArrowsLeftRight, ChalkboardTeacher, ChartPieSlice, ClockCounterClockwise, CloudArrowUp, Function as FunctionIcon, Ghost, ListChecks, Scales, SlidersHorizontal, TreeStructure, UsersThree, ArrowsClockwise } from '@phosphor-icons/react';

const ADMIN = ['admin', 'superadmin'];

export const nav = {
  groups: [
    {
      label: 'Quality',
      items: [
        { to: '/businesspulse', end: true, label: 'Overview', icon: ChartPieSlice },
        { to: '/businesspulse/upload', label: 'Upload calls', icon: CloudArrowUp, roles: ADMIN, keywords: 'process audio' },
        { to: '/businesspulse/calls', label: 'Call history', icon: ClockCounterClockwise },
      ],
    },
    {
      label: 'Coaching',
      items: [
        { to: '/businesspulse/coach', label: 'AI coach', icon: ChalkboardTeacher },
        { to: '/businesspulse/coaching', label: 'Coaching history', icon: ListChecks },
      ],
    },
    {
      label: 'Revenue intelligence',
      items: [
        { to: '/businesspulse/metrics', label: 'Custom metrics', icon: FunctionIcon, roles: ADMIN },
        { to: '/businesspulse/quality-delta', label: 'Quality delta', icon: Scales, roles: ADMIN },
        { to: '/businesspulse/compare', label: 'Compare periods', icon: ArrowsLeftRight, roles: ADMIN },
        { to: '/businesspulse/ghost-leads', label: 'Ghost leads', icon: Ghost, roles: ADMIN, badge: 27, badgeTone: 'accent' },
      ],
    },
    {
      label: 'Setup',
      items: [
        { to: '/businesspulse/processes', label: 'Processes', icon: TreeStructure, roles: ADMIN },
        { to: '/businesspulse/parameters', label: 'QA parameters', icon: SlidersHorizontal, roles: ADMIN },
        { to: '/businesspulse/agents', label: 'Agents', icon: UsersThree, roles: ADMIN },
        { to: '/businesspulse/sync', label: 'Dialer sync', icon: ArrowsClockwise, roles: ADMIN, keywords: 'vicidial' },
      ],
    },
  ],
};
