import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowsClockwise, CaretDown, CaretRight, Cloud, Code, Database, Lightning, LinkSimple, Phone, Plugs, Plus, Table, Trash } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Callout, Card, CardHeader, EmptyState, Field, IconTile, Input, Modal, RadioCards, Segmented, Skeleton, StatusBadge, Switch, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listIntegrations } from '@/services/agentflow';
import { CodeBlock, KeyValueEditor, MethodBadge } from '../components/FormBits';

const KIND_ICON = { CRM: Database, Custom: Code, Spreadsheet: Table };
const PROVIDERS = [
  { value: 'leadsquared', label: 'LeadSquared', description: 'Look up leads and update stages', icon: Database },
  { value: 'zoho', label: 'Zoho CRM', description: 'Contacts, deals and notes', icon: Database },
  { value: 'salesforce', label: 'Salesforce', description: 'Leads, opportunities, tasks', icon: Cloud },
  { value: 'hubspot', label: 'HubSpot', description: 'Contacts and deal pipeline', icon: Cloud },
  { value: 'custom', label: 'Custom REST API', description: 'Any HTTPS endpoint you own', icon: Code },
];

export default function IntegrationsPage() {
  const { id } = useParams();
  const { data, loading, setData } = useQuery(() => listIntegrations(), []);
  const update = (next) => setData((all) => all.map((x) => (x.id === next.id ? next : x)));
  const remove = (iid) => setData((all) => all.filter((x) => x.id !== iid));
  if (id) {
    const item = data?.find((x) => x.id === id);
    return <IntegrationDetail key={id} item={item} loading={loading} onSave={update} onRemove={remove} />;
  }
  return <IntegrationList items={data} loading={loading} onAdd={(it) => setData((all) => [...all, it])} />;
}

/* ---------------- List ---------------- */

function IntegrationList({ items, loading, onAdd }) {
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const connected = items?.filter((i) => i.status === 'Connected').length ?? 0;
  return (
    <Page>
      <PageHeader
        title="Integrations"
        icon={Plugs}
        description="Connect your CRM or any API so the AI can look up and update customer data during calls."
        meta={items && <span className="text-xs text-ink-muted">{connected} of {items.length} connected</span>}
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setAdding(true)}>
            Add integration
          </Button>
        }
      />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="flex flex-col gap-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : !items.length ? (
        <Card>
          <EmptyState icon={Plugs} title="No integrations yet" description="Connect your CRM so the AI knows who it is calling and saves results back." action={<Button variant="brand" icon={Plus} onClick={() => setAdding(true)}>Add integration</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <Card key={it.id} interactive onClick={() => navigate(`/agentflow/integrations/${it.id}`)} className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <IconTile icon={KIND_ICON[it.kind] || Plugs} tone={it.status === 'Error' ? 'danger' : it.status === 'Connected' ? 'brand' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-bold">{it.name}</h3>
                    <Badge size="xs">{it.kind}</Badge>
                  </div>
                  <div className="truncate font-mono text-xs text-ink-muted">{it.baseUrl}</div>
                </div>
                <StatusBadge status={it.status} />
              </div>
              {it.status === 'Error' && (
                <Callout
                  tone="danger"
                  title="Connection failed"
                  action={
                    <Button
                      size="xs"
                      variant="danger-soft"
                      icon={ArrowsClockwise}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({ title: 'Reconnecting…', description: `We will retry ${it.name} with the saved key.`, tone: 'info' });
                      }}
                    >
                      Reconnect
                    </Button>
                  }
                >
                  {it.error}
                </Callout>
              )}
              <div className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-3 text-xs">
                <Stat label="Actions" value={it.actions.length} />
                <Stat label="Live in calls" value={it.actions.filter((a) => a.live).length} />
                <Stat label="Requests today" value={fmtNumber(it.callsToday)} />
              </div>
              <div className="-mt-2 flex items-center justify-between text-xs text-ink-muted">
                <span>{it.lastSync ? `Last used ${fmtRelative(it.lastSync)}` : 'Never used'}</span>
                <span className="inline-flex items-center gap-1 font-medium text-brand">
                  Open <CaretRight size={12} weight="bold" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddIntegrationModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(p) => {
          const it = { id: `int_${Date.now()}`, name: p.label, kind: p.value === 'custom' ? 'Custom' : 'CRM', status: 'Disconnected', baseUrl: p.value === 'custom' ? 'https://' : `https://api.${p.value}.com`, headers: [], lastSync: null, callsToday: 0, actions: [] };
          onAdd(it);
          setAdding(false);
          toast({ title: `${p.label} added`, description: 'Add your keys to connect it.', tone: 'success' });
          navigate(`/agentflow/integrations/${it.id}`);
        }}
      />
    </Page>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-ink-muted">{label}</div>
      <div className="mt-0.5 font-display text-base font-bold tabular text-ink">{value}</div>
    </div>
  );
}

