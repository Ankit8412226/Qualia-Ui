import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, DownloadSimple, Megaphone, Tag, User } from '@phosphor-icons/react';
import { fmtDateTime, fmtDuration, fmtPhone } from '@/lib/format';
import { Avatar, Badge, Button, Card, DataTable, DateRangeFilter, FilterBar, FilterSelect, StatusBadge, scoreTone } from '@/design-system';
import { CallDetailDrawer } from '@/shared/patterns';
import { downloadCsv } from './csv';

const RANGE_MIN = { today: 60 * 15.5, yesterday: 60 * 39.5, '7d': 60 * 24 * 7, '30d': 60 * 24 * 30, mtd: 60 * 24 * 26 };
const NOW = new Date('2026-11-26T15:30:00+05:30').getTime();

/**
 * Call list with instant filters, CSV export and the shared CallDetailDrawer.
 * Used by My calls, Call history and Campaign detail.
 */
export function CallsTable({ rows = [], loading, showAgent = true, showCampaign = true, defaultRange = '7d', pageSize = 12, exportName = 'calls', compact }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState([]);
  const [disp, setDisp] = useState([]);
  const [camp, setCamp] = useState([]);
  const [agent, setAgent] = useState([]);
  const [range, setRange] = useState({ preset: defaultRange });
  const [open, setOpen] = useState(null);

  const opts = useMemo(() => {
    const uniq = (f) => [...new Set(rows.map(f).filter(Boolean))].sort();
    return { status: uniq((r) => r.status), disp: uniq((r) => r.disposition), camp: uniq((r) => r.campaign), agent: uniq((r) => r.agent?.name) };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const span = RANGE_MIN[range.preset];
    return rows.filter((r) => {
      const digits = q.replace(/\D/g, '');
      if (q && !`${r.contact.name} ${r.agent?.name}`.toLowerCase().includes(q) && !(digits && r.contact.phone.includes(digits))) return false;
      if (status.length && !status.includes(r.status)) return false;
      if (disp.length && !disp.includes(r.disposition)) return false;
      if (camp.length && !camp.includes(r.campaign)) return false;
      if (agent.length && !agent.includes(r.agent?.name)) return false;
      if (span && NOW - new Date(r.startedAt).getTime() > span * 60000) return false;
      return true;
    });
  }, [rows, search, status, disp, camp, agent, range]);

  const canReset = search || status.length || disp.length || camp.length || agent.length || range.preset !== defaultRange;
  const reset = () => {
    setSearch('');
    setStatus([]);
    setDisp([]);
    setCamp([]);
    setAgent([]);
    setRange({ preset: defaultRange });
  };

  const columns = [
    {
      key: 'contact',
      header: 'Lead',
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.contact.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{r.contact.name}</div>
            <div className="flex items-center gap-1 text-xs text-ink-muted">
              {r.direction === 'inbound' ? <ArrowDownLeft size={11} weight="bold" /> : <ArrowUpRight size={11} weight="bold" />}
              {fmtPhone(r.contact.phone)}
            </div>
          </div>
        </div>
      ),
    },
    showAgent && { key: 'agent', header: 'Agent', render: (r) => r.agent.name, sortable: true, sortValue: (r) => r.agent.name, hideBelow: 'md' },
    showCampaign && { key: 'campaign', header: 'Campaign', hideBelow: 'lg' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'disposition', header: 'Disposition', render: (r) => <span className={r.status === 'Completed' ? 'text-ink' : 'text-ink-muted'}>{r.disposition}</span>, hideBelow: 'md' },
    { key: 'duration', header: 'Talk time', align: 'right', sortable: true, render: (r) => (r.duration ? fmtDuration(r.duration) : '—') },
    { key: 'score', header: 'QA', align: 'right', hideBelow: 'xl', render: (r) => (r.score != null ? <Badge tone={scoreTone(r.score)}>{r.score}</Badge> : <span className="text-ink-faint">—</span>) },
    { key: 'startedAt', header: 'When', align: 'right', sortable: true, sortValue: (r) => +new Date(r.startedAt), render: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.startedAt)}</span> },
  ].filter(Boolean);

  const exportCsv = () =>
    downloadCsv(exportName, [
      { header: 'Lead', value: (r) => r.contact.name },
      { header: 'Phone', value: (r) => r.contact.phone },
      { header: 'Agent', value: (r) => r.agent.name },
      { header: 'Campaign', key: 'campaign' },
      { header: 'Status', key: 'status' },
      { header: 'Disposition', key: 'disposition' },
      { header: 'Talk time (s)', key: 'duration' },
      { header: 'Started', value: (r) => new Date(r.startedAt).toISOString() },
    ], filtered);

  return (
    <>
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search lead, phone or agent"
        onReset={reset}
        canReset={!!canReset}
        className="mb-4"
        actions={
          <Button icon={DownloadSimple} size="md" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </Button>
        }
      >
        <DateRangeFilter value={range} onChange={setRange} />
        <FilterSelect label="Status" options={opts.status} value={status} onChange={setStatus} />
        <FilterSelect label="Disposition" icon={Tag} options={opts.disp} value={disp} onChange={setDisp} />
        {showCampaign && !compact && <FilterSelect label="Campaign" icon={Megaphone} options={opts.camp} value={camp} onChange={setCamp} />}
        {showAgent && !compact && <FilterSelect label="Agent" icon={User} options={opts.agent} value={agent} onChange={setAgent} searchable />}
      </FilterBar>
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-ink-muted">
          <span>
            <span className="font-semibold text-ink tabular">{filtered.length.toLocaleString('en-IN')}</span> calls
          </span>
          <span className="hidden sm:inline">Click a row to hear the recording and read the transcript</span>
        </div>
        <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={setOpen} pageSize={pageSize} initialSort={{ key: 'startedAt', dir: 'desc' }} />
      </Card>
      <CallDetailDrawer call={open} open={!!open} onClose={() => setOpen(null)} />
    </>
  );
}
