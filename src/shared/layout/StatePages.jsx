import { Component } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LockKey, SquaresFour, WarningOctagon } from '@phosphor-icons/react';
import { Button, EmptyState } from '@/design-system';
import { productById } from '@/app/products';
import { ROLES, useSession } from '@/app/providers/SessionProvider';
import { usePageTitle } from './ShellContext';
import { QualiaLogo } from './Brand';

/**
 * Friendly full states shared by every product, so a wrong link never silently bounces:
 * NotFoundState (inside a product), NoAccess (role can't use a page or product), PageErrorBoundary.
 */

/** 404 inside a product: name the product and offer its overview plus Home. */
export function NotFoundState({ productId, homeTo, homeLabel, description }) {
  const product = productById(productId);
  usePageTitle('Page not found', productId);
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={Compass}
      title="This page doesn’t exist"
      description={description || `The link may be old, or the item was deleted. Pick a page from the sidebar or go back to ${product?.name || 'the overview'}.`}
      action={
        <Button as={Link} to={homeTo || product?.path || '/home'} variant="brand">
          {homeLabel || `Go to ${product?.name || 'overview'}`}
        </Button>
      }
      secondary={
        productId !== 'commons' && (
          <Button as={Link} to="/home" variant="secondary" icon={SquaresFour}>
            All apps
          </Button>
        )
      }
    />
  );
}

/**
 * The signed-in role can't open this page/product. `fullPage` when rendered outside the app shell.
 * `backTo`/`backLabel` name the best place to go instead (the product's overview by default).
 */
export function NoAccess({ productId, page, backTo, backLabel, fullPage }) {
  const { role } = useSession();
  const product = productById(productId);
  const what = page ? `“${page}”` : product?.name || 'this page';
  usePageTitle('No access', productId);
  const state = (
    <EmptyState
      className={fullPage ? '' : 'min-h-[60vh]'}
      icon={LockKey}
      title={`You don’t have access to ${what}`}
      description={`Your role (${ROLES[role]?.label || role}) can’t open ${page ? 'this page' : 'this app'}. Ask your admin if you need it.`}
      action={
        <Button as={Link} to={backTo || '/home'} variant="brand" icon={backTo ? ArrowLeft : SquaresFour}>
          {backLabel || 'Back to your apps'}
        </Button>
      }
      secondary={
        backTo && backTo !== '/home' ? (
          <Button as={Link} to="/home" variant="secondary" icon={SquaresFour}>
            All apps
          </Button>
        ) : null
      }
    />
  );
  if (!fullPage) return state;
  return (
    <div className="flex min-h-screen flex-col bg-canvas" data-product={productId}>
      <header className="flex h-16 items-center border-b border-line bg-surface px-4 sm:px-8">
        <Link to="/home" aria-label="Home">
          <QualiaLogo />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">{state}</div>
    </div>
  );
}

/** Catches a crash in one page so the shell (sidebar, top bar) keeps working. Reset by changing `resetKey`. */
export class PageErrorBoundary extends Component {
  state = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        className="min-h-[60vh]"
        icon={WarningOctagon}
        title="Something went wrong on this page"
        description="The rest of the app still works. Try again, or open another page from the sidebar."
        action={
          <Button variant="brand" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        }
        secondary={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      />
    );
  }
}
