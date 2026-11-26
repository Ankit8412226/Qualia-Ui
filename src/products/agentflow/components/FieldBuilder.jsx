import { CalendarBlank, CheckSquare, DotsSixVertical, Hash, ListBullets, Plus, TextAa, Trash } from '@phosphor-icons/react';
import { Button, Checkbox, IconButton, Input, Select, TagInput } from '@/design-system';
import { ref } from '@/services/agentflow';

export const FIELD_ICON = { yesno: CheckSquare, text: TextAa, number: Hash, date: CalendarBlank, options: ListBullets };

/**
 * Rows of "what the AI should collect on the call". fields = [{id,label,type,required,options?}]
 * Used by the campaign wizard and the inbound setup.
 */
export function FieldBuilder({ fields, onChange, suggestions = [] }) {
  const set = (id, patch) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const add = (label = '', type = 'text') => onChange([...fields, { id: `f${Date.now()}`, label, type, required: false, options: type === 'options' ? [] : undefined }]);
  const unused = suggestions.filter((s) => !fields.some((f) => f.label.toLowerCase() === s.label.toLowerCase()));
  return (
    <div className="flex flex-col gap-3">
      {fields.map((f) => {
        const Icon = FIELD_ICON[f.type];
        return (
          <div key={f.id} className="rounded-xl border border-line bg-surface p-3 transition hover:border-line-strong">
            <div className="flex flex-wrap items-center gap-2.5">
              <DotsSixVertical size={16} className="shrink-0 cursor-grab text-ink-faint" aria-hidden />
              <Input value={f.label} onChange={(e) => set(f.id, { label: e.target.value })} placeholder="e.g. Preferred visit date" size="sm" className="min-w-[180px] flex-1" />
              <div className="relative w-40 shrink-0">
                <Icon size={14} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-ink-muted" />
                <Select size="sm" value={f.type} onChange={(e) => set(f.id, { type: e.target.value, options: e.target.value === 'options' ? f.options || [] : undefined })} options={ref.fieldTypes} className="[&_select]:pl-8" />
              </div>
              <Checkbox checked={f.required} onChange={(v) => set(f.id, { required: v })} label="Required" className="shrink-0" />
              <IconButton icon={Trash} label="Remove field" size="sm" onClick={() => onChange(fields.filter((x) => x.id !== f.id))} />
            </div>
            {f.type === 'options' && (
              <div className="mt-2 pl-8">
                <TagInput value={f.options || []} onChange={(v) => set(f.id, { options: v })} placeholder="Add an option and press Enter" />
              </div>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={Plus} onClick={() => add()}>
          Add field
        </Button>
        {unused.length > 0 && <span className="text-xs text-ink-muted">Suggestions:</span>}
        {unused.slice(0, 4).map((s) => (
          <button key={s.label} type="button" onClick={() => add(s.label, s.type)} className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:border-brand hover:text-brand">
            + {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
