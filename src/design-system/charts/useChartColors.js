import { useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '@/app/providers/ThemeProvider';

const NAMES = ['brand', 'series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6', 'line', 'muted', 'faint', 'surface', 'ink', 'success', 'warning', 'danger', 'info', 'surface-3', 'line-strong'];

const toRgb = (triplet) => `rgb(${triplet.trim().split(/\s+/).join(',')})`;

/**
 * SVG attributes can't read CSS variables reliably, so charts resolve the tokens to real colours
 * from the element they sit in (so the product's brand colour applies) and again when the theme flips.
 */
export function useChartColors() {
  const ref = useRef(null);
  const { theme } = useTheme();
  const [colors, setColors] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current || document.documentElement;
    const cs = getComputedStyle(el);
    const out = {};
    NAMES.forEach((n) => {
      const v = cs.getPropertyValue(`--${n}`);
      out[n] = v ? toRgb(v) : '#888';
    });
    out.neutral = out['line-strong'];
    out.series = [out['series-1'], out['series-2'], out['series-3'], out['series-4'], out['series-5'], out['series-6']];
    setColors(out);
  }, [theme]);
  return [ref, colors];
}
