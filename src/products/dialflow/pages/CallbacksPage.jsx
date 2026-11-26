import { useState } from 'react';
import { CalendarCheck, CalendarX, Clock, NotePencil, Phone, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtDateTime, fmtPhone, fmtRelative, fmtTime } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Button, IconButton, Card, EmptyState, Field, Input, Modal, SkeletonRows, Tabs, Textarea, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { useNavigate } from 'react-router-dom';
import * as df from '@/services/dialflow';

const SECTIONS = [
  { id: 'due', label: 'Due now', icon: Warning, empty: 'Nothing due. Callbacks you schedule show up here when it is time.' },
  { id: 'upcoming', label: 'Upcoming', icon: Clock, empty: 'No upcoming callbacks.' },
  { id: 'missed', label: 'Missed', icon: CalendarX, empty: 'You have not missed any callback. Nice.' },
];

const until = (d) => {
  const m = Math.round((new Date(d) - Date.now()) / 60000);
  if (m <= 0) return null;
  if (m < 60) return `in ${m} min`;
  if (m < 24 * 60) return `in ${Math.round(m / 60)} h`;
  return `in ${Math.round(m / 1440)} d`;
};

export default function CallbacksPage() {
  const { data, loading, setData } = useQuery(() => df.listCallbacks(), []);
  const [tab, setTab] = useState('due');
  const [editing, setEditing] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const rows = (data || []).filter((r) => r.section === tab);
  const counts = Object.fromEntries(SECTIONS.map((s) => [s.id, (data || []).filter((r) => r.section === s.id).length]));
  const section = SECTIONS.find((s) => s.id === tab);

  const update = (id, patch) => setData((all) => all.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <Page className="max-w-[1100px]">
      <PageHeader
        title="Callbacks"
        description={loading ? 'People who asked you to call back.' : counts.due ? `${counts.due} people are waiting for your call now. Call them first, then the upcoming ones.` : 'Nothing due right now. Upcoming callbacks move here when it is time.'}
      />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label, count: counts[s.id] }))} />
      <Card padded={false}>
        {loading ? (
          <SkeletonRows rows={5} />
        ) : !rows.length ? (
          <EmptyState icon={CalendarCheck} title={`No ${section.label.toLowerCase()} callbacks`} description={section.empty} />
        ) : (
          <ul className="divide-y divide-line/70">
            {rows.map((r) => (
              <li key={r.id} className={cn('flex flex-col gap-3 px-5 py-4 transition hover:bg-surface-2 md:flex-row md:items-center', tab === 'due' && 'first:bg-brand/[.03]')}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={r.name} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.name}</span>
                      <span className="font-mono text-xs text-ink-muted tabular">{fmtPhone(r.phone)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                      <span>{r.campaign}</span>·<span>Last: {r.lastDisposition}</span>
                    </div>
                    {r.note && <p className="mt-1 line-clamp-1 text-[13px] text-ink-2">“{r.note}”</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 md:w-[150px] md:flex-col md:items-end md:gap-0.5">
                  <span className={cn('text-sm font-semibold tabular', tab === 'missed' ? 'text-danger' : tab === 'due' ? 'text-warning' : 'text-ink')}>{fmtTime(r.due)}</span>
                  <span className="text-xs text-ink-muted">{tab === 'upcoming' ? until(r.due) : tab === 'missed' ? `missed ${fmtRelative(r.due)}` : until(r.due) || `due ${fmtRelative(r.due)}`}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <IconButton size="sm" icon={NotePencil} label="Edit note" onClick={() => setNoteFor(r)} />
                  <Button size="sm" variant="ghost" icon={Clock} onClick={() => setEditing(r)}>
                    Reschedule
                  </Button>
                  <Button size="sm" variant="brand" icon={Phone} onClick={() => navigate('/dialflow/workspace?campaign=cmp_wakad')}>
                    Call now
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RescheduleModal
        row={editing}
        onClose={() => setEditing(null)}
        onSave={(at) => {
          update(editing.id, { due: at, section: at - Date.now() < 15 * 60000 ? 'due' : 'upcoming' });
          toast({ title: 'Callback moved', description: `${editing.name} · ${fmtDateTime(at)}` });
          setEditing(null);
        }}
      />
      <NotesModal
        row={noteFor}
        onClose={() => setNoteFor(null)}
        onSave={(note) => {
          update(noteFor.id, { note });
          toast('Note saved');
          setNoteFor(null);
        }}
      />
    </Page>
  );
}

function RescheduleModal({ row, onClose, onSave }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00');
  const quick = [
    ['In 1 hour', () => new Date(Date.now() + 3600000)],
    ['Tomorrow 11 AM', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d; }],
    ['Next week', () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(11, 0, 0, 0); return d; }],
  ];
  return (
    <Modal
      open={!!row}
      onClose={onClose}
      size="sm"
      title="Reschedule callback"
      description={row ? `${row.name} · ${fmtPhone(row.phone)}` : ''}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!date || !time} onClick={() => onSave(new Date(`${date}T${time}`))}>
            Save
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {quick.map(([l, fn]) => (
          <button key={l} type="button" onClick={() => onSave(fn())} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-2 hover:border-line-strong hover:bg-surface-2">
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function NotesModal({ row, onClose, onSave }) {
  const [v, setV] = useState('');
  return (
    <Modal
      open={!!row}
      onClose={onClose}
      size="sm"
      title={row ? `Notes · ${row.name}` : ''}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={() => onSave(v || row.note)}>
            Save note
          </Button>
        </>
      }
    >
      <Textarea key={row?.id} defaultValue={row?.note} onChange={(e) => setV(e.target.value)} rows={5} placeholder="What should you remember before calling?" />
    </Modal>
  );
}
