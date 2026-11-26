import { useQuery } from '@/lib/hooks';
import { fmtNumber } from '@/lib/format';
import { Callout, Skeleton } from '@/design-system';
import { DncManager } from '@/shared/patterns';
import { Page, PageHeader } from '@/shared/layout';
import { listGlobalDnc } from '@/services/commons';

export default function DncPage() {
  const { data, loading } = useQuery(() => listGlobalDnc(), []);
  return (
    <Page>
      <PageHeader title="Global Do Not Call" description="Numbers no tenant can call, on any product. Tenants keep their own lists on top of this one." meta={data && <span className="text-xs text-ink-muted">{fmtNumber(data.length)} numbers blocked</span>} />
      <Callout tone="info" className="mb-4">
        TRAI NCPR numbers sync every night. Add a number here when a complaint or legal request covers every client.
      </Callout>
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <DncManager rows={data} scope="global" />
      )}
    </Page>
  );
}
