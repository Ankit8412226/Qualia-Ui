import { Fragment, useEffect, useState } from 'react';
import { BatteryHigh, BatteryLow, DeviceMobile, Play, ShieldCheck, ShieldWarning } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtPhone, fmtRelative } from '@/lib/format';
import { Badge, Button, Card, CardHeader, DataTable, Field, Input, Progress, Skeleton, StatusBadge, Switch, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getSpamCheck } from '@/services/commons';
import { OPERATORS, SPAM_LABELS } from '@/mocks/commons';
import { SpamLabel } from '../components/Bits';

export default function SpamCheckPage() {
  const { data, loading, error, reload } = useQuery(() => getSpamCheck(), []);
  const [settings, setSettings] = useState(null);
  const [running, setRunning] = useState(null); // progress 0..100
  const [ranAt, setRanAt] = useState(null);
  const toast = useToast();
  useEffect(() => {
    if (data) {
      setSettings(data.settings);
      setRanAt(data.results.ranAt);
    }
  }, [data]);

  const run = () => {
    setRunning(0);
    let p = 0;
    const id = setInterval(() => {
      p += 12;
      setRunning(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(id);
        setRunning(null);
        setRanAt(new Date());
        toast({ title: 'Spam check finished', description: `${data.results.rows.length} lines checked on ${OPERATORS.length - 1} phones. 1 phone was offline.`, tone: 'success' });
      }
    }, 450);
  };

  const rows = data?.results.rows || [];
  const flagged = rows.filter((r) => Object.values(r.labels).some((l) => l === 'Spam' || l === 'Suspected fraud'));

  return (
    <Page>
      <PageHeader
        title="Spam check"
        description="Company phones, one SIM per operator, receive a test call from each low-connectivity line and report the label they see."
        meta={ranAt && <span className="text-xs text-ink-muted">Last run {fmtRelative(ranAt)} · next {data?.results.nextRun}</span>}
        actions={
          <Button variant="primary" icon={Play} loading={running != null} disabled={loading} onClick={run}>
            {running != null ? 'Checking…' : 'Run check now'}
          </Button>
        }
      />

      {running != null && (
        <Card className="mb-6 flex animate-rise items-center gap-4">
          <ShieldCheck size={22} weight="duotone" className="shrink-0 text-ink-muted" />
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 text-sm font-medium">
              Calling seed phones… {Math.min(rows.length, Math.ceil((running / 100) * rows.length))} of {rows.length} lines
            </div>
            <Progress value={running} />
          </div>
        </Card>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader title="Settings" subtitle="Which lines get checked and when" />
          {!settings ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Check a line when connect rate drops by" hint="Compared with its own 14-day baseline.">
                <Input type="number" value={settings.dropThreshold} onChange={(e) => setSettings({ ...settings, dropThreshold: e.target.value })} suffix="%" />
              </Field>
              <Field label="Only lines with at least" hint="Fewer calls than this is too noisy to judge.">
                <Input type="number" value={settings.minCalls} onChange={(e) => setSettings({ ...settings, minCalls: e.target.value })} suffix="calls" />
              </Field>
              <Switch checked={settings.autoRun} onChange={(v) => setSettings({ ...settings, autoRun: v })} label="Auto-run daily" description={settings.schedule} />
              <Button size="sm" className="self-start" onClick={() => toast('Settings saved')}>
                Save settings
              </Button>
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader className="mb-0" title="Seed phones" subtitle="Keep the Qualia Spam Check app open and charging" />
          </div>
          <DataTable
            loading={loading}
          error={error}
          onRetry={reload}
            rows={data?.phones || []}
            pageSize={0}
            columns={[
              {
                key: 'number',
                header: 'Phone',
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <DeviceMobile size={20} weight="duotone" className="text-ink-muted" />
                    <div>
                      <div className="font-medium tabular text-ink">{fmtPhone(p.number)}</div>
                      <div className="text-2xs text-ink-faint">{p.device}</div>
                    </div>
                  </div>
                ),
              },
              { key: 'operator', header: 'Operator', render: (p) => <Badge>{p.operator}</Badge> },
              { key: 'appStatus', header: 'App', render: (p) => <StatusBadge status={p.appStatus} /> },
              {
                key: 'battery',
                header: 'Battery',
                hideBelow: 'md',
                render: (p) => (
                  <span className={cn('inline-flex items-center gap-1 tabular', p.battery < 20 ? 'text-danger' : 'text-ink-2')}>
                    {p.battery < 20 ? <BatteryLow size={16} /> : <BatteryHigh size={16} />} {p.battery}%
                  </span>
                ),
              },
              { key: 'lastSeen', header: 'Last seen', render: (p) => fmtRelative(p.lastSeen) },
            ]}
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Latest results"
          subtitle="What each operator’s phone showed when the line called it"
          actions={
            !loading && (
              <Badge tone={flagged.length ? 'danger' : 'success'} dot>
                {flagged.length} of {rows.length} lines flagged
              </Badge>
            )
          }
        />
        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] items-center gap-x-3 gap-y-0" style={{ gridTemplateColumns: `minmax(220px,1.4fr) 80px repeat(${OPERATORS.length}, minmax(110px,1fr))` }}>
              <div className="border-b border-line py-2 text-xs font-semibold text-ink-muted">Line</div>
              <div className="border-b border-line py-2 text-right text-xs font-semibold text-ink-muted">Drop</div>
              {OPERATORS.map((op) => (
                <div key={op} className="border-b border-line py-2 text-xs font-semibold text-ink-muted">
                  {op}
                </div>
              ))}
              {rows.map((r) => {
                const bad = Object.values(r.labels).some((l) => l === 'Spam' || l === 'Suspected fraud');
                return (
                  <Fragment key={r.lineId}>
                    <div className="border-b border-line/70 py-3">
                      <div className="flex items-center gap-2">
                        {bad && <ShieldWarning size={15} weight="fill" className="shrink-0 text-danger" />}
                        <span className="font-medium tabular text-ink">{fmtPhone(r.number)}</span>
                      </div>
                      <div className="truncate text-xs text-ink-muted">
                        {r.tenant} · <span className={bad ? 'text-danger' : ''}>{r.callerName}</span>
                      </div>
                    </div>
                    <div className={cn('border-b border-line/70 py-3 text-right text-sm font-semibold tabular', r.drop >= 25 ? 'text-danger' : 'text-ink-2')}>−{r.drop}%</div>
                    {OPERATORS.map((op) => (
                      <div key={op} className="flex h-full items-center border-b border-line/70 py-3">
                        <SpamLabel label={r.labels[op]} />
                      </div>
                    ))}
                  </Fragment>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-muted">
              {SPAM_LABELS.map((l) => (
                <SpamLabel key={l} label={l} />
              ))}
              <span>· “Not checked” = phone offline during the run</span>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}
