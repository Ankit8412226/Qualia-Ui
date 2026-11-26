import { Navigate, useLocation } from 'react-router-dom';
import { NoAccess } from '@/shared/layout/StatePages';
import { useSession } from './providers/SessionProvider';

/**
 * Tenant apps and the internal console are separate:
 * - `internal`: only the super admin (Qualia team); others go to /admin/login.
 * - otherwise: tenant roles only; a super admin is sent to the console.
 * Signed out → login, which brings the person back to this link afterwards (`state.from`).
 * Signed in but the role or plan can't use `product` → a friendly "no access" page, not a silent bounce.
 */
export function RequireSession({ roles, internal, product, children }) {
  const { signedIn, role, tenant } = useSession();
  const location = useLocation();
  const from = location.pathname + location.search;
  if (internal) {
    if (!signedIn || role !== 'superadmin') return <Navigate to="/admin/login" replace state={{ from }} />;
    return children;
  }
  if (!signedIn) return <Navigate to="/login" replace state={{ from }} />;
  if (role === 'superadmin') return <Navigate to="/admin" replace />;
  if ((roles && !roles.includes(role)) || (product && !tenant.products.includes(product))) return <NoAccess productId={product} fullPage />;
  return children;
}
