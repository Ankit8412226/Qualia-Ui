import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, CircleNotch, Coins, FileAudio, LockSimple, Sparkle, Trash, Waveform, X, ArrowRight, Copy } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Badge, Button, Card, CardHeader, Callout, EmptyState, FileDrop, IconButton, Input, Progress, Select, Skeleton, Switch, Tooltip, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { CallDetailDrawer, CreditBanner } from '@/shared/patterns';
import { getUploadMeta, getUploadResult } from '@/services/businesspulse';
import { ProcessChip, useProcess } from '../components/ProcessContext';
import { ScoreCell } from '../components/common';

const EXT = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'];
const MAX_MB = 100;
const MAX_FILES = 100;
const STAGES = ['Uploaded', 'Transcribing', 'Scoring', 'Done'];
const stageOf = (p) => (p >= 100 ? 3 : p >= 60 ? 2 : p >= 18 ? 1 : 0);
const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const SAMPLE = ['Rohan_Sharma_2BHK_Wakad.mp3', 'Neha_Iyer_followup.wav', 'Karan_Mehta_site_visit.m4a', 'Pooja_Joshi_price_query.mp3', 'Amit_Reddy_NRI.aac'];

export default function UploadPage() {
  const { processId } = useProcess();
  const toast = useToast();
  const { data: meta, loading } = useQuery(() => getUploadMeta(processId), [processId]);
  const [noCredits, setNoCredits] = useState(false);
  const [files, setFiles] = useState([]);
  const [rejected, setRejected] = useState([]);
  // Earlier uploads from today, so the queue shows finished rows on first visit.
  const [queue, setQueue] = useState(() =>
    ['Sahil_Gupta_callback.mp3', 'Tanvi_Bose_Baner_3BHK.wav', 'Nikhil_Das_price.m4a'].map((name, i) => ({ key: `seed${i}`, name, size: 3e6, agentId: '', progress: i === 0 ? 46 : 100, index: 90 + i })),
  );
  const [all, setAll] = useState({ agentId: '', disposition: '', setId: '', callAt: '' });
  const [open, setOpen] = useState(null);
  const seq = useRef(0);

  const credits = meta ? (noCredits ? { ...meta.credits, used: meta.credits.total } : meta.credits) : null;
  const left = credits ? credits.total - credits.used : 0;
  const locked = credits && left <= 0;

  const defaults = () => ({ agentId: meta?.agents[0]?.value || '', disposition: '', setId: meta?.defaultSet || '', callAt: '' });

  const addFiles = (list) => {
    const bad = [];
    const good = [];
    list.forEach((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!EXT.includes(ext)) bad.push({ name: f.name, reason: 'Not an audio format we support' });
      else if (f.size > MAX_MB * 1048576) bad.push({ name: f.name, reason: `Bigger than ${MAX_MB} MB` });
      else good.push(f);
    });
    const room = MAX_FILES - files.length;
    if (good.length > room) good.splice(room).forEach((f) => bad.push({ name: f.name, reason: `Batch limit is ${MAX_FILES} files` }));
    setRejected(bad);
    setFiles((cur) => [...cur, ...good.map((f) => ({ key: `f${++seq.current}`, name: f.name, size: f.size, ...defaults() }))]);
  };

  const addSamples = () => addFiles(SAMPLE.map((n, i) => ({ name: n, size: (2.1 + i * 1.7) * 1048576 })));
  const update = (key, patch) => setFiles((cur) => cur.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const applyAll = (k, v) => {
    setAll((a) => ({ ...a, [k]: v }));
    if (v) setFiles((cur) => cur.map((f) => ({ ...f, [k]: v })));
  };
  const missing = files.filter((f) => !f.agentId || !f.setId).length;

  const start = () => {
    if (files.length > left) {
      toast({ title: 'Not enough credits', description: `You have ${left} credits for ${files.length} files.`, tone: 'error' });
      return;
    }
    setQueue((q) => [...files.map((f, i) => ({ ...f, progress: 2, index: q.length + i, startedAt: Date.now() })), ...q]);
    toast({ title: `${files.length} calls queued`, description: 'Transcription and scoring take about a minute per call.' });
    setFiles([]);
    setRejected([]);
  };

  // Simulated pipeline: each file advances through Uploaded → Transcribing → Scoring → Done.
  useEffect(() => {
    if (!queue.some((q) => q.progress < 100)) return undefined;
    const t = setInterval(() => {
      setQueue((cur) => cur.map((q, i) => (q.progress >= 100 ? q : { ...q, progress: Math.min(100, q.progress + 3 + ((i * 7 + Math.round(q.progress)) % 9)) })));
    }, 650);
    return () => clearInterval(t);
  }, [queue]);

  // Fetch the scored result once a file is done.
  useEffect(() => {
    queue
      .filter((q) => q.progress >= 100 && !q.result && !q.fetching)
      .forEach((q) => {
        setQueue((cur) => cur.map((x) => (x.key === q.key ? { ...x, fetching: true } : x)));
        getUploadResult(processId, q.index, { fileName: q.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '), agentId: q.agentId, disposition: q.disposition, callAt: q.callAt }).then((result) => setQueue((cur) => cur.map((x) => (x.key === q.key ? { ...x, result } : x))));
      });
  }, [queue, processId]);

  const done = queue.filter((q) => q.result).length;
  const agentName = (id) => meta?.agents.find((a) => a.value === id)?.label;

  return (
    <Page>
      <PageHeader
        title="Upload calls"
        description="Add recordings and we transcribe and score each one against your QA checklist."
        meta={<ProcessChip />}
        actions={
          <Tooltip content="Mock only: preview the screen when credits run out">
            <Switch size="sm" checked={noCredits} onChange={setNoCredits} label="Preview: 0 credits" className="items-center gap-2" />
          </Tooltip>
        }
      />

      {loading ? (
        <Skeleton className="mb-4 h-12 w-full rounded-2xl" />
      ) : (
        <CreditBanner className="mb-4" label="Scoring credits" used={credits.used} total={credits.total} unit="calls" onTopUp={() => toast({ title: 'Request sent', description: 'Your Qualia account manager will add credits.', tone: 'info' })} />
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {locked ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-canvas">
                <LockSimple size={24} weight="fill" />
              </span>
              <h2 className="text-lg font-extrabold">Out of scoring credits</h2>
              <p className="max-w-sm text-sm text-ink-muted">Uploads are paused until credits are added. Calls already in the queue will finish.</p>
              <Button variant="accent" icon={Coins} onClick={() => toast({ title: 'Request sent', tone: 'info' })}>
                Request credits
              </Button>
            </Card>
          ) : (
            <Card>
              <FileDrop
                multiple
                accept={EXT.map((e) => `.${e}`).join(',')}
                onFiles={addFiles}
                title="Drop call recordings here or browse"
                hint={`MP3, WAV, M4A, OGG, AAC or FLAC · up to ${MAX_MB} MB each · ${MAX_FILES} files per batch`}
              />
              {!files.length && (
                <div className="mt-3 flex justify-center">
                  <Button variant="link" size="sm" icon={Sparkle} onClick={addSamples}>
                    Try with 5 sample recordings
                  </Button>
                </div>
              )}
              {rejected.length > 0 && (
                <Callout tone="warning" className="mt-4" title={`${rejected.length} file${rejected.length > 1 ? 's' : ''} skipped`} action={<IconButton icon={X} label="Dismiss" size="sm" onClick={() => setRejected([])} />}>
                  <ul className="mt-1 text-xs">
                    {rejected.slice(0, 4).map((r) => (
                      <li key={r.name}>
                        {r.name} — {r.reason}
                      </li>
                    ))}
                  </ul>
                </Callout>
              )}
            </Card>
          )}

          {files.length > 0 && !locked && (
            <Card padded={false} className="animate-rise">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <h3 className="text-[15px] font-bold">{files.length} files ready</h3>
                  <p className="text-xs text-ink-muted">Tell us who took each call so scores land on the right agent.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                    Clear
                  </Button>
                  <Button variant="brand" iconRight={ArrowRight} disabled={missing > 0} onClick={start}>
                    Score {files.length} calls
                  </Button>
                </div>
              </div>

              {/* Apply to all */}
              <div className="grid gap-2 border-b border-line bg-brand/5 px-5 py-3 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))_32px] md:items-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <Copy size={14} weight="bold" /> Apply to all
                </span>
                <Select size="sm" placeholder="Agent…" options={meta.agents} value={all.agentId} onChange={(e) => applyAll('agentId', e.target.value)} />
                <Select size="sm" placeholder="Disposition…" options={meta.dispositions} value={all.disposition} onChange={(e) => applyAll('disposition', e.target.value)} />
                <Select size="sm" placeholder="Parameter set…" options={meta.parameterSets} value={all.setId} onChange={(e) => applyAll('setId', e.target.value)} />
                <Input size="sm" type="datetime-local" value={all.callAt} onChange={(e) => applyAll('callAt', e.target.value)} />
                <span />
              </div>

              <ul className="divide-y divide-line/70">
                {files.map((f) => (
                  <li key={f.key} className="grid gap-2 px-5 py-3 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))_32px] md:items-center">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <FileAudio size={16} weight="duotone" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink" title={f.name}>
                          {f.name}
                        </span>
                        <span className="text-2xs text-ink-muted">{fmtSize(f.size)}</span>
                      </span>
                    </span>
                    <Select size="sm" aria-label="Agent" placeholder="Agent…" options={meta.agents} value={f.agentId} onChange={(e) => update(f.key, { agentId: e.target.value })} className={cn(!f.agentId && '[&_select]:border-danger/50')} />
                    <Select size="sm" aria-label="Disposition" placeholder="Disposition (AI picks)" options={meta.dispositions} value={f.disposition} onChange={(e) => update(f.key, { disposition: e.target.value })} />
                    <Select size="sm" aria-label="Parameter set" options={meta.parameterSets} value={f.setId} onChange={(e) => update(f.key, { setId: e.target.value })} />
                    <Input size="sm" type="datetime-local" aria-label="Call date and time" value={f.callAt} onChange={(e) => update(f.key, { callAt: e.target.value })} />
                    <IconButton icon={Trash} label="Remove" size="sm" onClick={() => setFiles((cur) => cur.filter((x) => x.key !== f.key))} />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-ink-muted">
                <span>Uses {files.length} of {fmtNumber(left)} credits. Leave call time empty to use the file’s date.</span>
                {missing > 0 && <span className="font-medium text-danger">{missing} need an agent</span>}
              </div>
            </Card>
          )}
        </div>

        {/* Processing queue */}
        <Card padded={false} className="flex h-fit flex-col xl:sticky xl:top-6">
          <div className="border-b border-line px-5 py-4">
            <CardHeader className="mb-0" title="Processing queue" subtitle={queue.length ? `${done} of ${queue.length} scored` : 'Files appear here once you start'} icon={Waveform} actions={queue.length > 0 && <Badge tone={done === queue.length ? 'success' : 'warning'} dot pulse={done < queue.length}>{done === queue.length ? 'All done' : 'Working'}</Badge>} />
            {queue.length > 0 && <Progress className="mt-3" size="sm" value={queue.reduce((a, q) => a + q.progress, 0)} max={queue.length * 100} />}
          </div>
          {!queue.length ? (
            <EmptyState compact icon={Waveform} title="Nothing processing" description="Upload recordings and press Score to see them move through the pipeline." />
          ) : (
            <ul className="max-h-[560px] divide-y divide-line/70 overflow-y-auto">
              {queue.map((q) => {
                const st = stageOf(q.progress);
                return (
                  <li key={q.key}>
                    <button disabled={!q.result} onClick={() => setOpen(q.result)} className="flex w-full flex-col gap-2.5 px-5 py-3.5 text-left transition enabled:hover:bg-surface-2">
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink">{q.name}</span>
                          <span className="text-2xs text-ink-muted">{agentName(q.agentId) || q.result?.agent.name || 'Matching agent…'}</span>
                        </span>
                        {q.result ? <ScoreCell value={q.result.score} fatal={q.result.fatal} /> : <CircleNotch size={16} className="animate-spin text-brand" />}
                      </span>
                      <span className="grid grid-cols-4 gap-1">
                        {STAGES.map((s, i) => (
                          <span key={s} className="flex flex-col gap-1">
                            <span className={cn('h-1 rounded-full transition-colors', i < st || st === 3 ? 'bg-brand' : i === st ? 'animate-pulse-dot bg-brand/60' : 'bg-surface-3')} />
                            <span className={cn('flex items-center gap-0.5 text-2xs', i <= st ? 'font-medium text-ink-2' : 'text-ink-faint')}>
                              {(i < st || st === 3) && <CheckCircle size={10} weight="fill" className="text-brand" />}
                              {s}
                            </span>
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} initialTab="score" />
    </Page>
  );
}
