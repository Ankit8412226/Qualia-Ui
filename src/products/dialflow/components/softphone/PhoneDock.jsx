import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareIn, Phone } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { PhoneGlow, toneRgb } from './phoneUi';
import { Softphone, phoneTone } from './Softphone';

export const PIP_WIDTH = 360;
export const PIP_HEIGHT = 640;

export const pipSupported = () => typeof window !== 'undefined' && typeof window.documentPictureInPicture?.requestWindow === 'function';

/** The PiP window is a separate document: give it the page's styles and a host node to portal into. */
function preparePipWindow(win) {
  const doc = win.document;
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => doc.head.appendChild(node.cloneNode(true)));
  doc.title = 'DialFlow phone';
  doc.documentElement.style.colorScheme = 'dark';
  doc.body.style.margin = '0';
  doc.body.className = 'bg-night';
  const host = doc.createElement('div');
  host.id = 'dialflow-softphone';
  doc.body.appendChild(host);
  return host;
}

/**
 * Where the softphone lives: 'docked' in the workspace, 'pip' in an always-on-top Document
 * Picture-in-Picture window (Chrome / Edge), or 'float', a draggable panel over the page when the
 * browser has no PiP. Closing the PiP window docks the phone again.
 */
export function usePhonePopout({ initial = 'docked' } = {}) {
  const [mode, setMode] = useState(initial);
  const [pip, setPip] = useState(null); // { win, host }
  const pipRef = useRef(null);
  pipRef.current = pip;

  const popOut = useCallback(async () => {
    if (pipSupported()) {
      try {
        const win = await window.documentPictureInPicture.requestWindow({ width: PIP_WIDTH, height: PIP_HEIGHT });
        const host = preparePipWindow(win);
        win.addEventListener('pagehide', () => {
          setPip(null);
          setMode('docked');
        });
        setPip({ win, host });
        setMode('pip');
        return;
      } catch {
        /* refused (no user gesture, already open elsewhere): fall back to the floating panel */
      }
    }
    setMode('float');
  }, []);

  const dock = useCallback(() => {
    pipRef.current?.win?.close();
    setPip(null);
    setMode('docked');
    window.focus();
  }, []);

  useEffect(() => () => pipRef.current?.win?.close(), []);

  return { mode, pipWindow: pip?.win || null, pipHost: pip?.host || null, popOut, dock };
}

/** The right-hand column of the workspace: the docked phone, or a slim placeholder while it is popped out. */
export function PhoneDock({ popout, phone }) {
  const { mode, pipHost, popOut, dock } = popout;
  if (mode === 'docked') {
    return (
      <aside aria-label="Softphone" className="h-[680px] w-full shrink-0 lg:h-auto lg:w-[340px] xl:w-[356px]">
        <Softphone {...phone} mode="docked" onPopOut={popOut} />
      </aside>
    );
  }
  return (
    <>
      <PoppedOutRail phone={phone} onDock={dock} />
      {mode === 'pip' && pipHost && createPortal(<Softphone {...phone} mode="pip" onDock={dock} />, pipHost)}
      {mode === 'float' && createPortal(<FloatingPhone phone={phone} onDock={dock} />, document.body)}
    </>
  );
}

function PoppedOutRail({ phone, onDock }) {
  const tone = phoneTone(phone.phase, phone.campaign, phone.held);
  return (
    <aside aria-label="Softphone (popped out)" className="relative isolate flex w-full shrink-0 items-center gap-3 overflow-hidden rounded-[22px] bg-night px-4 py-3 text-white lg:w-[84px] lg:flex-col lg:px-2 lg:py-5">
      <PhoneGlow tone={tone} pulse={phone.phase === 'ringing'} />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[.07]">
        <Phone size={20} weight="duotone" />
        <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-night" style={{ background: toneRgb(tone), boxShadow: `0 0 8px ${toneRgb(tone, 0.9)}` }} />
      </span>
      <p className="relative flex-1 text-[12px] leading-snug text-white/70 lg:flex-none lg:text-center lg:text-[11px]">
        Phone is
        <br className="hidden lg:block" /> popped out
      </p>
      <button
        type="button"
        onClick={onDock}
        className="relative inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.09] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/[.16] active:scale-95 lg:flex-col lg:gap-1 lg:rounded-2xl lg:px-2 lg:py-2.5"
      >
        <ArrowSquareIn size={16} weight="bold" />
        Bring back
      </button>
    </aside>
  );
}

const FLOAT_W = 340;
const MARGIN = 20;

/** Fallback when the browser has no Document Picture-in-Picture: a phone floating over the page, drag it by its top bar. */
function FloatingPhone({ phone, onDock }) {
  const height = () => Math.min(PIP_HEIGHT, window.innerHeight - MARGIN * 2);
  const [h, setH] = useState(height);
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - FLOAT_W - MARGIN, y: window.innerHeight - height() - MARGIN }));
  const drag = useRef(null);

  useEffect(() => {
    const onResize = () => {
      setH(height());
      setPos((p) => clamp(p, height()));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const clamp = (p, hh = h) => ({ x: Math.min(Math.max(8, p.x), window.innerWidth - FLOAT_W - 8), y: Math.min(Math.max(8, p.y), window.innerHeight - hh - 8) });

  const dragHandle = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!drag.current) return;
      setPos(clamp({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }));
    },
    onPointerUp: () => {
      drag.current = null;
    },
    style: { touchAction: 'none' },
  };

  return (
    <div role="dialog" aria-label="Softphone" className={cn('fixed z-[60] animate-rise')} style={{ left: pos.x, top: pos.y, width: FLOAT_W, height: h }}>
      <Softphone {...phone} mode="float" onDock={onDock} dragHandle={dragHandle} />
    </div>
  );
}
