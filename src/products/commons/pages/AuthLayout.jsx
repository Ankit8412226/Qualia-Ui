import { QualiaLogo } from '@/shared/layout';

/** Shared frame for the tenant login and the internal console login. */
export function AuthLayout({ badge, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-16 items-center justify-between px-6 sm:px-10">
        <QualiaLogo size={28} />
        {badge}
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-ink-faint">{footer}</footer>
    </div>
  );
}
