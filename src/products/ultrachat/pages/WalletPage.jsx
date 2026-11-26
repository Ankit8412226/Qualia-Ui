import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ArrowsClockwise, Bank, CreditCard, DownloadSimple, Plus, QrCode, Receipt, Wallet } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtCurrency, fmtDateTime, fmtNumber } from '@/lib/format';
import { Badge, Button, Card, CardHeader, DataTable, Field, FilterSelect, Input, Modal, RadioCards, Select, Skeleton, Switch, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getWallet } from '@/services/ultrachat';
import { CategoryBadge } from '../components/wa';

const CHIPS = [5000, 10000, 25000, 50000, 100000];

export default function WalletPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { data, loading, setData, error, reload } = useQuery(() => getWallet(), []);
  const [topup, setTopup] = useState(params.get('topup') === '1');
  const [amount, setAmount] = useState(25000);
  const [method, setMethod] = useState('upi');
  const [paying, setPaying] = useState(false);
  const [type, setType] = useState([]);
  const [refill, setRefill] = useState(null);
  useEffect(() => {
    if (data) setRefill(data.autoRefill);
  }, [data]);

  const closeTopup = () => {
    setTopup(false);
    if (params.get('topup')) setParams({}, { replace: true });
  };
  const gst = Math.round(amount * 0.18);
  const tx = (data?.transactions || []).filter((t) => !type.length || type.includes(t.type));
  const low = data && data.balance < data.lowAt;
  const daysLeft = data ? Math.round(data.balance / (data.monthSpend / 26)) : 0;

  return (
    <Page>
      <PageHeader
        title="Wallet"
        description="Prepaid balance for WhatsApp conversations. Charges are per delivered message, by category."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => setTopup(true)}>
            Top up
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {loading ? (
          <Skeleton className="h-56 rounded-3xl" />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-night p-6 text-white sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand opacity-40 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-28 left-10 h-60 w-60 rounded-full bg-info opacity-20 blur-[90px]" />
            <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-white/60">
              <Wallet size={14} weight="fill" /> Available balance
            </div>
            <div className="relative mt-2 font-display text-[44px] font-extrabold leading-none tracking-tight tabular">{fmtCurrency(data.balance)}</div>
            <div className="relative mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
              About {daysLeft} days at your current spend
              {low && <Badge tone="warning">Running low</Badge>}
            </div>
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              {[
                ['Spent this month', fmtCurrency(data.monthSpend)],
                ['Low-balance alert', `below ${fmtCurrency(data.lowAt)}`],
                ['Auto-refill', refill?.enabled ? `${fmtCurrency(refill.amount)}` : 'Off'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                  <div className="text-2xs text-white/60">{l}</div>
                  <div className="mt-0.5 truncate font-display text-base font-bold">{v}</div>
                </div>
              ))}
            </div>
            <Button variant="brand" icon={Plus} className="relative mt-6" onClick={() => setTopup(true)}>
              Add money
            </Button>
          </div>
        )}

        <Card>
          <CardHeader title="Auto-refill" subtitle="Never pause a campaign because the wallet ran out." icon={ArrowsClockwise} actions={refill && <Switch checked={refill.enabled} onChange={(enabled) => setRefill({ ...refill, enabled })} />} />
          {!refill ? (
            <Skeleton className="h-32" />
          ) : (
            <div className={cn('flex flex-col gap-4 transition', !refill.enabled && 'pointer-events-none opacity-50')}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="When balance falls below">
                  <Input type="number" value={refill.below} onChange={(e) => setRefill({ ...refill, below: Number(e.target.value) })} suffix="₹" />
                </Field>
                <Field label="Add">
                  <Input type="number" value={refill.amount} onChange={(e) => setRefill({ ...refill, amount: Number(e.target.value) })} suffix="₹" />
                </Field>
              </div>
              <Field label="Charge">
                <Select value={refill.method} onChange={(e) => setRefill({ ...refill, method: e.target.value })} options={['Card •• 4402', 'UPI AutoPay · rrparko@hdfcbank']} />
              </Field>
              <Button variant="secondary" onClick={() => toast({ title: 'Auto-refill saved', description: `${fmtCurrency(refill.amount)} when below ${fmtCurrency(refill.below)}.` })}>
                Save auto-refill
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.6fr]">
        <Card padded={false} className="overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-[15px] font-bold">Rate card</h3>
            <p className="mt-0.5 text-xs text-ink-muted">Per delivered message, India numbers, incl. platform fee. GST extra.</p>
          </div>
          <ul className="divide-y divide-line/70">
            {(data?.rateCard || []).map((r) => (
              <li key={r.category} className="flex items-start gap-3 px-5 py-3.5">
                <CategoryBadge category={r.category} />
                <span className="min-w-0 flex-1 text-xs text-ink-muted">{r.description}</span>
                <span className="font-display text-base font-bold tabular">{r.rate ? `₹${r.rate.toFixed(2)}` : 'Free'}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
            <div>
              <h3 className="text-[15px] font-bold">Transactions</h3>
              <p className="mt-0.5 text-xs text-ink-muted">Top-ups, campaign charges and refunds for failed messages.</p>
            </div>
            <div className="flex gap-2">
              <FilterSelect label="Type" options={['Credit', 'Debit', 'Refund']} value={type} onChange={setType} />
              <Button size="sm" variant="ghost" icon={DownloadSimple} onClick={() => toast('Statement downloaded')}>
                Statement
              </Button>
            </div>
          </div>
          <DataTable
            loading={loading}
          error={error}
          onRetry={reload}
            rows={tx}
            pageSize={8}
            dense
            columns={[
              {
                key: 'description',
                header: 'Details',
                render: (t) => (
                  <span className="flex items-center gap-3">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', t.amount > 0 ? 'bg-success/10 text-success' : 'bg-surface-3 text-ink-2')}>{t.amount > 0 ? <ArrowDownLeft size={15} weight="bold" /> : <ArrowUpRight size={15} weight="bold" />}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{t.description}</span>
                      <span className="block text-2xs text-ink-muted">
                        {fmtDateTime(t.at)}
                        {t.ref && ` · ${t.ref}`}
                      </span>
                    </span>
                  </span>
                ),
              },
              { key: 'type', header: 'Type', hideBelow: 'md', render: (t) => <Badge tone={t.type === 'Credit' ? 'success' : t.type === 'Refund' ? 'info' : 'neutral'}>{t.type}</Badge> },
              { key: 'amount', header: 'Amount', align: 'right', render: (t) => <span className={cn('whitespace-nowrap font-semibold', t.amount > 0 ? 'text-success' : 'text-ink')}>{t.amount > 0 ? '+' : '−'}{fmtCurrency(Math.abs(t.amount))}</span> },
              { key: 'balance', header: 'Balance', align: 'right', hideBelow: 'lg', render: (t) => <span className="whitespace-nowrap text-ink-muted">{fmtCurrency(t.balance)}</span> },
              { key: 'inv', header: '', width: 40, render: () => <Receipt size={16} className="text-ink-faint" aria-label="Invoice" /> },
            ]}
          />
        </Card>
      </div>

      <Modal
        open={topup}
        onClose={closeTopup}
        icon={Wallet}
        title="Add money to wallet"
        description="Credited instantly. A GST invoice is emailed to billing@rrparko.in."
        footer={
          <>
            <Button variant="secondary" onClick={closeTopup}>
              Cancel
            </Button>
            <Button
              variant="brand"
              loading={paying}
              disabled={amount < 1000}
              onClick={() => {
                setPaying(true);
                setTimeout(() => {
                  setPaying(false);
                  setData((d) => ({ ...d, balance: d.balance + amount, transactions: [{ id: `tx_${Date.now()}`, type: 'Credit', description: `Top-up via ${method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : 'Net banking'}`, amount, at: new Date(), balance: d.balance + amount }, ...d.transactions] }));
                  toast({ title: `${fmtCurrency(amount)} added`, description: 'Your wallet is ready.' });
                  closeTopup();
                }, 1100);
              }}
            >
              Pay {fmtCurrency(amount + gst)}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Amount" hint="Minimum ₹1,000.">
            <div className="mb-2 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => setAmount(c)} className={cn('h-9 rounded-xl border px-3.5 text-sm font-semibold tabular transition', amount === c ? 'border-brand bg-brand/10 text-brand' : 'border-line hover:border-line-strong')}>
                  {fmtCurrency(c)}
                </button>
              ))}
            </div>
            <Input type="number" min={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} suffix="₹" />
          </Field>
          <Field label="Pay with">
            <RadioCards
              cols={3}
              value={method}
              onChange={setMethod}
              options={[
                { value: 'upi', label: 'UPI', icon: QrCode, description: 'GPay, PhonePe, Paytm' },
                { value: 'card', label: 'Card', icon: CreditCard, description: 'Credit or debit' },
                { value: 'nb', label: 'Net banking', icon: Bank, description: 'All major banks' },
              ]}
            />
          </Field>
          <dl className="rounded-2xl bg-surface-2 p-4 text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-ink-muted">Wallet credit</dt>
              <dd className="tabular">{fmtCurrency(amount)}</dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-ink-muted">GST (18%)</dt>
              <dd className="tabular">{fmtCurrency(gst)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-line pt-2 font-semibold">
              <dt>You pay</dt>
              <dd className="tabular">{fmtCurrency(amount + gst)}</dd>
            </div>
            <p className="mt-2 text-xs text-ink-muted">≈ {fmtNumber(Math.floor(amount / 0.88))} marketing or {fmtNumber(Math.floor(amount / 0.14))} utility messages.</p>
          </dl>
        </div>
      </Modal>
    </Page>
  );
}