function AddIntegrationModal({ open, onClose, onAdd }) {
  const [pick, setPick] = useState('leadsquared');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={Plugs}
      title="Add integration"
      description="Pick where your customer data lives. You can add actions after connecting."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={() => onAdd(PROVIDERS.find((p) => p.value === pick))}>
            Continue
          </Button>
        </>
      }
    >
      <RadioCards value={pick} onChange={setPick} options={PROVIDERS} />
    </Modal>
  );
}

/* ---------------- Detail / editor ---------------- */

function IntegrationDetail({ item, loading, onSave, onRemove }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState(item);
  const [addingAction, setAddingAction] = useState(false);
  useEffect(() => setDraft(item), [item]);

  if (loading || !draft) {
    return (
      <Page>
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <EmptyState icon={Plugs} title="Integration not found" description="It may have been removed." action={<Button as={Link} to="/agentflow/integrations">Back to integrations</Button>} />
        )}
      </Page>
    );
  }

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setAction = (aid, patch) => set({ actions: draft.actions.map((a) => (a.id === aid ? { ...a, ...patch } : a)) });
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Integrations', to: '/agentflow/integrations' }, { label: draft.name }]}
        title={draft.name}
        icon={KIND_ICON[draft.kind] || Plugs}
        meta={
          <>
            <StatusBadge status={draft.status} />
            <Badge>{draft.kind}</Badge>
            <span className="text-xs text-ink-muted">{draft.lastSync ? `Last used ${fmtRelative(draft.lastSync)}` : 'Never used'}</span>
          </>
        }
        actions={
          <>
            <Button
              variant="danger-soft"
              icon={Trash}
              onClick={async () => {
                if (await confirm({ title: `Disconnect ${draft.name}?`, message: 'Live calls stop using its actions right away. Saved keys are deleted.', tone: 'danger', confirmLabel: 'Disconnect' })) {
                  onRemove(draft.id);
                  toast({ title: `${draft.name} disconnected`, tone: 'success' });
                  navigate('/agentflow/integrations');
                }
              }}
            >
              Disconnect
            </Button>
            <Button
              variant="brand"
              disabled={!dirty}
              onClick={() => {
                onSave(draft);
                toast({ title: 'Integration saved', tone: 'success' });
              }}
            >
              Save changes
            </Button>
          </>
        }
      />

      {draft.status === 'Error' && (
        <Callout tone="danger" title="Connection failed" className="mb-6" action={<Button size="sm" variant="danger-soft" icon={ArrowsClockwise} onClick={() => toast({ title: 'Reconnecting…', tone: 'info' })}>Reconnect</Button>}>
          {draft.error} Update the key below and save.
        </Callout>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Connection" subtitle="Where requests go and how they are signed." icon={LinkSimple} />
            <div className="flex flex-col gap-4">
              <Field label="Base URL" hint="Every action path is added to this.">
                <Input value={draft.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} className="font-mono text-[13px]" />
              </Field>
              <Field label="Auth headers" hint="Secret values are stored encrypted and never shown to the AI.">
                <KeyValueEditor rows={draft.headers} onChange={(headers) => set({ headers })} />
              </Field>
            </div>
          </Card>

          <Card padded={false}>
            <div className="flex items-start justify-between gap-3 p-5 pb-3">
              <div>
                <h3 className="text-[15px] font-bold">Actions</h3>
                <p className="mt-0.5 text-xs text-ink-muted">Requests the AI can make. Turn on “Run during live calls” to let it use them mid-conversation.</p>
              </div>
              <Button size="sm" icon={Plus} onClick={() => setAddingAction(true)}>
                Add action
              </Button>
            </div>
            {draft.actions.length === 0 ? (
              <EmptyState compact icon={Lightning} title="No actions yet" description="Add a lookup or update request, e.g. “Find lead by phone”." action={<Button size="sm" variant="brand" icon={Plus} onClick={() => setAddingAction(true)}>Add action</Button>} />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {draft.actions.map((a) => (
                  <ActionRow key={a.id} action={a} onChange={(patch) => setAction(a.id, patch)} onRemove={() => set({ actions: draft.actions.filter((x) => x.id !== a.id) })} />
                ))}
              </ul>
            )}
          </Card>
        </div>

        <TestPanel item={draft} />
      </div>

      <AddActionModal
        open={addingAction}
        onClose={() => setAddingAction(false)}
        onAdd={(a) => {
          set({ actions: [...draft.actions, a] });
          setAddingAction(false);
          toast({ title: 'Action added', description: 'Save changes to apply it.', tone: 'success' });
        }}
      />
    </Page>
  );
}

