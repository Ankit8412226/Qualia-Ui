import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/lib/hooks';
import { ArrowRight, Envelope, IdentificationBadge, LockSimple } from '@phosphor-icons/react';
import { Button, Checkbox, Field, Input, Segmented } from '@/design-system';
import { useSession } from '@/app/providers/SessionProvider';
import { PRODUCTS } from '@/app/products';
import { ProductMark, QualiaLogo } from '@/shared/layout';

const DEMO = [
  { role: 'admin', label: 'Tenant admin' },
  { role: 'agent', label: 'Agent' },
];

/** One login for every product. Email for admins, Agent ID for agents. UI only: any input signs in. */
export default function LoginPage() {
  const [mode, setMode] = useState('email');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const { signIn, signedIn, role } = useSession();
  const navigate = useNavigate();
  // A deep link that needed a login (e.g. a shared campaign URL) opens after sign-in; otherwise Home.
  const target = '/home'; // product decision: everyone lands on Home after login
  useDocumentTitle('Sign in');

  const enter = (role) => {
    setLoading(true);
    setTimeout(() => {
      signIn(role);
      navigate(target, { replace: true });
    }, 600);
  };

  const submit = () => {
    const e = {};
    if (!id.trim()) e.id = mode === 'agent' ? 'Enter your Agent ID.' : 'Enter your work email.';
    else if (mode === 'email' && !/^\S+@\S+\.\S+$/.test(id.trim())) e.id = 'That email doesn’t look right. Use name@company.com.';
    if (!password) e.password = 'Enter your password.';
    setErrors(e);
    if (!Object.keys(e).length) enter(mode === 'agent' ? 'agent' : 'admin');
  };

  // Already signed in: go straight to Home (or the console for the Qualia team).
  if (signedIn) return <Navigate to={role === 'superadmin' ? '/admin' : target} replace />;

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.05fr_1fr]">
      {/* left: brand story */}
      <section className="relative hidden overflow-hidden bg-night p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#FF6A3D] opacity-30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[460px] w-[460px] rounded-full bg-[#FF6A3D] opacity-25 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-40 left-20 h-[300px] w-[300px] rounded-full bg-[#FF9A3D] opacity-25 blur-[100px]" />
        <div className="relative flex items-center gap-2.5">
          <img src="/brand/logo-mark-dark.svg" alt="" className="h-9 w-9 rounded-[10px]" />
          <span className="font-display text-[16px] font-extrabold tracking-[.04em]">QUALIA BITS</span>
        </div>
        <div className="relative mt-auto max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-[#FFB38A]">
            <span className="h-0.5 w-5 rounded bg-current" /> One login, every conversation
          </p>
          <h1 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-tight text-white">
            Every call and chat,
            <br />
            <span className="bg-[linear-gradient(100deg,#FFC9A8_0%,#FF9A3D_50%,#FF6A3D_100%)] bg-clip-text text-transparent">handled and understood.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">AI agents that call, a dialer for your team, WhatsApp at scale, and QA on every conversation.</p>
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {PRODUCTS.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3 backdrop-blur">
                <ProductMark id={p.id} size="sm" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-white/55">{p.tagline}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-xs text-white/40">© 2026 Qualia Bits · ISO 27001 · Data stays in India</p>
      </section>

      {/* right: form */}
      <section className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:hidden">
          <QualiaLogo />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h2 className="text-[28px] font-extrabold">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-muted">Sign in to open your Qualia apps.</p>

          <Segmented
            className="mt-8 w-full [&>button]:flex-1 [&>button]:justify-center"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setId('');
              setErrors({});
            }}
            options={[
              { value: 'email', label: 'Email', icon: Envelope },
              { value: 'agent', label: 'Agent ID', icon: IdentificationBadge },
            ]}
          />

          <form
            noValidate
            className="mt-6 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {mode === 'email' ? (
              <Field label="Work email" htmlFor="login-id" error={errors.id}>
                <Input id="login-id" icon={Envelope} type="email" placeholder="you@company.com" autoComplete="email" autoFocus value={id} onChange={(e) => setId(e.target.value)} aria-invalid={!!errors.id} />
              </Field>
            ) : (
              <Field label="Agent ID" hint="Your admin shares this with you." htmlFor="login-id" error={errors.id}>
                <Input id="login-id" icon={IdentificationBadge} placeholder="AG-1042" autoFocus value={id} onChange={(e) => setId(e.target.value)} aria-invalid={!!errors.id} />
              </Field>
            )}
            <Field
              htmlFor="login-password"
              error={errors.password}
              label="Password"
              action={
                <button type="button" className="text-xs font-medium text-ink-muted hover:text-ink">
                  Forgot password?
                </button>
              }
            >
              <Input id="login-password" icon={LockSimple} type={show ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
            </Field>
            <Checkbox label="Show password" checked={show} onChange={setShow} />
            <Button type="submit" variant="primary" size="lg" loading={loading} iconRight={ArrowRight} className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-10 rounded-2xl border border-dashed border-line p-4">
            <div className="text-xs font-semibold text-ink-2">Preview as</div>
            <p className="mt-0.5 text-xs text-ink-muted">This build has no backend yet. Pick a role to see its screens.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <button key={d.role} type="button" disabled={loading} onClick={() => enter(d.role)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-line-strong hover:bg-surface-2">
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-ink-faint">
          Need help? <a href="mailto:support@qualiabits.com" className="font-medium text-ink-2 hover:underline">support@qualiabits.com</a>
        </p>
      </section>
    </div>
  );
}
