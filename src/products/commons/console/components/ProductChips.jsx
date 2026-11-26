import { cn } from '@/lib/cn';
import { Tooltip } from '@/design-system';
import { ProductMark } from '@/shared/layout';
import { PRODUCT_NAMES } from '@/mocks/commons';

export const productName = (id) => PRODUCT_NAMES[id] || (id === 'commons' ? 'Admin Console' : id);

/** Text colour class per product (static strings so Tailwind keeps them). */
export const PRODUCT_TEXT = {
  agentflow: 'text-product-agentflow',
  dialflow: 'text-product-dialflow',
  businesspulse: 'text-product-businesspulse',
  ultrachat: 'text-product-ultrachat',
  insights: 'text-product-insights',
  commons: 'text-ink',
};
export const PRODUCT_BG_SOFT = {
  agentflow: 'bg-product-agentflow/10',
  dialflow: 'bg-product-dialflow/10',
  businesspulse: 'bg-product-businesspulse/10',
  ultrachat: 'bg-product-ultrachat/10',
  insights: 'bg-product-insights/10',
  commons: 'bg-surface-3',
};
export const PRODUCT_BAR = {
  agentflow: 'bg-product-agentflow',
  dialflow: 'bg-product-dialflow',
  businesspulse: 'bg-product-businesspulse',
  ultrachat: 'bg-product-ultrachat',
  insights: 'bg-product-insights',
};

/** Row of product marks with a tooltip each. Used in tenant tables. */
export function ProductChips({ ids = [], size = 'xs', className }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {ids.map((id) => (
        <Tooltip key={id} content={productName(id)}>
          <ProductMark id={id} size={size} />
        </Tooltip>
      ))}
    </span>
  );
}

/** Mark + product name, as a soft pill. */
export function ProductPill({ id, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-semibold', PRODUCT_BG_SOFT[id], PRODUCT_TEXT[id], className)}>
      <ProductMark id={id} size="xs" className="h-5 w-5 rounded-full" />
      {productName(id)}
    </span>
  );
}
