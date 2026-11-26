import { useState } from 'react';
import { CaretRight, DotsSixVertical, DotsThree, PencilSimple, Plus, Sparkle, Tag, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, Field, Input, Menu, Modal, Select, Switch, Textarea, useConfirm, useToast, IconButton, SearchInput } from '@/design-system';

/*
 * One dispositions editor for Agent Flow, DialFlow and Business Pulse.
 * items = [{ id, name, description, category, callback, active, sub: [names], count }]
 * features: { categories, subDispositions, aiImprove }
 */
const CATEGORY_TONE = { Positive: 'success', Neutral: 'neutral', Negative: 'danger', 'Not reached': 'warning' };

export function DispositionsManager({ items: initial, features = {} }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const confirm = useConfirm();
  const toast = useToast();
  const groups = features.categories ? Object.keys(CATEGORY_TONE) : [null];
  const shown = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));

  const save = (d) => {
    setItems((all) => (d.id ? all.map((x) => (x.id === d.id ? d : x)) : [...all, { ...d, id: Date.now(), count: 0 }]));
    setEditing(null);
    toast(d.id ? 'Disposition updated' : 'Disposition added');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search dispositions" className="w-full sm:w-64" />
        <span className="text-xs text-ink-muted">{items.filter((i) => i.active).length} active · {items.filter((i) => i.callback).length} need a callback</span>
        <Button variant="brand" icon={Plus} className="ml-auto" onClick={() => setEditing({ name: '', description: '', category: 'Neutral', callback: false, active: true, sub: [] })}>
          New disposition
        </Button>
      </div>

      <div className={cn('grid gap-4', features.categories && 'lg:grid-cols-2')}>
        {groups.map((g) => {
          const list = shown.filter((i) => !g || i.category === g);
          return (
            <Card key={g || 'all'} padded={false}>
              {g && (
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <Badge tone={CATEGORY_TONE[g]} dot>
                    {g}
                  </Badge>
                  <span className="text-xs text-ink-muted">{list.length}</span>
                </div>
              )}
              <ul className="divide-y divide-line/70">
                {list.map((d) => (
                  <li key={d.id} className={cn('group flex items-center gap-3 px-5 py-3', !d.active && 'opacity-55')}>
                    <DotsSixVertical size={16} className="shrink-0 cursor-grab text-ink-faint opacity-0 transition group-hover:opacity-100" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{d.name}</span>
                        {d.callback && <Badge tone="info" size="xs">Callback</Badge>}
                        {!d.active && <Badge size="xs">Hidden</Badge>}
                      </div>
                      {d.description && <p className="truncate text-xs text-ink-muted">{d.description}</p>}
                      {features.subDispositions && d.sub?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {d.sub.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 text-2xs text-ink-2">
                              <CaretRight size={8} weight="bold" />
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {d.count != null && <span className="hidden text-xs tabular text-ink-muted sm:block">{d.count.toLocaleString('en-IN')} calls</span>}
                    <Switch size="sm" checked={d.active} onChange={(v) => setItems((all) => all.map((x) => (x.id === d.id ? { ...x, active: v } : x)))} />
                    <Menu
                      trigger={({ toggle }) => <IconButton icon={DotsThree} label="More" size="sm" onClick={toggle} />}
                      items={[
                        { label: 'Edit', icon: PencilSimple, onClick: () => setEditing(d) },
                        {
                          label: 'Delete',
                          icon: Trash,
                          tone: 'danger',
                          onClick: async () => {
                            if (await confirm({ title: `Delete “${d.name}”?`, message: 'Past calls keep this disposition; agents can no longer pick it.', tone: 'danger', confirmLabel: 'Delete' })) setItems((all) => all.filter((x) => x.id !== d.id));
                          },
                        },
                      ]}
                    />
                  </li>
                ))}
                {!list.length && <li className="px-5 py-6 text-center text-xs text-ink-muted">None yet</li>}
              </ul>
            </Card>
          );
        })}
      </div>

      <DispositionModal key={editing ? editing.id ?? 'new' : 'none'} value={editing} onClose={() => setEditing(null)} onSave={save} features={features} />
    </div>
  );
}

function DispositionModal({ value, onClose, onSave, features }) {
  const [d, setD] = useState(value);
  const [improving, setImproving] = useState(false);
  if (!value || !d) return null;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? 'Edit disposition' : 'New disposition'}
      icon={Tag}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!d.name} onClick={() => onSave(d)}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" required>
          <Input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Site visit booked" autoFocus />
        </Field>
        <Field
          label="When should it be used?"
          hint="The AI reads this to pick the right outcome after each call."
          action={
            features.aiImprove && (
              <Button
                size="xs"
                variant="soft"
                icon={Sparkle}
                loading={improving}
                onClick={() => {
                  setImproving(true);
                  setTimeout(() => {
                    set('description', `Use when the customer clearly agrees to "${d.name || 'this outcome'}" and confirms a date or next step during the call.`);
                    setImproving(false);
                  }, 900);
                }}
              >
                Improve with AI
              </Button>
            )
          }
        >
          <Textarea rows={3} value={d.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        {features.categories && (
          <Field label="Category">
            <Select value={d.category} onChange={(e) => set('category', e.target.value)} options={Object.keys(CATEGORY_TONE)} />
          </Field>
        )}
        <Switch label="Needs a callback" description="Agents get a reminder to call the customer back." checked={d.callback} onChange={(v) => set('callback', v)} />
        <Switch label="Active" description="Hidden dispositions stay on past calls." checked={d.active} onChange={(v) => set('active', v)} />
      </div>
    </Modal>
  );
}
