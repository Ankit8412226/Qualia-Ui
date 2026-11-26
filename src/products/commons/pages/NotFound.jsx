import { Link } from 'react-router-dom';
import { Compass } from '@phosphor-icons/react';
import { Button, EmptyState } from '@/design-system';
import { useDocumentTitle } from '@/lib/hooks';
import { useSession } from '@/app/providers/SessionProvider';
import { QualiaLogo } from '@/shared/layout';

/** Top-level 404 (outside any product). Sends people to the right start: Home, the console, or login. */
export default function NotFound() {
  const { signedIn, role } = useSession();
  useDocumentTitle('Page not found');
  const home = !signedIn ? ['/login', 'Go to sign in'] : role === 'superadmin' ? ['/admin', 'Back to the console'] : ['/home', 'Back to your apps'];
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex h-16 items-center border-b border-line bg-surface px-4 sm:px-8">
        <Link to={home[0]} aria-label="Qualia home">
          <QualiaLogo />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={Compass}
          title="This page doesn’t exist"
          description="The link may be old, or the page moved to another app."
          action={
            <Button as={Link} to={home[0]} variant="primary">
              {home[1]}
            </Button>
          }
        />
      </div>
    </div>
  );
}
