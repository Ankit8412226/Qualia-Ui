import { ChatsTeardrop, FileXls, PushPin, PlugsConnected, Sparkle } from '@phosphor-icons/react';

export const nav = {
  groups: [
    {
      items: [
        { to: '/insights', end: true, label: 'Ask', icon: Sparkle },
        { to: '/insights/history', label: 'Conversations', icon: ChatsTeardrop },
        { to: '/insights/pinned', label: 'Pinned answers', icon: PushPin },
        { to: '/insights/reports', label: 'Reports', icon: FileXls },
        { to: '/insights/connect', label: 'ChatGPT & Claude', icon: PlugsConnected, keywords: 'mcp connector' },
      ],
    },
  ],
};
