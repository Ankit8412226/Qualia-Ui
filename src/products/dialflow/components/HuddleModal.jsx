import { useMemo, useState } from 'react';
import { MegaphoneSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Avatar, Button, Checkbox, Field, Modal, SearchInput, Segmented, Switch, Textarea, useToast } from '@/design-system';
import { StatePill } from './agentState';

/** "Call a huddle": a banner message to picked agents, optionally needing acknowledgement. */
export function HuddleModal({ open, onClose, agents = [], preselect = [] }) {
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const [needsAck, setNeedsAck] = useState(true);
  const [scope, setScope] = useState('online');
  const [picked, setPicked] = useState(preselect);
  const [q, setQ] = useState('');
  const groups = useMemo(() => [...new Set(agents.map((a) => a.group))], [agents]);
  const pool = agents.filter((a) => a.state !== 'Logged out');
  const shown = pool.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  const targets = scope === 'online' ? pool.map((a) => a.id) : scope === 'pick' ? picked : pool.filter((a) => a.group === scope).map((a) => a.id);

  const send = () => {
    toast({ title: `Huddle sent to ${targets.length} agents`, description: needsAck ? 'You will see who acknowledged on the Overview.' : 'Shown as a banner in their workspace.' });
    setMsg('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Call a huddle"
      description="A banner appears on top of each agent's workspace, even during a call."
      size="md"
      footer={
        <>
          <span className="mr-auto text-xs text-ink-muted">{targets.length} agents will see this</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!msg.trim() || !targets.length} onClick={send}>
            Send huddle
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Message" required hint={`${msg.length}/280`}>
          <Textarea rows={3} maxLength={280} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Wakad 2BHK price is now ₹82 L. Update your pitch." autoFocus />
        </Field>
        <Field label="Send to">
          <div className="flex flex-wrap gap-2">
            <Segmented size="sm" value={groups.includes(scope) ? 'group' : scope} onChange={(v) => setScope(v === 'group' ? groups[0] : v)} options={[{ value: 'online', label: 'Everyone online' }, { value: 'group', label: 'A group' }, { value: 'pick', label: 'Pick agents' }]} />
          </div>
        </Field>
        {groups.includes(scope) && (
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button key={g} type="button" onClick={() => setScope(g)} className={cn('rounded-full border px-3 py-1 text-xs font-medium', scope === g ? 'border-brand bg-brand text-brand-ink' : 'border-line text-ink-2 hover:border-line-strong')}>
                {g}
              </button>
            ))}
          </div>
        )}
        {scope === 'pick' && (
          <div className="rounded-xl border border-line">
            <div className="border-b border-line p-2">
              <SearchInput size="sm" value={q} onChange={setQ} placeholder="Search agents" />
            </div>
            <ul className="max-h-56 overflow-y-auto p-1">
              {shown.map((a) => (
                <li key={a.id}>
                  <div role="presentation" onClick={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <span className="pointer-events-none flex">
                      <Checkbox checked={picked.includes(a.id)} />
                    </span>
                    <Avatar name={a.name} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
                    <StatePill state={a.state} size="xs" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Switch checked={needsAck} onChange={setNeedsAck} label="Needs acknowledgement" description="Agents must click Acknowledge before the banner goes away." />
      </div>
    </Modal>
  );
}
