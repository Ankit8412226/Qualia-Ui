import { ClockCounterClockwise } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { Page, PageHeader } from '@/shared/layout';
import * as df from '@/services/dialflow';
import { CallsTable } from '../components/CallsTable';

export default function CallHistoryPage() {
  const { data = [], loading } = useQuery(() => df.listCalls(), []);
  return (
    <Page>
      <PageHeader title="Call history" description="Every call made by your agents. Filter, open a call to replay it, or export." />
      <CallsTable rows={data} loading={loading} pageSize={15} exportName="call-history" />
    </Page>
  );
}
