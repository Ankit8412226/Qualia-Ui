import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChatCircleDots, CurrencyInr, PhoneX, Warning, ShieldWarning } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { IconTile, Tabs } from '@/design-system';
import { useSession } from '@/app/providers/SessionProvider';

const ITEMS = [
  { id: 1, icon: Warning, tone: 'danger', title: 'Fatal error on 3 calls', body: 'Business Pulse flagged “misleading pricing” for Kavya Iyer.', time: '4 min ago', unread: true, kind: 'alerts', to: '/businesspulse/calls', roles: ['admin'] },
  { id: 2, icon: CurrencyInr, tone: 'warning', title: 'UltraChat wallet below ₹2,000', body: 'Campaign “Diwali offer” may pause. Top up to keep sending.', time: '22 min ago', unread: true, kind: 'alerts', to: '/ultrachat/wallet?topup=1', roles: ['admin'] },
  { id: 3, icon: ShieldWarning, tone: 'danger', title: 'Line 0796511 looks like spam', body: 'Connect rate fell from 41% to 12%. Spam check sent.', time: '1 h ago', unread: true, kind: 'alerts', to: '/dialflow/number-health', roles: ['admin'] },
  { id: 4, icon: ChatCircleDots, tone: 'ultrachat', title: '18 chats waiting for an agent', body: 'Oldest has waited 9 minutes.', time: '1 h ago', kind: 'updates', to: '/ultrachat/inbox' },
  { id: 5, icon: PhoneX, tone: 'dialflow', title: 'Campaign “Renewals Nov” finished', body: '1,240 leads dialled, 38% connected.', time: '3 h ago', kind: 'updates', to: '/dialflow/campaigns', roles: ['admin'] },
];

/** Each notification opens the screen where you act on it. `onNavigate` closes the popover. */
export function NotificationsPanel({ onNavigate }) {
  const [tab, setTab] = useState('all');
  const [read, setRead] = useState([]);
  const { role } = useSession();
  const mine = ITEMS.filter((i) => !i.roles || i.roles.includes(role));
  const all = mine.map((i) => ({ ...i, unread: i.unread && !read.includes(i.id) }));
  const items = all.filter((i) => tab === 'all' || i.kind === tab);
  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <h3 className="text-sm font-bold">Notifications</h3>
        <button type="button" onClick={() => setRead(mine.map((i) => i.id))} disabled={!all.some((i) => i.unread)} className="text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50">
          Mark all read
        </button>
      </div>
      <Tabs
        className="px-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'all', label: 'All', count: mine.length },
          { id: 'alerts', label: 'Alerts', count: mine.filter((i) => i.kind === 'alerts').length },
          { id: 'updates', label: 'Updates' },
        ]}
      />
      <ul className="max-h-[380px] overflow-y-auto p-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              to={n.to}
              onClick={() => {
                setRead((r) => [...r, n.id]);
                onNavigate?.();
              }}
              className={cn('flex gap-3 rounded-xl p-2.5 hover:bg-surface-2', n.unread && 'bg-brand/[.03]')}
            >
            <IconTile icon={n.icon || Bell} tone={n.tone} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{n.title}</span>
                {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </div>
              <p className="text-xs text-ink-muted">{n.body}</p>
              <span className="text-2xs text-ink-muted">{n.time}</span>
            </div>
            </Link>
          </li>
        ))}
        {!items.length && <li className="px-3 py-10 text-center text-sm text-ink-muted">You’re all caught up.</li>}
      </ul>
    </div>
  );
}
