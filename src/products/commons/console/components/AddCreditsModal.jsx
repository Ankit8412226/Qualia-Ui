import { useEffect, useState } from 'react';
import { Coins } from '@phosphor-icons/react';
import { fmtNumber } from '@/lib/format';
import { Button, Field, Input, Modal, Segmented, Select, Textarea } from '@/design-system';
import { productName } from './ProductChips';

const UNITS = { agentflow: 'minutes', businesspulse: 'credits', ultrachat: '₹' };
const QUICK = { agentflow: [5000, 10000, 25000, 50000], businesspulse: [1000, 2000, 5000, 10000], ultrachat: [5000, 10000, 25000, 50000] };
const fmtAmt = (product, n) => (product === 'ultrachat' ? `₹${fmtNumber(n)}` : `${fmtNumber(n)} ${UNITS[product]}`);

/**
 * Add credits / set a limit for one tenant + product.
 * products: product ids the user can pick from (first is default). tenants: optional [{id,name}] to pick a tenant.
 * onSubmit({ product, tenantId, type, amount, reason })
 */
export function AddCreditsModal({ open, onClose, onSubmit, tenantName, tenants, products = ['agentflow', 'businesspulse', 'ultrachat'], defaultProduct, allowLimit = true }) {
  const [product, setProduct] = useState(defaultProduct || products[0]);
  const [tenantId, setTenantId] = useState(tenants?.[0]?.id || '');
  const [type, setType] = useState('Added');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setProduct(defaultProduct || products[0]);
      setTenantId(tenants?.[0]?.id || '');
      setType('Added');
      setAmount('');
      setReason('');
      setTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultProduct]);

  const n = Number(amount);
  const valid = n > 0 && reason.trim().length > 2 && (!tenants || tenantId);
  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit?.({ product, tenantId, type, amount: n, reason: reason.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={Coins}
      title={type === 'Added' ? 'Add credits' : 'Set credit limit'}
      description={tenantName ? `For ${tenantName}. Every change is logged with your name and reason.` : 'Every change is logged with your name and reason.'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={touched && !valid}>
            {n > 0 ? (type === 'Added' ? `Add ${fmtAmt(product, n)}` : `Set limit to ${fmtAmt(product, n)}`) : type === 'Added' ? 'Add credits' : 'Set limit'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {tenants && (
          <Field label="Tenant" required>
            <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)} options={tenants.map((t) => ({ value: t.id, label: t.name }))} />
          </Field>
        )}
        {products.length > 1 && (
          <Field label="Product">
            <Segmented value={product} onChange={setProduct} options={products.map((p) => ({ value: p, label: productName(p) }))} />
          </Field>
        )}
        {allowLimit && (
          <Field label="Type" hint={type === 'Added' ? 'Adds on top of the current balance.' : 'Replaces the monthly limit. Usage so far stays.'}>
            <Segmented value={type} onChange={setType} options={[{ value: 'Added', label: 'Add to balance' }, { value: 'Limit set', label: 'Set monthly limit' }]} size="sm" />
          </Field>
        )}
        <Field label={`Amount (${UNITS[product]})`} required error={touched && !(n > 0) ? 'Enter an amount above 0' : undefined}>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" autoFocus />
          <div className="mt-1 flex flex-wrap gap-1.5">
            {QUICK[product].map((q) => (
              <button key={q} type="button" onClick={() => setAmount(String(q))} className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink-2 transition hover:border-line-strong hover:bg-surface-2">
                {fmtAmt(product, q)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Reason" required error={touched && reason.trim().length <= 2 ? 'Add a short reason (invoice no., campaign…)' : undefined}>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Paid invoice #QB-2841" />
        </Field>
      </div>
    </Modal>
  );
}
