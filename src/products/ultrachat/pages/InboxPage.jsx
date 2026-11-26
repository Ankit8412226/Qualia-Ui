import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CaretDown, ChatsCircle, CheckCircle, Clock, LockSimple, SidebarSimple, Tag, UserCircle, Check, ArrowCounterClockwise, Robot } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtPhone } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Badge, Button, EmptyState, IconButton, LiveIndicator, Menu, Popover, Skeleton, Tooltip, useToast } from '@/design-system';
import { Page } from '@/shared/layout';
import { useSession } from '@/app/providers/SessionProvider';
import { getConversation, getInboxMeta, listConversations, listTemplates, suggestReply } from '@/services/ultrachat';
import { ConversationList, LABEL_DOT } from '../components/inbox/ConversationList';
import { MessageList } from '../components/inbox/Messages';
import { Composer } from '../components/inbox/Composer';
import { CustomerPanel } from '../components/inbox/CustomerPanel';

const ME_AGENT = 'Rahul Verma';

function useMedia(query) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

export default function InboxPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useSession();
  const me = role === 'agent' ? ME_AGENT : user?.name;
  const isDesktop = useMedia('(min-width: 1024px)');
  const isWide = useMedia('(min-width: 1280px)');

  const list = useQuery(() => listConversations(), []);
  const meta = useQuery(() => getInboxMeta(), []);
  const templates = useQuery(() => listTemplates(), []);

  const [tab, setTab] = useState(role === 'agent' ? 'mine' : 'all');
  const [statuses, setStatuses] = useState(['Open', 'Pending']);
  const [labelFilter, setLabelFilter] = useState([]);
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);

  const convs = list.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return convs
      .filter((c) => (tab === 'mine' ? c.assignee === me : tab === 'unassigned' ? !c.assignee : true))
      .filter((c) => !statuses.length || statuses.includes(c.status))
      .filter((c) => !labelFilter.length || c.labels.some((l) => labelFilter.includes(l)))
      .filter((c) => !q || c.contact.name.toLowerCase().includes(q) || c.contact.phone.includes(q) || c.last.text.toLowerCase().includes(q))
      .sort((a, b) => b.last.at - a.last.at);
  }, [convs, tab, statuses, labelFilter, search, me]);

  const counts = useMemo(() => {
    const active = convs.filter((c) => c.status !== 'Resolved');
    return { mine: active.filter((c) => c.assignee === me).length, unassigned: active.filter((c) => !c.assignee).length, all: active.length, unread: convs.reduce((a, c) => a + c.unread, 0) };
  }, [convs, me]);

  // Desktop: open the top conversation automatically.
  useEffect(() => {
    if (!id && isDesktop && filtered.length) navigate(`/ultrachat/inbox/${filtered[0].id}`, { replace: true });
  }, [id, isDesktop, filtered, navigate]);

  const conv = convs.find((c) => c.id === id);
  const update = (patch) => list.setData((all) => all.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)));

  const showList = isDesktop || !id;
  const showChat = isDesktop || !!id;

  return (
    <Page full className="flex overflow-hidden bg-surface">
      {showList && (
        <aside className={cn('flex min-h-0 shrink-0 flex-col border-r border-line bg-surface', isDesktop ? 'w-[300px] xl:w-[340px]' : 'w-full')}>
          <ConversationList
            loading={list.loading}
            rows={filtered}
            counts={counts}
            tab={tab}
            onTab={setTab}
            statuses={statuses}
            onStatuses={setStatuses}
            labelFilter={labelFilter}
            onLabelFilter={setLabelFilter}
            labels={meta.data?.labels}
            search={search}
            onSearch={setSearch}
            selectedId={id}
            onSelect={(cid) => {
              list.setData((all) => all.map((c) => (c.id === cid ? { ...c, unread: 0 } : c)));
              navigate(`/ultrachat/inbox/${cid}`);
            }}
          />
        </aside>
      )}
      {showChat && (
        <section className="flex min-w-0 flex-1 flex-col bg-canvas">
          {conv ? (
            <ChatPane
              key={conv.id}
              conv={conv}
              me={me}
              meta={meta.data}
              templates={templates.data || []}
              update={update}
              onBack={() => navigate('/ultrachat/inbox')}
              isDesktop={isDesktop}
              panelOpen={panelOpen && isWide}
              onTogglePanel={() => setPanelOpen((o) => !o)}
              canPanel={isWide}
            />
          ) : list.loading || (id && !conv) ? (
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-16 w-1/2" />
              <Skeleton className="ml-auto h-16 w-1/2" />
            </div>
          ) : (
            <EmptyState className="flex-1" icon={ChatsCircle} title="No conversation selected" description="Pick a chat on the left. New WhatsApp messages land here after the flow and AI bot." />
          )}
        </section>
      )}
    </Page>
  );
}

