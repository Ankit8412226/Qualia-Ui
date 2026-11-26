import { useNavigate } from 'react-router-dom';
import { ArrowsClockwise, PushPin, Sparkle, DotsThree, Trash, CalendarPlus } from '@phosphor-icons/react';
import { lastDays, int, reseed } from '@/mocks/seed';
import { useQuery } from '@/lib/hooks';
import { BarsChart, Button, Card, Delta, EmptyState, IconButton, Menu, Skeleton, TrendChart, useToast } from '@/design-system';
import { Page, PageHeader, ProductMark } from '@/shared/layout';
import { insightsService } from '@/services/insights';

/** Pinned answers become a personal dashboard that refreshes itself. */
export default function PinnedPage() {
  const { data = [], loading, setData } = useQuery(() => insightsService.listPinned(), []);
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <Page>
      <PageHeader
        title="Pinned answers"
        description="Answers you pinned keep refreshing, so this page works as your own dashboard."
        actions={
          <Button variant="brand" icon={Sparkle} onClick={() => navigate('/insights')}>
            Ask and pin
          </Button>
        }
      />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-4 h-40 w-full" />
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={PushPin} title="Nothing pinned yet" description="Pin any answer from a conversation to keep it here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((p, idx) => {
            reseed(30 + idx);
            const series = lastDays(12, () => ({ v: int(30, 60) }));
            const bars = ['Kavya I.', 'Rohan M.', 'Sahil C.', 'Tanvi B.', 'Manish D.'].map((n) => ({ name: n, v: int(2, 9) }));
            return (
              <Card key={p.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {p.product === 'all' ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white grad-bg">
                        <Sparkle size={15} weight="fill" />
                      </span>
                    ) : (
                      <ProductMark id={p.product} size="sm" />
                    )}
                    <div>
                      <h3 className="text-[15px] font-bold">{p.title}</h3>
                      <p className="flex items-center gap-1 text-xs text-ink-muted">
                        <ArrowsClockwise size={11} /> {p.updated}
                      </p>
                    </div>
                  </div>
                  <Menu
                    trigger={({ toggle }) => <IconButton icon={DotsThree} label="Options" size="sm" onClick={toggle} />}
                    items={[
                      { label: 'Send as a daily digest', icon: CalendarPlus, onClick: () => toast('Digest scheduled for 9:00 every day') },
                      { label: 'Unpin', icon: Trash, tone: 'danger', onClick: () => setData((all) => all.filter((x) => x.id !== p.id)) },
                    ]}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-display text-3xl font-bold tabular">{p.value}</span>
                  <Delta value={p.delta} inverse={p.inverse} className="mb-1" />
                </div>
                {p.kind === 'bars' ? <BarsChart data={bars} series={[{ key: 'v', label: p.title }]} height={170} /> : <TrendChart data={series} series={[{ key: 'v', label: p.title }]} height={170} />}
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}
