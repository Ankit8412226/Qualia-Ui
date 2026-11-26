import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, CaretDown, CaretRight, Check, DownloadSimple, FilePdf, FileText, FileDoc, Plus, SlidersHorizontal, Trash, UploadSimple, WarningOctagon, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, CardHeader, Field, FileDrop, IconButton, Input, Modal, Select, Skeleton, Switch, Textarea, useConfirm, useToast } from '@/design-system';
import { BackLink, Page, PageHeader, useUnsavedChanges } from '@/shared/layout';
import { getParameterSet } from '@/services/businesspulse';

let uid = 0;
const newParam = () => ({ id: `new_${++uid}`, name: 'New parameter', description: '', max: 10, weight: 1, fatal: false, scorable: true });
const BLANK = { name: 'Untitled parameter set', status: 'Draft', documents: [], sections: [{ id: 'sx', name: 'Opening', parameters: [newParam()] }] };
const move = (arr, i, d) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};
const DOC_ICON = { pdf: FilePdf, doc: FileDoc, txt: FileText };

export default function ParameterSetEditorPage() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading } = useQuery(() => (id ? getParameterSet(id) : Promise.resolve(BLANK)), [id]);
  const [set, setSet] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty, { message: 'Your edits to this parameter set will be lost.' });
  useEffect(() => setSet(data ? structuredClone(data) : null), [data]);

  const update = (fn) => {
    setSet((s) => fn(structuredClone(s)));
    setDirty(true);
  };
  const updateParam = (si, pi, patch) => update((s) => ((s.sections[si].parameters[pi] = { ...s.sections[si].parameters[pi], ...patch }), s));

  if (loading || !set)
    return (
      <Page>
        <Skeleton className="mb-6 h-10 w-72" />
        <Skeleton className="h-[500px] rounded-2xl" />
      </Page>
    );

  const params = set.sections.flatMap((s) => s.parameters);
  const total = params.filter((p) => p.scorable).reduce((a, p) => a + Number(p.max || 0), 0);
  const fatal = params.filter((p) => p.fatal).length;

  return (
    <Page>
      <BackLink to="/businesspulse/parameters">QA parameters</BackLink>
      <PageHeader
        className="mt-3"
        title={set.name}
        icon={SlidersHorizontal}
        meta={
          <>
            <Badge tone={set.status === 'Active' ? 'success' : 'info'} dot>
              {set.status}
            </Badge>
            <span className="text-xs text-ink-muted">
              {set.sections.length} sections · {params.length} parameters · {total} points
            </span>
          </>
        }
        actions={
          <>
            <Button icon={UploadSimple} onClick={() => setImporting(true)}>
              Import
            </Button>
            <Button icon={DownloadSimple} onClick={() => toast({ title: 'Exported to Excel', description: `${set.name}.xlsx`, tone: 'info' })}>
              Export
            </Button>
            <Button
              variant="brand"
              icon={Check}
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                toast({ title: 'Parameter set saved', description: 'New calls use it right away. Past scores stay as they were.' });
              }}
            >
              Save
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="Name">
              <Input value={set.name} onChange={(e) => update((s) => ((s.name = e.target.value), s))} />
            </Field>
            <Field label="Status">
              <Select options={['Draft', 'Active']} value={set.status} onChange={(e) => update((s) => ((s.status = e.target.value), s))} />
            </Field>
          </Card>

          {set.sections.map((sec, si) => (
            <Card key={sec.id} padded={false}>
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-3 text-2xs font-bold text-ink-muted">{si + 1}</span>
                <input value={sec.name} onChange={(e) => update((s) => ((s.sections[si].name = e.target.value), s))} aria-label="Section name" className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-1 text-[15px] font-bold outline-none hover:bg-surface-2 focus:bg-surface-2" />
                <span className="hidden text-xs text-ink-muted sm:block">{sec.parameters.filter((p) => p.scorable).reduce((a, p) => a + Number(p.max || 0), 0)} pts</span>
                <IconButton size="sm" icon={ArrowUp} label="Move section up" disabled={si === 0} onClick={() => update((s) => ((s.sections = move(s.sections, si, -1)), s))} />
                <IconButton size="sm" icon={ArrowDown} label="Move section down" disabled={si === set.sections.length - 1} onClick={() => update((s) => ((s.sections = move(s.sections, si, 1)), s))} />
                <IconButton
                  size="sm"
                  icon={Trash}
                  label="Delete section"
                  onClick={async () => {
                    if (await confirm({ title: `Delete “${sec.name}”?`, message: `Its ${sec.parameters.length} parameters are removed too.`, tone: 'danger', confirmLabel: 'Delete' })) update((s) => ((s.sections = s.sections.filter((_, i) => i !== si)), s));
                  }}
                />
              </div>
              <ul className="divide-y divide-line/70">
                {sec.parameters.map((prm, pi) => {
                  const open = openId === prm.id;
                  return (
                    <li key={prm.id} className={cn(open && 'bg-surface-2/60')}>
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <button onClick={() => setOpenId(open ? null : prm.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
                          {open ? <CaretDown size={13} className="shrink-0 text-ink-muted" /> : <CaretRight size={13} className="shrink-0 text-ink-muted" />}
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[13.5px] font-medium text-ink">{prm.name}</span>
                              {prm.fatal && <Badge tone="danger" size="xs" icon={WarningOctagon}>Fatal</Badge>}
                              {!prm.scorable && <Badge size="xs">Pass / fail only</Badge>}
                            </span>
                            {!open && <span className="block truncate text-xs text-ink-muted">{prm.description || 'No description yet — the AI needs one to score well.'}</span>}
                          </span>
                        </button>
                        <span className="hidden shrink-0 text-xs tabular text-ink-muted sm:block">
                          {prm.scorable ? `${prm.max} pts` : '—'} · ×{prm.weight}
                        </span>
                        <IconButton size="xs" icon={ArrowUp} label="Move up" disabled={pi === 0} onClick={() => update((s) => ((s.sections[si].parameters = move(s.sections[si].parameters, pi, -1)), s))} />
                        <IconButton size="xs" icon={ArrowDown} label="Move down" disabled={pi === sec.parameters.length - 1} onClick={() => update((s) => ((s.sections[si].parameters = move(s.sections[si].parameters, pi, 1)), s))} />
                      </div>
                      {open && (
                        <div className="grid animate-rise gap-4 px-4 pb-4 pl-9 md:grid-cols-2">
                          <Field label="Name" className="md:col-span-2">
                            <Input value={prm.name} onChange={(e) => updateParam(si, pi, { name: e.target.value })} />
                          </Field>
                          <Field
                            label="Description for the AI"
                            hint="Say what a pass looks like and what does not count."
                            className="md:col-span-2"
                            action={
                              <Button size="xs" variant="soft" icon={Sparkle} onClick={() => updateParam(si, pi, { description: `${prm.description || prm.name}. Pass only if the agent does this clearly in the call; partial attempts get half marks. Ignore small talk.` })}>
                                Improve
                              </Button>
                            }
                          >
                            <Textarea rows={3} value={prm.description} onChange={(e) => updateParam(si, pi, { description: e.target.value })} />
                          </Field>
                          <Field label="Max score">
                            <Input type="number" min={0} value={prm.max} disabled={!prm.scorable} onChange={(e) => updateParam(si, pi, { max: Number(e.target.value) })} />
                          </Field>
                          <Field label="Weight" hint="How much it counts in the total.">
                            <Input type="number" min={0} step={0.5} value={prm.weight} onChange={(e) => updateParam(si, pi, { weight: Number(e.target.value) })} />
                          </Field>
                          <Switch label="Fatal" description="Failing this fails the whole call and alerts recipients." checked={prm.fatal} onChange={(v) => updateParam(si, pi, { fatal: v })} />
                          <Switch label="Scorable" description="Off = pass/fail check with no points." checked={prm.scorable} onChange={(v) => updateParam(si, pi, { scorable: v })} />
                          <div className="md:col-span-2">
                            <Button size="sm" variant="danger-soft" icon={Trash} onClick={() => update((s) => ((s.sections[si].parameters = s.sections[si].parameters.filter((_, i) => i !== pi)), s))}>
                              Remove parameter
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-line px-4 py-2.5">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Plus}
                  onClick={() => {
                    const np = newParam();
                    update((s) => (s.sections[si].parameters.push(np), s));
                    setOpenId(np.id);
                  }}
                >
                  Add parameter
                </Button>
              </div>
            </Card>
          ))}
          <Button variant="secondary" icon={Plus} className="self-start" onClick={() => update((s) => (s.sections.push({ id: `sec_${++uid}`, name: 'New section', parameters: [] }), s))}>
            Add section
          </Button>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-6 xl:h-fit">
          <Card>
            <CardHeader title="Scoring" subtitle="How a call’s total is built" />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Points', total],
                ['Parameters', params.length],
                ['Fatal', fatal],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-surface-2 py-2.5">
                  <div className={cn('font-display text-xl font-bold tabular', l === 'Fatal' && v > 0 && 'text-danger')}>{v}</div>
                  <div className="text-2xs text-ink-muted">{l}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">Score = weighted points ÷ max × 100. Pass mark is 70. Any fatal miss fails the call.</p>
          </Card>
          <Card>
            <CardHeader title="Context documents" subtitle="Price sheets, scripts, policies. The AI checks facts against these." />
            <ul className="mb-3 flex flex-col gap-2">
              {set.documents.map((d) => {
                const Icon = DOC_ICON[d.type] || FileText;
                return (
                  <li key={d.id} className="flex items-center gap-2.5 rounded-xl border border-line p-2.5">
                    <Icon size={20} weight="duotone" className="shrink-0 text-brand" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{d.name}</span>
                      <span className="text-2xs text-ink-muted">{d.size}</span>
                    </span>
                    <IconButton size="xs" icon={Trash} label="Remove document" onClick={() => update((s) => ((s.documents = s.documents.filter((x) => x.id !== d.id)), s))} />
                  </li>
                );
              })}
            </ul>
            <FileDrop
              compact
              multiple
              accept=".pdf,.txt,.doc,.docx"
              title="Add documents"
              hint="PDF, TXT or DOC · 20 MB max"
              onFiles={(files) => {
                update((s) => ((s.documents = [...s.documents, ...files.map((f, i) => ({ id: `d${Date.now()}${i}`, name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB`, type: f.name.split('.').pop().replace('docx', 'doc') }))]), s));
                toast(`${files.length} document${files.length > 1 ? 's' : ''} added`);
              }}
            />
          </Card>
        </div>
      </div>

      <Modal open={importing} onClose={() => setImporting(false)} title="Import parameters" description="Rows are added as new sections and parameters. Nothing is deleted." icon={UploadSimple}>
        <FileDrop
          accept=".csv,.xlsx,.xls"
          hint="CSV or Excel · Section, Parameter, Description, Max score, Weight, Fatal"
          onFiles={(f) => {
            update((s) => (s.sections.push({ id: `sec_${++uid}`, name: 'Imported', parameters: [{ ...newParam(), name: 'Empathy statement', description: 'Agent acknowledges the customer’s concern in their own words.' }, { ...newParam(), name: 'Hold etiquette', description: 'Asks permission before hold and thanks the customer after.', max: 5 }] }), s));
            setImporting(false);
            toast({ title: `${f[0]?.name || 'File'} imported`, description: '2 parameters added in a new “Imported” section.' });
          }}
        />
      </Modal>
    </Page>
  );
}
