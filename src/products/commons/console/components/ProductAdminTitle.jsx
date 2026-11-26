import { ProductMark } from '@/shared/layout';

/** Page title with the product's mark, for the per-product admin pages (Agent Flow, DialFlow, Business Pulse, UltraChat). */
export function ProductAdminTitle({ id, children }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <ProductMark id={id} size="md" />
      <span className="truncate">{children}</span>
    </span>
  );
}
