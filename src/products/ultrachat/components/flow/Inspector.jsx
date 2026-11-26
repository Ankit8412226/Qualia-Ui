import { Plus, Trash, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { Button, Field, IconButton, Input, Select, TagInput, Textarea } from '@/design-system';
import { NODE_TYPES, TONE_CLASS } from './nodes';

const VARS = ['{{name}}', '{{phone}}', '{{city}}', '{{budget}}'];
const MEDIA = ['Heights-price-sheet.pdf', 'Parko-Heights-Brochure.pdf', 'diwali-banner.jpg', 'baner-walkthrough.mp4', 'sample-flat-living.jpg', 'Floor-plans-B-wing.pdf'];

function OptionsEditor({ options, max, onChange, label }) {
  return (
    <Field label={label} hint={`${options.length} of ${max}. Each one gets its own connector on the canvas.`}>
      <div className="flex flex-col gap-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input size="sm" value={o} maxLength={24} onChange={(e) => onChange(options.map((x, j) => (j === i ? e.target.value : x)))} />
            <IconButton size="sm" icon={Trash} label="Remove" disabled={options.length <= 1} onClick={() => onChange(options.filter((_, j) => j !== i))} />
          </div>
        ))}
        {options.length < max && (
          <Button size="xs" variant="ghost" icon={Plus} className="self-start" onClick={() => onChange([...options, `Option ${options.length + 1}`])}>
            Add
          </Button>
        )}
      </div>
    </Field>
  );
}

