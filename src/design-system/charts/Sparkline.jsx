import { useId } from 'react';
import { cn } from '@/lib/cn';

/** Tiny trend line for stat cards. Colour: brand, or success/danger when the last point is up/down and `trend` is set. */
export function Sparkline({ data = [], className, trend, inverse }) {
  const id = useId();
  if (data.length < 2) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  const good = inverse ? !up : up;
  const color = trend ? (good ? 'rgb(var(--success))' : 'rgb(var(--danger))') : 'rgb(var(--brand))';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.25 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} style={{ fill: `url(#${id})` }} />
      <path d={d} style={{ fill: 'none', stroke: color, strokeWidth: 2, vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round', strokeLinecap: 'round' }} />
    </svg>
  );
}
