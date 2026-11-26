import { useQuery } from '@/lib/hooks';
import { SkeletonRows } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { DispositionsManager } from '@/shared/patterns';
import { listDispositions } from '@/services/agentflow';

export default function DispositionsPage() {
  const { data, loading } = useQuery(listDispositions, []);
  return (
    <Page>
      <PageHeader title="Dispositions" description="The outcomes the AI picks at the end of every call. Clear descriptions help it choose the right one." />
      {loading ? <SkeletonRows rows={6} /> : <DispositionsManager items={data} features={{ aiImprove: true, categories: true, subDispositions: true }} />}
    </Page>
  );
}
