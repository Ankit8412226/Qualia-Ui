import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Loads data from a service function. Every screen reads data this way, so swapping the mock
 * services for real API calls changes no screen code.
 *   const { data, loading, error, reload } = useQuery(() => voiceService.listCampaigns(filters), [filters]);
 */
/*
 * Failed loads report here so the app shell can show one "Couldn't load … Retry" banner for the page,
 * without every screen wiring its own error UI. Screens can still read `error` and render <ErrorState />.
 */
const QueryErrorsCtx = createContext(null);

export function QueryErrorsProvider({ children }) {
  const [errors, setErrors] = useState({}); // id -> { error, reload }
  const api = useMemo(
    () => ({
      report: (id, entry) => setErrors((e) => ({ ...e, [id]: entry })),
      clear: (id) => setErrors((e) => (id in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== id)) : e)),
      clearAll: () => setErrors({}),
    }),
    [],
  );
  const value = useMemo(() => ({ ...api, errors: Object.values(errors), retryAll: () => Object.values(errors).forEach((x) => x.reload()) }), [api, errors]);
  return createElement(QueryErrorsCtx.Provider, { value }, children);
}

export const useQueryErrors = () => useContext(QueryErrorsCtx);

let queryIds = 0;

/**
 * Loads data from a service function. Every screen reads data this way, so swapping the mock
 * services for real API calls changes no screen code.
 *   const { data, loading, error, reload } = useQuery(() => voiceService.listCampaigns(filters), [filters]);
 * Errors are also reported to the nearest QueryErrorsProvider (the app shell shows a retry banner).
 */
export function useQuery(fn, deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });
  const seq = useRef(0);
  const id = useRef(null);
  if (id.current == null) id.current = `q${++queryIds}`;
  const registry = useContext(QueryErrorsCtx);
  const registryRef = useRef(registry);
  registryRef.current = registry;
  const runRef = useRef(null);
  const run = useCallback(() => {
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => {
        if (n !== seq.current) return;
        setState({ data, loading: false, error: null });
        registryRef.current?.clear(id.current);
      })
      .catch((error) => {
        if (n !== seq.current) return;
        setState({ data: undefined, loading: false, error });
        registryRef.current?.report(id.current, { error, reload: () => runRef.current?.() });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  runRef.current = run;
  useEffect(run, [run]);
  useEffect(() => () => registryRef.current?.clear(id.current), []);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })) };
}

/** Sets the browser tab title: useDocumentTitle('Campaigns', 'Agent Flow') → "Campaigns · Agent Flow · Qualia". */
export function useDocumentTitle(...parts) {
  const named = parts.filter(Boolean);
  const title = named.length ? [...named, 'Qualia'].join(' · ') : null; // nothing to name: leave the title alone
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}

/** Re-render every `ms` (live clocks, "updated 5 s ago"). */
export function useTick(ms = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/** useState that survives reloads; never throws if storage is blocked. */
export function usePersistentState(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage blocked */
    }
  }, [key, v]);
  return [v, setV];
}

/** Client-side search + filter helper for list screens. */
export function useFilteredRows(rows, { search, fields = [], filters = {} }) {
  const q = (search || '').trim().toLowerCase();
  return (rows || []).filter((r) => {
    if (q && !fields.some((f) => String(typeof f === 'function' ? f(r) : r[f] ?? '').toLowerCase().includes(q))) return false;
    return Object.entries(filters).every(([k, vals]) => !vals?.length || vals.includes(r[k]));
  });
}

/** Keyboard shortcut. combo like 'mod+k', 'alt+m'. */
export function useHotkey(combo, handler) {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+');
    const key = parts.pop();
    const onKey = (e) => {
      const mod = parts.includes('mod') ? e.metaKey || e.ctrlKey : true;
      const alt = parts.includes('alt') ? e.altKey : !e.altKey || parts.includes('mod');
      if (mod && alt && e.key.toLowerCase() === key) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler]);
}