function windowInfo(min) {
  if (min <= 0) return { open: false, label: 'Window closed', tone: 'danger' };
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return { open: true, label: `${h}h ${String(m).padStart(2, '0')}m left`, tone: min < 120 ? 'warning' : 'success' };
}

function ChatPane({ conv, me, meta, templates, update, onBack, isDesktop, panelOpen, onTogglePanel, canPanel }) {
  const toast = useToast();
  const detail = useQuery(() => getConversation(conv.id), [conv.id]);
  const suggestion = useQuery(() => suggestReply(conv.id), [conv.id]);
  const [messages, setMessages] = useState(null);
  const scroller = useRef(null);
  const msgs = messages ?? detail.data?.messages ?? [];
  const win = windowInfo(conv.windowLeftMin);
  const labels = meta?.labels || [];
  const agents = meta?.agents || [];

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, detail.loading]);

  const append = (m) => {
    const full = { id: `local_${Date.now()}`, at: new Date(), status: 'sent', ...m };
    setMessages([...msgs, full]);
    if (m.dir === 'out') {
      setTimeout(() => setMessages((all) => all?.map((x) => (x.id === full.id ? { ...x, status: 'delivered' } : x))), 1200);
      setTimeout(() => setMessages((all) => all?.map((x) => (x.id === full.id ? { ...x, status: 'read' } : x))), 3500);
      update({ last: { dir: 'out', text: m.type === 'template' ? `📋 ${m.template.name}` : m.text || m.media?.name, at: full.at }, waitingMin: 0, unread: 0 });
    }
  };

  const onSend = ({ text, note, attachment }) => {
    if (note) return append({ type: 'note', text, author: me });
    if (attachment) append({ type: attachment.kind === 'image' ? 'image' : 'document', dir: 'out', author: me, media: { name: attachment.name, size: '1.2 MB', caption: text } });
    else append({ type: 'text', dir: 'out', author: me, text });
    if (!conv.assignee) update({ assignee: me });
  };

  const assign = (name) => {
    update({ assignee: name });
    setMessages([...msgs, { id: `sys_${Date.now()}`, type: 'system', text: name ? `Assigned to ${name}` : 'Unassigned', at: new Date() }]);
    toast(name ? `Assigned to ${name}` : 'Conversation unassigned');
  };

  const resolved = conv.status === 'Resolved';

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
          {!isDesktop && <IconButton icon={ArrowLeft} label="Back to conversations" onClick={onBack} />}
          <Avatar name={conv.contact.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold">{conv.contact.name}</span>
              {conv.handledBy !== 'agent' && !conv.assignee && (
                <Badge tone="brand" size="xs" icon={Robot}>
                  {conv.handledBy === 'flow' ? 'Flow' : 'AI bot'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap text-xs text-ink-muted">
              <span className="tabular max-xl:hidden">{fmtPhone(conv.contact.phone)}</span>
              <span aria-hidden className="max-xl:hidden">·</span>
              <Tooltip content={win.open ? 'Free-form replies allowed until the 24-hour customer window closes' : 'Customer hasn’t messaged in 24 h. Only templates can be sent.'}>
                <span className={cn('inline-flex items-center gap-1 font-medium', win.tone === 'danger' ? 'text-danger' : win.tone === 'warning' ? 'text-warning' : 'text-success')}>
                  {win.open ? <Clock size={12} weight="bold" /> : <LockSimple size={12} weight="bold" />}
                  {win.label}
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Menu
              width={240}
              trigger={({ toggle }) => (
                <button onClick={toggle} className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-2.5 text-[13px] font-medium text-ink-2 hover:border-line-strong">
                  {conv.assignee ? <Avatar name={conv.assignee} size="xs" /> : <UserCircle size={18} className="text-ink-faint" />}
                  <span className="hidden max-w-[110px] truncate 2xl:inline">{conv.assignee || 'Unassigned'}</span>
                  <CaretDown size={11} weight="bold" className="opacity-60" />
                </button>
              )}
              items={[
                { heading: 'Assign to' },
                ...agents.map((a) => ({
                  label: a.name,
                  description: a.status === 'online' ? 'Online' : a.status === 'away' ? 'Away' : 'Offline',
                  icon: () => <Avatar name={a.name} size="xs" status={a.status} />,
                  active: conv.assignee === a.name,
                  onClick: () => assign(a.name),
                })),
                { divider: true },
                { label: 'Unassign', icon: UserCircle, onClick: () => assign(null), disabled: !conv.assignee },
              ]}
            />
            <Popover
              align="end"
              width={220}
              trigger={({ toggle }) => (
                <Tooltip content="Labels">
                  <button onClick={toggle} aria-label="Labels" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-[13px] font-medium text-ink-2 hover:border-line-strong">
                    <Tag size={15} />
                    {conv.labels.length > 0 && <span className="tabular">{conv.labels.length}</span>}
                  </button>
                </Tooltip>
              )}
            >
              {labels.map((l) => {
                const on = conv.labels.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => update((c) => ({ labels: on ? c.labels.filter((x) => x !== l.id) : [...c.labels, l.id] }))}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-3"
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full', LABEL_DOT[l.tone])} />
                    <span className="flex-1">{l.name}</span>
                    {on && <Check size={13} weight="bold" className="text-brand" />}
                  </button>
                );
              })}
            </Popover>
            {resolved ? (
              <Button
                variant="secondary"
                icon={ArrowCounterClockwise}
                onClick={() => {
                  update({ status: 'Open' });
                  toast('Conversation reopened');
                }}
              >
                <span className="hidden sm:inline">Reopen</span>
              </Button>
            ) : (
              <Button
                variant="brand"
                icon={CheckCircle}
                onClick={() => {
                  update({ status: 'Resolved', waitingMin: 0, unread: 0 });
                  toast({ title: 'Marked as resolved', description: `${conv.contact.name} will reopen automatically if they reply.` });
                }}
              >
                <span className="hidden sm:inline">Resolve</span>
              </Button>
            )}
            {canPanel && <IconButton icon={SidebarSimple} label={panelOpen ? 'Hide customer panel' : 'Show customer panel'} onClick={onTogglePanel} className={panelOpen ? 'text-brand' : ''} />}
          </div>
        </header>

        {/* labels strip */}
        {conv.labels.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line bg-surface px-4 py-1.5">
            {labels
              .filter((l) => conv.labels.includes(l.id))
              .map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-px text-2xs font-medium text-ink-2">
                  <span className={cn('h-1.5 w-1.5 rounded-full', LABEL_DOT[l.tone])} />
                  {l.name}
                </span>
              ))}
            <LiveIndicator className="ml-auto" label="Live" />
          </div>
        )}

        {/* thread */}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" style={{ backgroundImage: 'radial-gradient(rgb(var(--line) / .7) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
          {detail.loading ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              <Skeleton className="h-14 w-2/3 rounded-2xl" />
              <Skeleton className="ml-auto h-14 w-1/2 rounded-2xl" />
              <Skeleton className="h-24 w-1/2 rounded-2xl" />
            </div>
          ) : (
            <MessageList messages={msgs} />
          )}
        </div>

        <Composer
          key={conv.id}
          windowOpen={win.open}
          quickReplies={meta?.quickReplies}
          suggestion={win.open ? suggestion.data?.text : null}
          templates={templates}
          contactName={conv.contact.name}
          onSend={onSend}
          onSendTemplate={({ template, values }) => {
            append({ type: 'template', dir: 'out', author: me, template: { ...template, filled: values } });
            toast({ title: 'Template sent', description: 'The window reopens when they reply.' });
          }}
        />
      </div>

      {panelOpen && (
        <aside className="hidden w-[320px] shrink-0 border-l border-line bg-surface xl:block">
          <CustomerPanel conv={conv} profile={detail.data?.profile} loading={detail.loading} onClose={onTogglePanel} userName={me} />
        </aside>
      )}
    </div>
  );
}
