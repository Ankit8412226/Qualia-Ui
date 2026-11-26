import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirm } from '@/design-system';

/**
 * Warn before leaving a long form with unsaved work: in-app navigation (sidebar, back button, links)
 * asks to confirm, and closing/reloading the tab shows the browser's prompt.
 *   useUnsavedChanges(dirty && !saved);
 * Call `allow()` from the returned object right before navigating away on purpose (e.g. after Save/Launch).
 */
export function useUnsavedChanges(when, { title = 'Leave without saving?', message = 'Your changes on this page will be lost.' } = {}) {
  const confirm = useConfirm();
  const bypass = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => when && !bypass.current && currentLocation.pathname !== nextLocation.pathname);

  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirm({ title, message, tone: 'danger', confirmLabel: 'Leave', cancelLabel: 'Keep editing' }).then((ok) => {
      const b = blockerRef.current;
      if (b.state !== 'blocked') return;
      if (ok) b.proceed();
      else b.reset();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  useEffect(() => {
    if (!when) return undefined;
    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [when]);

  return {
    allow: () => {
      bypass.current = true;
    },
  };
}
