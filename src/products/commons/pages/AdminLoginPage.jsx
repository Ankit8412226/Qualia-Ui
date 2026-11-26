import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/lib/hooks';
import { LockSimple, ShieldCheck } from '@phosphor-icons/react';
import { Badge, Button, Card, Field, Input } from '@/design-system';
import { useSession } from '@/app/providers/SessionProvider';
import { AuthLayout } from './AuthLayout';

/** Internal console login, for the Qualia Bits team only. Separate from the tenant login on purpose. */
export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const { signIn, signedIn, role } = useSession();
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  useDocumentTitle('Sign in', 'Admin Console');
  const enter = () => {
    setLoading(true);
    setTimeout(() => {
      signIn('superadmin');
      navigate(from?.startsWith('/admin') && !from.startsWith('/admin/login') ? from : '/admin', { replace: true });
    }, 500);
  };
  if (signedIn && role === 'superadmin') return <Navigate to="/admin" replace />;

  return (
    <AuthLayout badge={<Badge icon={ShieldCheck}>Internal</Badge>} footer="Access is limited to qualiabits.com accounts and logged.">
      <h1 className="text-2xl font-bold">Admin Console</h1>
      <p className="mt-1 text-sm text-ink-muted">For the Qualia Bits team. Customers sign in at /login.</p>
      <Card className="mt-6 p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
        >
          <Field label="Qualia email">
            <Input type="email" placeholder="name@qualiabits.com" />
          </Field>
          <Field label="Password">
            <Input icon={LockSimple} type="password" placeholder="••••••••" />
          </Field>
          <Field label="Authenticator code">
            <Input inputMode="numeric" placeholder="6-digit code" />
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-xs text-ink-muted">
        No backend yet ·{' '}
        <button onClick={enter} className="font-medium text-ink-2 underline-offset-4 hover:underline">
          preview the console
        </button>
      </p>
    </AuthLayout>
  );
}
