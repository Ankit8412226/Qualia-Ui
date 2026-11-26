import { useQuery } from '@/lib/hooks';
import { SkeletonRows } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { DncManager } from '@/shared/patterns';
import { listDnc } from '@/services/agentflow';

export default function DncPage() {
  const { data, loading } = useQuery(listDnc, []);
  return (
    <Page>
      <PageHeader title="Do Not Call" description="Numbers here are never dialled by any campaign. The AI adds a number when a customer asks not to be called." />
      {loading ? <SkeletonRows rows={8} /> : <DncManager rows={data} scope="tenant" />}
    </Page>
  );
}