function ActionRow({ action: a, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();
  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-0.5 rounded-md p-0.5 text-ink-muted hover:bg-surface-3 hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open}>
          {open ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{a.name}</span>
            {a.live && (
              <Badge tone="success" size="xs" dot>
                Live
              </Badge>
            )}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <MethodBadge method={a.method} />
            <span className="truncate font-mono text-xs text-ink-2">{a.path}</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{a.description}</p>
          {a.fields?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {a.fields.map((f) => (
                <Badge key={f} size="xs" tone="brand">
                  {`{{${f}}}`}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-2">
          <Switch size="sm" checked={a.live} onChange={(v) => onChange({ live: v })} />
          <span className="hidden sm:inline">Run during live calls</span>
        </label>
        <Button
          size="xs"
          variant="ghost"
          iconOnly
          icon={Trash}
          aria-label="Remove action"
          onClick={async () => {
            if (await confirm({ title: `Remove “${a.name}”?`, message: 'The AI will stop using this request.', tone: 'danger', confirmLabel: 'Remove' })) onRemove();
          }}
        />
      </div>
      {open && (
        <div className="mt-3 pl-7">
          {a.body ? <CodeBlock label="Request body" value={a.body} /> : <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-muted">No body. Values are sent in the URL.</p>}
        </div>
      )}
    </li>
  );
}

function AddActionModal({ open, onClose, onAdd }) {
  const blank = { name: '', method: 'GET', path: '', description: '', body: '', live: true };
  const [a, setA] = useState(blank);
  useEffect(() => {
    if (open) setA(blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const fields = [...new Set([...(a.path + a.body).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
  let parsed = null;
  let bodyError = null;
  if (a.body.trim()) {
    try {
      parsed = JSON.parse(a.body);
    } catch {
      bodyError = 'Not valid JSON yet';
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={Lightning}
      title="Add action"
      description="Use {{variables}} like {{phone}} or {{name}}; the AI fills them from the call."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!a.name || !a.path || !!bodyError} onClick={() => onAdd({ id: `a${Date.now()}`, name: a.name, method: a.method, path: a.path, description: a.description, live: a.live, fields, body: parsed })}>
            Add action
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" required>
          <Input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="e.g. Look up lead by phone" autoFocus />
        </Field>
        <Field label="Request" required>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Segmented value={a.method} onChange={(m) => setA({ ...a, method: m })} options={['GET', 'POST', 'PUT', 'PATCH']} size="sm" className="self-start" />
            <Input value={a.path} onChange={(e) => setA({ ...a, path: e.target.value })} placeholder="/leads?phone={{phone}}" className="flex-1 font-mono text-[13px]" />
          </div>
        </Field>
        <Field label="When should the AI use it?" hint="The AI reads this to decide when to make the request.">
          <Input value={a.description} onChange={(e) => setA({ ...a, description: e.target.value })} placeholder="Fetch the customer’s project and budget before talking price." />
        </Field>
        {a.method !== 'GET' && (
          <Field label="JSON body" optional error={bodyError}>
            <Textarea rows={5} value={a.body} onChange={(e) => setA({ ...a, body: e.target.value })} placeholder={'{\n  "stage": "{{disposition}}"\n}'} className="font-mono text-[13px]" />
          </Field>
        )}
        {fields.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            Variables found:
            {fields.map((f) => (
              <Badge key={f} tone="brand" size="xs">{`{{${f}}}`}</Badge>
            ))}
          </div>
        )}
        <Switch checked={a.live} onChange={(v) => setA({ ...a, live: v })} label="Run during live calls" description="Off = only runs after the call ends." />
      </div>
    </Modal>
  );
}

function TestPanel({ item }) {
  const [phone, setPhone] = useState('98765 43210');
  const [actionId, setActionId] = useState(item.actions[0]?.id);
  const [state, setState] = useState(null); // null | 'loading' | result
  const action = item.actions.find((a) => a.id === actionId) || item.actions[0];
  const run = () => {
    setState('loading');
    setTimeout(() => {
      const ok = item.status !== 'Error';
      setState({
        ok,
        status: ok ? 200 : 401,
        latency: ok ? 280 + Math.round(Math.random() * 300) : 120,
        body: ok
          ? { ProspectID: 'a3f2-11ee-98c1', FirstName: 'Aarav', LastName: 'Sharma', Phone: `+91-${phone.replace(/\D/g, '')}`, mx_Project: 'Parko Heights', mx_Budget: '85 L', ProspectStage: 'Prospect' }
          : { error: 'Unauthorized', message: 'Access token expired' },
      });
    }, 900);
  };
  return (
    <Card className="flex h-max flex-col gap-4 xl:sticky xl:top-6">
      <CardHeader title="Test with phone number" subtitle="Runs the action once with a real number. Nothing is saved." icon={Phone} className="mb-0" />
      {item.actions.length === 0 ? (
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-ink-muted">Add an action first.</p>
      ) : (
        <>
          <Field label="Action">
            <div className="flex flex-col gap-1">
              {item.actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActionId(a.id)}
                  className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] transition', action?.id === a.id ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong')}
                >
                  <MethodBadge method={a.method} />
                  <span className="truncate font-medium text-ink-2">{a.name}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Phone number">
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} icon={Phone} className="flex-1" />
              <Button variant="brand" onClick={run} loading={state === 'loading'} disabled={phone.replace(/\D/g, '').length < 10}>
                Run
              </Button>
            </div>
          </Field>
          {state && state !== 'loading' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Badge tone={state.ok ? 'success' : 'danger'}>{state.status} {state.ok ? 'OK' : 'Unauthorized'}</Badge>
                <span className="tabular text-ink-muted">{state.latency} ms</span>
              </div>
              <CodeBlock label="Response" value={state.body} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