function MessageField({ value, onChange, label = 'Message' }) {
  return (
    <Field label={label} hint="*bold* _italic_ work like WhatsApp.">
      <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type the message…" />
      <div className="mt-1 flex flex-wrap gap-1">
        {VARS.map((v) => (
          <button key={v} type="button" onClick={() => onChange(`${value}${value && !value.endsWith(' ') ? ' ' : ''}${v}`)} className="rounded-md bg-brand/10 px-1.5 py-0.5 font-mono text-2xs text-brand hover:bg-brand/15">
            {v}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Right panel: edits the selected node, or flow settings when nothing is selected. */
export function Inspector({ node, flow, onChange, onFlowChange, onDelete, onClose, fields }) {
  if (!node)
    return (
      <div className="flex flex-col gap-5 p-5">
        <div>
          <h3 className="text-sm font-bold">Flow settings</h3>
          <p className="mt-0.5 text-xs text-ink-muted">Select a step on the canvas to edit it.</p>
        </div>
        <Field label="Trigger keywords" hint="Matches anywhere in the customer’s message, any case.">
          <TagInput value={flow.keywords} onChange={(keywords) => onFlowChange({ keywords })} placeholder="price, rate…" />
        </Field>
        <Field label="If nothing matches">
          <Select value={flow.fallback} onChange={(e) => onFlowChange({ fallback: e.target.value })} options={['Pass to AI bot', 'Hand over to agent', 'Do nothing']} />
        </Field>
        <Field label="Restart the flow after" hint="A customer who finished won’t re-enter until then.">
          <Select value={flow.cooldown} onChange={(e) => onFlowChange({ cooldown: e.target.value })} options={['1 hour', '24 hours', '7 days', 'Never']} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-2xs text-ink-muted">Runs</div>
            <div className="font-display text-lg font-bold tabular">{fmtNumber(flow.runs)}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-2xs text-ink-muted">Completed</div>
            <div className="font-display text-lg font-bold tabular">{fmtPercent(flow.completion || 0)}</div>
          </div>
        </div>
      </div>
    );

  const t = NODE_TYPES[node.type];
  const d = node.data;
  const set = (patch) => onChange({ ...d, ...patch });

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONE_CLASS[t.tone])}>
          <t.icon size={16} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{t.label}</div>
          <div className="truncate text-2xs text-ink-muted">{t.help}</div>
        </div>
        <IconButton size="sm" icon={X} label="Deselect" onClick={onClose} />
      </div>
      <div className="flex flex-col gap-4 p-5">
        {node.type === 'trigger' && (
          <Field label="Keywords" hint="Comma separated. “Any first message” also works.">
            <Input value={d.keywords} onChange={(e) => set({ keywords: e.target.value })} placeholder="price, rate, kitna" />
          </Field>
        )}
        {node.type === 'message' && <MessageField value={d.text} onChange={(text) => set({ text })} />}
        {node.type === 'buttons' && (
          <>
            <MessageField value={d.text} onChange={(text) => set({ text })} />
            <OptionsEditor label="Buttons" options={d.options} max={3} onChange={(options) => set({ options })} />
          </>
        )}
        {node.type === 'list' && (
          <>
            <MessageField value={d.text} onChange={(text) => set({ text })} />
            <Field label="Menu button label">
              <Input size="sm" value={d.button} maxLength={20} onChange={(e) => set({ button: e.target.value })} />
            </Field>
            <OptionsEditor label="Rows" options={d.options} max={10} onChange={(options) => set({ options })} />
          </>
        )}
        {node.type === 'media' && (
          <>
            <Field label="File" hint="From your media library.">
              <Select value={d.media} onChange={(e) => set({ media: e.target.value })} placeholder="Choose a file" options={MEDIA} />
            </Field>
            <Field label="Caption" optional>
              <Input value={d.caption} onChange={(e) => set({ caption: e.target.value })} />
            </Field>
          </>
        )}
        {node.type === 'ask' && (
          <>
            <MessageField label="Question" value={d.question} onChange={(question) => set({ question })} />
            <Field label="Save the answer as" hint="Use it later as a variable or in a condition.">
              <Input value={d.saveAs} onChange={(e) => set({ saveAs: e.target.value.replace(/\s+/g, '_').toLowerCase() })} placeholder="budget" className="font-mono" />
            </Field>
            <Field label="Expected answer">
              <Select value={d.validation} onChange={(e) => set({ validation: e.target.value })} options={['Text', 'Number', 'Email', 'Date', 'Phone']} />
            </Field>
          </>
        )}
        {node.type === 'condition' && (
          <>
            <Field label="Field">
              <Select value={d.field} onChange={(e) => set({ field: e.target.value })} placeholder="Choose a saved answer" options={[...new Set(['budget', 'city', 'bhk', ...fields])]} />
            </Field>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <Field label="Is">
                <Select value={d.op} onChange={(e) => set({ op: e.target.value })} options={['=', '≠', '≥', '≤', 'contains']} />
              </Field>
              <Field label="Value">
                <Input value={d.value} onChange={(e) => set({ value: e.target.value })} />
              </Field>
            </div>
            <p className="rounded-xl bg-surface-2 p-3 text-xs text-ink-muted">“Yes” runs when the condition is true, “No” otherwise.</p>
          </>
        )}
        {node.type === 'crm' && (
          <>
            <Field label="Action">
              <Select value={d.action} onChange={(e) => set({ action: e.target.value })} options={['Create lead in Zoho CRM', 'Update contact in Zoho CRM', 'Call a webhook']} />
            </Field>
            {d.action === 'Call a webhook' && (
              <Field label="Webhook URL" hint="We POST the contact and saved answers as JSON.">
                <Input value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" className="font-mono text-[13px]" />
              </Field>
            )}
          </>
        )}
        {node.type === 'ai' && (
          <Field label="What should the bot do?" hint="It answers from the AI bot’s knowledge sources and hands over when unsure.">
            <Textarea rows={4} value={d.goal} onChange={(e) => set({ goal: e.target.value })} />
          </Field>
        )}
        {node.type === 'handover' && (
          <>
            <Field label="Assign to">
              <Select value={d.team} onChange={(e) => set({ team: e.target.value })} options={['Sales — Pune', 'Sales — NRI desk', 'Customer care', 'Rahul Verma', 'Sneha Kapoor']} />
            </Field>
            <Field label="Note for the agent" optional>
              <Input value={d.note} onChange={(e) => set({ note: e.target.value })} />
            </Field>
          </>
        )}
        {node.type !== 'trigger' && (
          <Button variant="danger-soft" size="sm" icon={Trash} onClick={onDelete} className="mt-2 self-start">
            Delete step
          </Button>
        )}
      </div>
    </div>
  );
}
