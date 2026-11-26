import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash, Wrench } from '@phosphor-icons/react';
import { fmtNumber, fmtRelative } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import { Button, Callout, Card, Checkbox, DataTable, Drawer, EmptyState, Field, FilterBar, IconButton, Input, Segmented, Select, Switch, Textarea, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listTools } from '@/services/agentflow';
import { CodeBlock, KeyValueEditor, MethodBadge } from '../components/FormBits';

const BLANK = { name: '', description: '', url: 'https://', method: 'POST', headers: [], params: [], active: true, usedToday: 0, avgLatency: null, lastUsed: null };

export default function ToolsPage() {
  const { data, loading } = useQuery(listTools, []);
  const [tools, setTools] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  useEffect(() => data && setTools(data), [data]);
  const rows = useFilteredRows(tools, { search, fields: ['name', 'description', 'url'] });

  const save = (t) => {
    setTools((all) => (all.some((x) => x.id === t.id) ? all.map((x) => (x.id === t.id ? t : x)) : [t, ...all]));
    setEditing(null);
    toast({ title: 'Tool saved', description: 'Live calls can use it right away.', tone: 'success' });
  };
  const remove = async (t) => {
    if (await confirm({ title: `Delete ${t.name}?`, message: 'Campaigns that use this tool will stop calling it.', tone: 'danger', confirmLabel: 'Delete' })) {
      setTools((all) => all.filter((x) => x.id !== t.id));
      setEditing(null);
      toast({ title: 'Tool deleted' });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Tools"
        description="Webhooks the AI can call during a live call: check stock, book a visit, transfer to a person."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setEditing({ ...BLANK, id: `tl_${Date.now()}` })}>
            New tool
          </Button>
        }
      />
      <Card padded={false} className="overflow-hidden">
        <FilterBar className="border-b border-line p-4" search={search} onSearch={setSearch} searchPlaceholder="Search tools" onReset={() => setSearch('')} canReset={!!search} />
        <DataTable
          loading={loading}
          rows={rows}
          onRowClick={setEditing}
          empty={<EmptyState icon={Wrench} title="No tools yet" description="Add a webhook so the AI can look things up or take action mid-call." action={<Button variant="brand" icon={Plus} onClick={() => setEditing({ ...BLANK, id: `tl_${Date.now()}` })}>New tool</Button>} />}
          columns={[
            {
              key: 'name',
              header: 'Tool',
              render: (t) => (
                <span className="block min-w-0 max-w-[380px]">
                  <span className="block truncate font-mono text-[13px] font-semibold text-ink">{t.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{t.description}</span>
                </span>
              ),
            },
            {
              key: 'url',
              header: 'Endpoint',
              hideBelow: 'lg',
              render: (t) => (
                <span className="flex min-w-0 items-center gap-2">
                  <MethodBadge method={t.method} />
                  <span className="max-w-[260px] truncate font-mono text-xs text-ink-2">{t.url}</span>
                </span>
              ),
            },
            { key: 'usedToday', header: 'Used today', align: 'right', render: (t) => fmtNumber(t.usedToday) },
            { key: 'avgLatency', header: 'Avg time', align: 'right', hideBelow: 'md', render: (t) => (t.avgLatency ? `${t.avgLatency} ms` : '—') },
            { key: 'lastUsed', header: 'Last used', align: 'right', hideBelow: 'lg', render: (t) => <span className="text-ink-muted">{t.lastUsed ? fmtRelative(t.lastUsed) : 'Never'}</span> },
            {
              key: 'active',
              header: 'On',
              align: 'right',
              render: (t) => (
                <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                  <Switch size="sm" checked={t.active} onChange={(v) => setTools((all) => all.map((x) => (x.id === t.id ? { ...x, active: v } : x)))} />
                </span>
              ),
            },
          ]}
        />
      </Card>
      <ToolDrawer key={editing?.id || 'none'} tool={editing} isNew={editing && !tools.some((t) => t.id === editing.id)} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
    </Page>
  );
}

const schemaOf = (t) => ({
  type: 'function',
  name: t.name || 'tool_name',
  description: t.description,
  endpoint: { method: t.method, url: t.url, headers: Object.fromEntries(t.headers.filter((h) => h.key).map((h) => [h.key, h.secret ? '••••••' : h.value])) },
  parameters: {
    type: 'object',
    properties: Object.fromEntries(t.params.filter((p) => p.name).map((p) => [p.name, { type: p.type, description: p.description }])),
    required: t.params.filter((p) => p.required && p.name).map((p) => p.name),
  },
});

