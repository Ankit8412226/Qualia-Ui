import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  ChartBar,
  ChatsTeardrop,
  DotsThree,
  FileXls,
  Lightning,
  NotePencil,
  PencilSimple,
  Plus,
  Quotes,
  Sparkle,
  Trash,
  SidebarSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Kbd, Menu, SearchInput, Select, useConfirm, Tooltip, IconButton } from '@/design-system';
import { CallDetailDrawer } from '@/shared/patterns';
import { ProductMark } from '@/shared/layout';
import { insightsService } from '@/services/insights';
import { CAPABILITIES, SCOPES, STARTERS } from '@/mocks/insights';
import { makeCall } from '@/mocks/calls';
import { Answer, Question } from '../components/AnswerBlocks';

const CAP_ICON = { metric: ChartBar, narrative: Quotes, action: Lightning, report: FileXls };

/** The Insights hub: one chat across every product, with sessions on the left. */
export default function AskPage() {
  const [turns, setTurns] = useState([]); // [{id, question, answer|null}]
  const [scope, setScope] = useState('all');
  const [activeSession, setActiveSession] = useState(null);
  const [showSessions, setShowSessions] = useState(true);
  const [call, setCall] = useState(null);
  const scroller = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const ask = useCallback(
    async (question, scopeOverride) => {
      const id = Math.random().toString(36).slice(2);
      const s = scopeOverride || scope;
      setTurns((t) => [...t, { id, question, answer: null }]);
      const [answer] = await Promise.all([insightsService.ask(question, s), new Promise((r) => setTimeout(r, 1500))]);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    },
    [scope],
  );

  // A question sent from the Home page's Ask bar (or ?q= in the URL). Guarded so StrictMode doesn't ask twice.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    const q = location.state?.ask || new URLSearchParams(location.search).get('q');
    if (q) {
      navigate('.', { replace: true, state: null });
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!turns.length) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const openSession = async (s) => {
    setActiveSession(s.id);
    const thread = await insightsService.getThread(s.id);
    setTurns(thread.map((a) => ({ id: a.id, question: a.question, answer: a })));
  };
  const newChat = () => {
    setActiveSession(null);
    setTurns([]);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0">
      {showSessions && <SessionPanel active={activeSession} onOpen={openSession} onNew={newChat} />}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
          <Tooltip content={showSessions ? 'Hide conversations' : 'Show conversations'} side="bottom">
            <IconButton icon={SidebarSimple} label="Toggle conversations" size="sm" onClick={() => setShowSessions((v) => !v)} />
          </Tooltip>
          <span className="truncate text-sm font-semibold">{turns.length ? turns[0].question : 'New conversation'}</span>
          {turns.length > 0 && (
            <IconButton icon={NotePencil} label="New conversation" size="sm" className="ml-auto" onClick={newChat} />
          )}
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {turns.length === 0 ? (
            <EmptyHub onAsk={ask} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
              {turns.map((t) => (
                <div key={t.id} className="flex flex-col gap-4">
                  <Question text={t.question} />
                  <Answer
                    answer={t.answer}
                    pending={!t.answer}
                    onAsk={ask}
                    onPin={() => {}}
                    onOpenCall={() => setCall(makeCall({ withScore: true, campaign: 'Wakad 2BHK leads' }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Composer scope={scope} onScope={setScope} onSend={ask} busy={turns.some((t) => !t.answer)} />
      </div>

      <CallDetailDrawer call={call} open={!!call} onClose={() => setCall(null)} />
    </div>
  );
}

function EmptyHub({ onAsk }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-10 pt-12 text-center sm:pt-20">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-pop grad-bg">
        <Sparkle size={26} weight="fill" />
      </span>
      <h1 className="mt-5 text-[30px] font-extrabold tracking-tight sm:text-[34px]">
        What do you want to <span className="grad-text">know</span>?
      </h1>
      <p className="mt-2 max-w-lg text-sm text-ink-muted">Ask in English, Hindi or Hinglish. Answers come from your calls, chats and scores across every Qualia product, with the query behind every number.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {['agentflow', 'dialflow', 'ultrachat', 'businesspulse'].map((p) => (
          <ProductMark key={p} id={p} size="sm" />
        ))}
      </div>

      <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-2">
        {STARTERS.map((g) => (
          <div key={g.group} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint">{g.group}</div>
            <ul className="flex flex-col gap-1">
              {g.items.map((s) => (
                <li key={s}>
                  <button onClick={() => onAsk(s)} className="w-full rounded-xl px-2.5 py-2 text-left text-[13.5px] text-ink-2 transition hover:bg-surface-3 hover:text-ink">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 grid w-full grid-cols-2 gap-3 text-left lg:grid-cols-4">
        {CAPABILITIES.map((c) => {
          const Icon = CAP_ICON[c.kind];
          return (
            <div key={c.title} className="rounded-2xl bg-surface-2 p-3.5">
              <Icon size={18} weight="duotone" className="text-brand" />
              <div className="mt-2 text-[13px] font-semibold text-ink">{c.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-ink-muted">{c.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Composer({ scope, onScope, onSend, busy }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const send = () => {
    const q = text.trim();
    if (!q || busy) return;
    onSend(q);
    setText('');
  };
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 180)}px`;
    }
  }, [text]);
  return (
    <div className="shrink-0 border-t border-line bg-canvas/80 px-4 pb-4 pt-3 backdrop-blur">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-line bg-surface p-2 shadow-card transition focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10">
          <textarea
            ref={ref}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Kuch bhi poochiye… e.g. “Kal kitne site visits book hue?”"
            className="block w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed outline-none placeholder:text-ink-faint"
          />
          <div className="flex items-center gap-2 px-1 pt-1">
            <Select size="sm" value={scope} onChange={(e) => onScope(e.target.value)} options={SCOPES} className="w-40" aria-label="Which product to ask" />
            <span className="hidden items-center gap-1 text-2xs text-ink-faint sm:flex">
              <Kbd>↵</Kbd> send · <Kbd>⇧</Kbd>
              <Kbd>↵</Kbd> new line
            </span>
            <button
              onClick={send}
              disabled={!text.trim() || busy}
              aria-label="Send"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-ink text-canvas transition hover:bg-ink/85 disabled:opacity-30"
            >
              <ArrowUp size={17} weight="bold" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-2xs text-ink-faint">Insights never estimates. If the data is incomplete it says so. Actions always ask you first and are logged.</p>
      </div>
    </div>
  );
}

function SessionPanel({ active, onOpen, onNew }) {
  const { data: sessions = [], setData } = useQuery(() => insightsService.listSessions(), []);
  const [q, setQ] = useState('');
  const confirm = useConfirm();
  const shown = sessions.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  const day = (d) => {
    const diff = (Date.now() - new Date(d)) / 86400000;
    return diff < 1 ? 'Today' : diff < 2 ? 'Yesterday' : diff < 7 ? 'This week' : 'Earlier';
  };
  const groups = shown.reduce((acc, s) => {
    (acc[day(s.updatedAt)] ||= []).push(s);
    return acc;
  }, {});
  return (
    <aside className="hidden w-[272px] shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex flex-col gap-2 p-3">
        <button onClick={onNew} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-canvas transition hover:bg-ink/90">
          <Plus size={16} weight="bold" /> New conversation
        </button>
        <SearchInput size="sm" value={q} onChange={setQ} placeholder="Search conversations" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {Object.entries(groups).map(([g, list]) => (
          <div key={g} className="mb-3">
            <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint">{g}</div>
            {list.map((s) => (
              <div key={s.id} className={cn('group flex items-center gap-1 rounded-xl pr-1 transition', active === s.id ? 'bg-brand/10' : 'hover:bg-surface-3')}>
                <button onClick={() => onOpen(s)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left">
                  {s.product === 'all' ? <ChatsTeardrop size={16} className="shrink-0 text-ink-muted" /> : <ProductMark id={s.product} size="xs" className="h-4 w-4 rounded" />}
                  <span className="min-w-0">
                    <span className={cn('block truncate text-[13px]', active === s.id ? 'font-semibold text-ink' : 'text-ink-2')}>{s.title}</span>
                    <span className="block text-2xs text-ink-faint">{fmtRelative(s.updatedAt)}</span>
                  </span>
                </button>
                <Menu
                  trigger={({ toggle }) => (
                    <button onClick={toggle} aria-label="Conversation options" className="rounded-lg p-1 text-ink-faint opacity-0 hover:bg-surface hover:text-ink group-hover:opacity-100">
                      <DotsThree size={16} weight="bold" />
                    </button>
                  )}
                  items={[
                    { label: 'Rename', icon: PencilSimple, onClick: () => setData((all) => all.map((x) => (x.id === s.id ? { ...x, title: `${x.title} (renamed)` } : x))) },
                    {
                      label: 'Delete',
                      icon: Trash,
                      tone: 'danger',
                      onClick: async () => {
                        if (await confirm({ title: 'Delete this conversation?', message: `“${s.title}” will be removed for good.`, tone: 'danger', confirmLabel: 'Delete' })) setData((all) => all.filter((x) => x.id !== s.id));
                      },
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        ))}
        {!shown.length && <p className="px-3 py-6 text-center text-xs text-ink-muted">No conversations match.</p>}
      </div>
    </aside>
  );
}
