import { fmtDuration, fmtNumber, fmtPercent } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Delta, MetricStrip } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { CallsTable } from '../components/CallsTable';

const MOCK_NOW = new Date('2026-11-26T15:30:00+05:30').getTime();
const TEAM_AHT = 214;

export default function MyCallsPage() {
  const { data = [], loading } = useQuery(() => df.listMyCalls(), []);
  const today = data.filter((c) => MOCK_NOW - new Date(c.startedAt) < 15.5 * 3600000);
  const connected = today.filter((c) => c.status === 'Completed');
  const talk = connected.reduce((a, c) => a + c.duration, 0);
  const avg = talk / Math.max(connected.length, 1);
  return (
    <Page>
      <PageHeader title="My calls" description="Every call you made or took. Open one to hear the recording, read the transcript and see your notes." />
      <MetricStrip
        className="mb-5"
        items={[
          { label: 'Calls today', value: loading ? '–' : <span className="inline-flex items-center gap-2">{fmtNumber(today.length)} <Delta value={8.2} /></span>, sub: 'vs yesterday' },
          { label: 'Connected', value: loading ? '–' : fmtPercent((connected.length / Math.max(today.length, 1)) * 100, 0), sub: `${connected.length} people reached` },
          { label: 'Talk time', value: loading ? '–' : fmtDuration(talk), sub: 'today' },
          { label: 'Avg call', value: loading ? '–' : fmtDuration(avg), sub: `team average ${fmtDuration(TEAM_AHT)}` },
        ]}
      />
      <CallsTable rows={data} loading={loading} showAgent={false} compact exportName="my-calls" />
    </Page>
  );
}