function ToolDrawer({ tool, isNew, onClose, onSave, onDelete }) {
  const [t, setT] = useState(tool);
  const schema = useMemo(() => (t ? schemaOf(t) : null), [t]);
  if (!tool || !t) return null;
  const up = (patch) => setT((x) => ({ ...x, ...patch }));
  const setParam = (id, patch) => up({ params: t.params.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const nameOk = /^[a-z][a-z0-9_]*$/.test(t.name);
  const ok = nameOk && t.description.trim() && /^https?:\/\/\S+\.\S+/.test(t.url);

  return (
    <Drawer
      open
      onClose={onClose}
      width={760}
      title={isNew ? 'New tool' : <span className="font-mono text-lg font-bold">{tool.name}</span>}
      subtitle={isNew ? 'The AI calls this webhook when the conversation needs it.' : 'Webhook tool'}
      footer={
        <>
          {!isNew && (
            <Button variant="danger-soft" icon={Trash} className="mr-auto" onClick={() => onDelete(tool)}>
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="brand" disabled={!ok} onClick={() => onSave(t)}>
            Save tool
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={t.name && !nameOk ? 'Lowercase letters, numbers and _ only.' : null} hint="e.g. book_site_visit">
            <Input value={t.name} onChange={(e) => up({ name: e.target.value })} className="font-mono" placeholder="book_site_visit" />
          </Field>
          <Field label="Status">
            <Switch checked={t.active} onChange={(v) => up({ active: v })} label={t.active ? 'On for live calls' : 'Off'} />
          </Field>
        </div>
        <Field label="When should the AI use it?" required hint="The AI reads this to decide when to call the tool. Be specific.">
          <Textarea rows={3} value={t.description} onChange={(e) => up({ description: e.target.value })} placeholder="Book a site visit when the customer agrees to a date and time." />
        </Field>
        <Field label="Endpoint" required>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Segmented size="sm" value={t.method} onChange={(method) => up({ method })} options={['GET', 'POST', 'PUT', 'DELETE']} />
            <Input value={t.url} onChange={(e) => up({ url: e.target.value })} className="flex-1 font-mono text-[13px]" placeholder="https://api.yourcompany.in/visits" />
          </div>
        </Field>
        <Field label="Headers and secrets" hint="Turn on Secret to hide a value. Secrets are never shown to the AI.">
          <KeyValueEditor rows={t.headers} onChange={(headers) => up({ headers })} />
        </Field>

        <div>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <h3 className="text-sm font-bold">Parameters</h3>
              <p className="text-xs text-ink-muted">What the AI must fill in from the conversation.</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[600px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-xs text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Required</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {t.params.map((p) => (
                  <tr key={p.id} className="border-b border-line/70 last:border-0">
                    <td className="px-2 py-1.5">
                      <Input size="sm" value={p.name} onChange={(e) => setParam(p.id, { name: e.target.value })} className="font-mono" placeholder="date" />
                    </td>
                    <td className="w-32 px-2 py-1.5">
                      <Select size="sm" value={p.type} onChange={(e) => setParam(p.id, { type: e.target.value })} options={['string', 'number', 'boolean']} />
                    </td>
                    <td className="px-3 py-1.5">
                      <Checkbox checked={p.required} onChange={(v) => setParam(p.id, { required: v })} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input size="sm" value={p.description} onChange={(e) => setParam(p.id, { description: e.target.value })} placeholder="YYYY-MM-DD" />
                    </td>
                    <td className="pr-2">
                      <IconButton icon={Trash} label="Remove parameter" size="sm" onClick={() => up({ params: t.params.filter((x) => x.id !== p.id) })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!t.params.length && <p className="px-3 py-4 text-center text-xs text-ink-muted">No parameters. The tool is called with no input.</p>}
          </div>
          <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => up({ params: [...t.params, { id: `p${Date.now()}`, name: '', type: 'string', required: false, description: '' }] })}>
            Add parameter
          </Button>
        </div>

        <CodeBlock label="Tool definition (JSON)" value={schema} />
        {t.method === 'GET' && t.params.length > 0 && <Callout tone="info">For GET, parameters are sent as query string values.</Callout>}
      </div>
    </Drawer>
  );
}
