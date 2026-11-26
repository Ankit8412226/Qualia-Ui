import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle, EnvelopeSimple, PencilSimple, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtNumber } from '@/lib/format';
import { Badge, Button, Callout, Card, Checkbox, CopyField, Field, Input, SecretInput, Segmented, Select, Stepper, Switch, useToast } from '@/design-system';
import { Page, PageHeader, ProductMark, useUnsavedChanges } from '@/shared/layout';
import { createTenant } from '@/services/commons';
import { BP_FEATURES, PLANS, ROLES, TRANSCRIPTION_PROVIDERS } from '@/mocks/commons';
import { productName } from '../components/ProductChips';

const STEPS = [
  { id: 'basic', label: 'Basic info', description: 'Company and first admin' },
  { id: 'products', label: 'Products', description: 'What they bought' },
  { id: 'config', label: 'Configure', description: 'Limits and keys' },
  { id: 'review', label: 'Review', description: 'Check and create' },
];

const CATALOG = [
  { id: 'agentflow', pitch: 'AI agents that call and answer in 10 languages.', unit: 'Billed per call minute' },
  { id: 'dialflow', pitch: 'Browser dialer, auto-dial campaigns, live floor.', unit: 'Billed per agent seat' },
  { id: 'businesspulse', pitch: 'Every call scored and coached by AI.', unit: 'Billed per call scored' },
  { id: 'ultrachat', pitch: 'WhatsApp inbox, campaigns and AI bot.', unit: 'Prepaid wallet in ₹' },
  { id: 'insights', pitch: 'Ask questions across every product.', unit: 'Included in Growth and up' },
];

const PLAN_LIMITS = { Starter: 15, Growth: 60, Enterprise: 200 };

const INITIAL = {
  company: '',
  industry: 'Real estate',
  city: '',
  adminName: '',
  email: '',
  phone: '',
  role: 'Admin',
  plan: 'Growth',
  maxUsers: 60,
  products: [],
  agentflow: { minutes: 10000, sipLines: 2, fishKey: '' },
  dialflow: { maxAgents: 25, sipLines: 2 },
  businesspulse: { credits: 2000, features: { overview: true, qualityDelta: true, multiRange: false, ghostLeads: false, insightsChat: false }, transcription: TRANSCRIPTION_PROVIDERS[0] },
  ultrachat: { wabaId: '', phoneNumberId: '', token: '', aiOn: true, wallet: 5000 },
};

