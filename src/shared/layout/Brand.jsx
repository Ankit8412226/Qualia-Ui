import { cn } from '@/lib/cn';
import { productById } from '@/app/products';

/** Qualia Bits wordmark (logo from the landing page). */
export function QualiaLogo({ className, compact, size = 32 }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="/brand/logo-mark-footer-light.png" alt="" width={size} height={size} className="rounded-[9px] dark:hidden" style={{ width: size, height: size }} />
      <img src="/brand/logo-mark-dark.svg" alt="" width={size} height={size} className="hidden rounded-[9px] dark:block" style={{ width: size, height: size }} />
      {!compact && <span className="font-display text-[15px] font-extrabold tracking-[.04em] text-ink">QUALIA BITS</span>}
    </span>
  );
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #FF6A3D, #FF9A3D)';
// Every product uses the same brand gradient; the icon tells them apart.
const GRADIENTS = { agentflow: BRAND_GRADIENT, dialflow: BRAND_GRADIENT, businesspulse: BRAND_GRADIENT, ultrachat: BRAND_GRADIENT, insights: BRAND_GRADIENT, commons: BRAND_GRADIENT };

/** Product icon on its landing-page gradient. Same mark in the launcher, switcher and sidebar. */
export function ProductMark({ id, size = 'md', className }) {
  const p = productById(id);
  if (!p) return null;
  const Icon = p.icon;
  const dims = { xs: ['h-6 w-6 rounded-md', 13], sm: ['h-8 w-8 rounded-lg', 16], md: ['h-10 w-10 rounded-xl', 20], lg: ['h-14 w-14 rounded-2xl', 28] }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgb(255_255_255/.25)]', dims[0], className)} style={{ background: GRADIENTS[id] }}>
      <Icon size={dims[1]} weight="bold" />
    </span>
  );
}
