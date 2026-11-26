import { useEffect, useRef, useState } from 'react';
import { ArrowClockwise, FilePdf, PaperPlaneRight } from '@phosphor-icons/react';
import { Button } from '@/design-system';
import { PhoneFrame, PreviewBubble } from '../PhonePreview';
import { WaText } from '../wa';
import { outputs } from './nodes';

const fill = (s = '', vars) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

/** Walks the graph like a customer would: tap buttons, answer questions, see branches. */
export function FlowTester({ nodes, edges }) {
  const [log, setLog] = useState([]);
  const [waiting, setWaiting] = useState(null); // node waiting for input
  const [vars, setVars] = useState({ name: 'Priya' });
  const [draft, setDraft] = useState('');
  const end = useRef(null);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const next = (id, port = 0) => edges.find((e) => e.from === id && e.port === port)?.to;

  const run = (id, v, acc) => {
    let cur = id;
    let guard = 0;
    while (cur && guard++ < 30) {
      const n = byId[cur];
      const d = n.data;
      if (n.type === 'message') acc.push({ from: 'business', text: fill(d.text, v) });
      else if (n.type === 'media') acc.push({ from: 'business', media: d.media, text: d.caption });
      else if (n.type === 'buttons' || n.type === 'list') {
        acc.push({ from: 'business', text: fill(d.text, v), options: outputs(n) });
        return { acc, wait: n };
      } else if (n.type === 'ask') {
        acc.push({ from: 'business', text: fill(d.question, v) });
        return { acc, wait: n };
      } else if (n.type === 'condition') {
        const left = v[d.field];
        const a = Number(left);
        const b = Number(d.value);
        const ok = { '=': left == d.value, '≠': left != d.value, '≥': a >= b, '≤': a <= b, contains: String(left || '').includes(d.value) }[d.op]; // eslint-disable-line eqeqeq
        acc.push({ from: 'system', text: `Condition ${d.field} ${d.op} ${d.value}: ${ok ? 'Yes' : 'No'}` });
        cur = next(n.id, ok ? 0 : 1);
        continue;
      } else if (n.type === 'crm') acc.push({ from: 'system', text: `${d.action} ✓` });
      else if (n.type === 'ai') {
        acc.push({ from: 'business', text: 'Parko Vista, Hinjewadi mein 1BHK ₹54 L aur 2BHK ₹71 L se hai. Possession March 2027. Aur kuch?', bot: true });
      } else if (n.type === 'handover') {
        acc.push({ from: 'system', text: `Handed over to ${d.team}. An agent replies from the inbox.` });
        return { acc, wait: null, done: true };
      }
      cur = next(n.id, 0);
    }
    acc.push({ from: 'system', text: 'Flow ended' });
    return { acc, wait: null, done: true };
  };

  const restart = () => {
    const trigger = nodes.find((n) => n.type === 'trigger');
    const v = { name: 'Priya' };
    const kw = trigger?.data.keywords?.split(',')[0]?.trim() || 'hi';
    const { acc, wait } = run(next(trigger?.id), v, [{ from: 'customer', text: kw }]);
    setVars(v);
    setLog(acc);
    setWaiting(wait);
  };
  useEffect(restart, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [log]);

  const answer = (text, port = 0) => {
    const n = waiting;
    const v = { ...vars };
    if (n.type === 'ask') v[n.data.saveAs] = text;
    const { acc, wait } = run(next(n.id, port), v, [...log, { from: 'customer', text }]);
    setVars(v);
    setLog(acc);
    setWaiting(wait);
    setDraft('');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <PhoneFrame
        height={540}
        footer={
          <form
            className="flex items-center gap-2 border-t border-line bg-surface px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim() && waiting?.type === 'ask') answer(draft.trim());
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={waiting?.type !== 'ask'} placeholder={waiting?.type === 'ask' ? 'Type an answer' : waiting ? 'Tap a button above' : 'Flow finished'} className="h-8 min-w-0 flex-1 rounded-full bg-surface-3 px-3 text-xs text-ink outline-none placeholder:text-ink-faint disabled:opacity-60" />
            <button type="submit" disabled={waiting?.type !== 'ask'} aria-label="Send" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-ink disabled:opacity-40">
              <PaperPlaneRight size={14} weight="fill" />
            </button>
          </form>
        }
      >
        {log.map((m, i) =>
          m.from === 'system' ? (
            <div key={i} className="my-2 text-center">
              <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-2xs text-ink-muted">{m.text}</span>
            </div>
          ) : (
            <div key={i}>
              <PreviewBubble from={m.from}>
                {m.bot && <span className="mb-0.5 block text-2xs font-semibold text-brand">AI bot</span>}
                {m.media && (
                  <span className="mb-1 flex items-center gap-2 rounded-lg bg-surface-3 p-2 text-xs font-medium">
                    <FilePdf size={16} className="text-danger" /> {m.media}
                  </span>
                )}
                {m.text && <WaText text={m.text} />}
              </PreviewBubble>
              {m.options && waiting && i === log.length - 1 && (
                <div className="mb-2 flex flex-col gap-1">
                  {m.options.map((o, j) => (
                    <button key={j} onClick={() => answer(o, j)} className="rounded-xl bg-surface py-1.5 text-xs font-semibold text-brand shadow-card hover:bg-brand/10">
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        <div ref={end} />
      </PhoneFrame>
      <Button size="sm" variant="ghost" icon={ArrowClockwise} onClick={restart}>
        Restart test
      </Button>
    </div>
  );
}