export default function TenantWizardPage() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(INITIAL);
  const [touched, setTouched] = useState({});
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);

  useUnsavedChanges(f !== INITIAL && !created, { message: 'The tenant hasn’t been created yet. What you entered will be lost.' });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const setP = (p, k) => (v) => setF((x) => ({ ...x, [p]: { ...x[p], [k]: v?.target ? v.target.value : v } }));

  const errors = useMemo(
    () => [
      {
        company: !f.company.trim() && 'Enter the company name',
        adminName: !f.adminName.trim() && 'Enter the admin’s name',
        email: !/\S+@\S+\.\S+/.test(f.email) && 'Enter a valid work email',
      },
      { products: !f.products.length && 'Pick at least one product' },
      {
        minutes: f.products.includes('agentflow') && !(Number(f.agentflow.minutes) > 0) && 'Minutes must be above 0',
        maxAgents: f.products.includes('dialflow') && !(Number(f.dialflow.maxAgents) > 0) && 'At least 1 agent',
        credits: f.products.includes('businesspulse') && !(Number(f.businesspulse.credits) > 0) && 'Credits must be above 0',
      },
      {},
    ],
    [f],
  );
  const err = (k) => touched[step] && errors[step][k];
  const next = () => {
    setTouched((t) => ({ ...t, [step]: true }));
    if (Object.values(errors[step]).some(Boolean)) return;
    setStep((s) => s + 1);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const create = async () => {
    setCreating(true);
    const res = await createTenant(f);
    setCreating(false);
    setCreated(res);
  };

  if (created) return <SuccessScreen f={f} result={created} onAnother={() => (setF(INITIAL), setStep(0), setTouched({}), setCreated(null))} />;

  return (
    <Page className="max-w-[1180px]">
      <PageHeader breadcrumbs={[{ label: 'Tenants', to: '/admin/tenants' }, { label: 'Create tenant' }]} title="Create tenant" description="Set up the company, its first admin and the products they bought. Takes about 2 minutes." />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <Card className="sticky top-6 p-3">
            <Stepper steps={STEPS} current={step} onStepClick={setStep} orientation="vertical" />
            {f.products.length > 0 && (
              <div className="mt-2 border-t border-line px-3 pt-3">
                <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">Selected</div>
                <div className="flex flex-wrap gap-1.5">
                  {f.products.map((p) => (
                    <ProductMark key={p} id={p} size="xs" />
                  ))}
                </div>
              </div>
            )}
          </Card>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <Stepper steps={STEPS} current={step} onStepClick={setStep} className="lg:hidden" />

          <Card className="animate-rise p-6" key={step}>
            <div className="mb-6">
              <div className="text-xs font-semibold text-ink-faint">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="mt-0.5 text-xl font-extrabold">{['Who is the customer?', 'Which products did they buy?', 'Configure each product', 'Review and create'][step]}</h2>
            </div>

            {step === 0 && (
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company name" required error={err('company')} className="sm:col-span-2">
                    <Input value={f.company} onChange={set('company')} placeholder="RR Parko Realty Pvt Ltd" autoFocus />
                  </Field>
                  <Field label="Industry">
                    <Select value={f.industry} onChange={set('industry')} options={['Real estate', 'Lending', 'Insurance', 'Education', 'Healthcare', 'Automotive', 'Retail', 'E-commerce', 'Travel', 'Other']} />
                  </Field>
                  <Field label="City" optional>
                    <Input value={f.city} onChange={set('city')} placeholder="Pune" />
                  </Field>
                </div>
                <div className="border-t border-line pt-6">
                  <h3 className="mb-4 text-sm font-bold">First admin login</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" required error={err('adminName')}>
                      <Input value={f.adminName} onChange={set('adminName')} placeholder="Riya Malhotra" />
                    </Field>
                    <Field label="Work email" required error={err('email')} hint="Login details go here.">
                      <Input type="email" value={f.email} onChange={set('email')} placeholder="riya@rrparko.in" />
                    </Field>
                    <Field label="Mobile" optional>
                      <Input value={f.phone} onChange={set('phone')} placeholder="98765 43210" />
                    </Field>
                    <Field label="Role">
                      <Select value={f.role} onChange={set('role')} options={ROLES} />
                    </Field>
                  </div>
                </div>
                <div className="border-t border-line pt-6">
                  <h3 className="mb-4 text-sm font-bold">Plan and limits</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Plan">
                      <Segmented
                        value={f.plan}
                        onChange={(v) => setF((x) => ({ ...x, plan: v, maxUsers: PLAN_LIMITS[v] }))}
                        options={PLANS}
                      />
                    </Field>
                    <Field label="Max users" hint={`Default for ${f.plan}: ${PLAN_LIMITS[f.plan]}`}>
                      <Input type="number" value={f.maxUsers} onChange={set('maxUsers')} />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {CATALOG.map((p) => {
                    const on = f.products.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-product={p.id}
                        onClick={() => set('products')(on ? f.products.filter((x) => x !== p.id) : [...f.products, p.id])}
                        className={cn(
                          'relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition',
                          on ? 'border-brand bg-brand/5 ring-4 ring-brand/10' : 'border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card',
                        )}
                      >
                        <span className={cn('absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition', on ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong')}>
                          {on && <Check size={11} weight="bold" />}
                        </span>
                        <ProductMark id={p.id} size="md" />
                        <span>
                          <span className="block text-[15px] font-bold text-ink">{productName(p.id)}</span>
                          <span className="mt-0.5 block text-[13px] text-ink-muted">{p.pitch}</span>
                        </span>
                        <span className="mt-auto text-2xs font-medium text-ink-faint">{p.unit}</span>
                      </button>
                    );
                  })}
                </div>
                {err('products') && <p className="text-xs text-danger">{err('products')}</p>}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                {f.products.filter((p) => p !== 'insights').length === 0 && <Callout tone="info">Insights needs no setup. Continue to review.</Callout>}
                {f.products.includes('agentflow') && (
                  <ConfigBlock id="agentflow" note="Credits are call minutes.">
                    <Field label="Call minutes" required error={err('minutes')}>
                      <Input type="number" value={f.agentflow.minutes} onChange={setP('agentflow', 'minutes')} suffix="min" />
                    </Field>
                    <Field label="SIP lines" hint="You can add line details later.">
                      <Input type="number" value={f.agentflow.sipLines} onChange={setP('agentflow', 'sipLines')} />
                    </Field>
                    <Field label="Fish Audio API key" optional hint="Platform key is used when empty." className="sm:col-span-2">
                      <SecretInput value={f.agentflow.fishKey} onChange={setP('agentflow', 'fishKey')} placeholder="Leave empty to use the platform key" />
                    </Field>
                  </ConfigBlock>
                )}
                {f.products.includes('dialflow') && (
                  <ConfigBlock id="dialflow" note="Seats are billed monthly.">
                    <Field label="Max agents" required error={err('maxAgents')}>
                      <Input type="number" value={f.dialflow.maxAgents} onChange={setP('dialflow', 'maxAgents')} />
                    </Field>
                    <Field label="SIP lines">
                      <Input type="number" value={f.dialflow.sipLines} onChange={setP('dialflow', 'sipLines')} />
                    </Field>
                  </ConfigBlock>
                )}
                {f.products.includes('businesspulse') && (
                  <ConfigBlock id="businesspulse" note="1 credit = 1 call scored. Resets monthly.">
                    <Field label="Monthly credits" required error={err('credits')}>
                      <Input type="number" value={f.businesspulse.credits} onChange={setP('businesspulse', 'credits')} />
                    </Field>
                    <Field label="Transcription">
                      <Select value={f.businesspulse.transcription} onChange={setP('businesspulse', 'transcription')} options={TRANSCRIPTION_PROVIDERS} />
                    </Field>
                    <Field label="Features" className="sm:col-span-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {BP_FEATURES.map((ft) => (
                          <Checkbox
                            key={ft.key}
                            checked={f.businesspulse.features[ft.key]}
                            onChange={(v) => setP('businesspulse', 'features')({ ...f.businesspulse.features, [ft.key]: v })}
                            label={ft.label}
                            description={ft.description}
                            className="rounded-xl border border-line p-3"
                          />
                        ))}
                      </div>
                    </Field>
                  </ConfigBlock>
                )}
                {f.products.includes('ultrachat') && (
                  <ConfigBlock id="ultrachat" note="Get these from Meta Business Manager. You can add them later.">
                    <Field label="WhatsApp Business account ID" optional>
                      <Input value={f.ultrachat.wabaId} onChange={setP('ultrachat', 'wabaId')} placeholder="1029384756" className="font-mono" />
                    </Field>
                    <Field label="Phone number ID" optional>
                      <Input value={f.ultrachat.phoneNumberId} onChange={setP('ultrachat', 'phoneNumberId')} placeholder="1122334455" className="font-mono" />
                    </Field>
                    <Field label="Access token" optional className="sm:col-span-2">
                      <SecretInput value={f.ultrachat.token} onChange={setP('ultrachat', 'token')} placeholder="EAAG…" />
                    </Field>
                    <Field label="Opening wallet" hint="Prepaid. Messages pause at ₹0.">
                      <Input type="number" value={f.ultrachat.wallet} onChange={setP('ultrachat', 'wallet')} suffix="₹" />
                    </Field>
                    <Field label="AI replies">
                      <div className="flex h-10 items-center">
                        <Switch checked={f.ultrachat.aiOn} onChange={setP('ultrachat', 'aiOn')} label={f.ultrachat.aiOn ? 'On' : 'Off'} />
                      </div>
                    </Field>
                  </ConfigBlock>
                )}
              </div>
            )}

            {step === 3 && <Review f={f} onEdit={setStep} />}
          </Card>

          <div className="flex items-center justify-between gap-2">
            {step === 0 ? (
              <Button as={Link} to="/admin/tenants" variant="ghost">
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button variant="primary" iconRight={ArrowRight} onClick={next}>
                Continue
              </Button>
            ) : (
              <Button variant="primary" size="lg" icon={Plus} loading={creating} onClick={create}>
                Create tenant
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}

function ConfigBlock({ id, note, children }) {
  return (
    <section className="rounded-2xl border border-line">
      <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
        <ProductMark id={id} size="sm" />
        <div className="min-w-0">
          <div className="text-sm font-bold">{productName(id)}</div>
          <div className="text-2xs text-ink-muted">{note}</div>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReviewSection({ title, step, onEdit, children }) {
  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <Button size="xs" variant="ghost" icon={PencilSimple} onClick={() => onEdit(step)}>
          Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

const Row = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-4 py-1 text-[13px]">
    <span className="text-ink-muted">{k}</span>
    <span className="min-w-0 truncate text-right font-medium text-ink">{v}</span>
  </div>
);

function Review({ f, onEdit }) {
  const mask = (s) => (s ? `•••• ${s.slice(-4)}` : 'Not set');
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <ReviewSection title="Company" step={0} onEdit={onEdit}>
          <Row k="Name" v={f.company} />
          <Row k="Industry" v={`${f.industry}${f.city ? ` · ${f.city}` : ''}`} />
          <Row k="Plan" v={<Badge tone="solid">{f.plan}</Badge>} />
          <Row k="Max users" v={fmtNumber(Number(f.maxUsers))} />
        </ReviewSection>
        <ReviewSection title="First admin" step={0} onEdit={onEdit}>
          <Row k="Name" v={f.adminName} />
          <Row k="Email" v={f.email} />
          <Row k="Mobile" v={f.phone || '—'} />
          <Row k="Role" v={f.role} />
        </ReviewSection>
      </div>
      <ReviewSection title="Products" step={2} onEdit={onEdit}>
        <div className="grid gap-3 md:grid-cols-2">
          {f.products.map((p) => (
            <div key={p} className="flex gap-3 rounded-xl bg-surface-2 p-3">
              <ProductMark id={p} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{productName(p)}</div>
                {p === 'agentflow' && (
                  <>
                    <Row k="Minutes" v={fmtNumber(Number(f.agentflow.minutes))} />
                    <Row k="SIP lines" v={f.agentflow.sipLines} />
                    <Row k="Fish API key" v={f.agentflow.fishKey ? mask(f.agentflow.fishKey) : 'Platform key'} />
                  </>
                )}
                {p === 'dialflow' && (
                  <>
                    <Row k="Max agents" v={f.dialflow.maxAgents} />
                    <Row k="SIP lines" v={f.dialflow.sipLines} />
                  </>
                )}
                {p === 'businesspulse' && (
                  <>
                    <Row k="Monthly credits" v={fmtNumber(Number(f.businesspulse.credits))} />
                    <Row k="Features" v={BP_FEATURES.filter((x) => f.businesspulse.features[x.key]).length + ' of ' + BP_FEATURES.length} />
                    <Row k="Transcription" v={f.businesspulse.transcription} />
                  </>
                )}
                {p === 'ultrachat' && (
                  <>
                    <Row k="Opening wallet" v={`₹${fmtNumber(Number(f.ultrachat.wallet))}`} />
                    <Row k="AI replies" v={f.ultrachat.aiOn ? 'On' : 'Off'} />
                    <Row k="Access token" v={mask(f.ultrachat.token)} />
                  </>
                )}
                {p === 'insights' && <Row k="Setup" v="None needed" />}
              </div>
            </div>
          ))}
        </div>
      </ReviewSection>
      <Callout tone="info">The admin gets login details by email after you create the tenant. You can also copy them on the next screen.</Callout>
    </div>
  );
}

function SuccessScreen({ f, result, onAnother }) {
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const loginUrl = 'https://app.qualiabits.com/login';
  const shareText = `Hi ${f.adminName.split(' ')[0]}, your Qualia account is ready.\nLogin: ${loginUrl}\nEmail: ${f.email}\nTemporary password: ${result.password}\nYou'll be asked to change it on first sign-in.`;
  return (
    <Page className="max-w-[760px]">
      <div className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-surface p-8 text-center shadow-card sm:p-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[480px] -translate-x-1/2 rounded-full opacity-20 blur-3xl grad-bg" />
        <span className="relative mx-auto flex h-16 w-16 animate-rise items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle size={36} weight="fill" />
        </span>
        <h1 className="relative mt-4 text-2xl font-extrabold">{f.company} is live</h1>
        <p className="relative mx-auto mt-1 max-w-md text-sm text-ink-muted">
          {f.products.length} product{f.products.length > 1 ? 's' : ''} turned on. Share the login details with {f.adminName}.
        </p>
        <div className="relative mt-4 flex justify-center gap-1.5">
          {f.products.map((p) => (
            <ProductMark key={p} id={p} size="sm" />
          ))}
        </div>

        <div className="relative mt-8 flex flex-col gap-3 text-left">
          <Field label="Login URL">
            <CopyField value={loginUrl} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <CopyField value={f.email} />
            </Field>
            <Field label="Temporary password" hint="Must be changed on first sign-in.">
              <CopyField value={result.password} />
            </Field>
          </div>
          <Field label="Message to share">
            <div className="relative">
              <pre className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-3 pr-24 font-sans text-[13px] leading-relaxed text-ink-2">{shareText}</pre>
              <Button
                size="xs"
                className="absolute right-2 top-2"
                onClick={() => {
                  navigator.clipboard?.writeText(shareText);
                  toast('Message copied');
                }}
              >
                Copy all
              </Button>
            </div>
          </Field>
        </div>

        <div className="relative mt-8 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button variant="ghost" icon={Plus} onClick={onAnother}>
            Create another
          </Button>
          <Button as={Link} to="/admin/tenants">
            All tenants
          </Button>
          <Button
            variant="primary"
            icon={sent ? Check : EnvelopeSimple}
            disabled={sent}
            onClick={() => {
              setSent(true);
              toast({ title: 'Welcome email sent', description: f.email, tone: 'success' });
            }}
          >
            {sent ? 'Welcome email sent' : 'Send welcome email'}
          </Button>
        </div>
      </div>
    </Page>
  );
}
