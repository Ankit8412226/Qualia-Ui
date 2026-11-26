import { createContext, useContext, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CaretUpDown, Check, GearSix, LockSimple, TreeStructure } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { usePersistentState, useQuery } from '@/lib/hooks';
import { Badge, Popover } from '@/design-system';
import { useSession } from '@/app/providers/SessionProvider';
import { listProcesses } from '@/services/businesspulse';

/*
 * A "process" is a client project (e.g. RR Parko – Sales). Almost every Business Pulse screen is scoped to the
 * process picked in the sidebar. Pages read it with useProcess() and put `processId` in their useQuery deps.
 */
const Ctx = createContext(null);

export function ProcessProvider({ children }) {
  const { data: processes } = useQuery(() => listProcesses(), []);
  // ?process=<id> picks a process from a shared link; otherwise the last one used.
  const [processId, setProcessId] = usePersistentState('bp-process', 'proc_sales');
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('process');
    if (fromUrl) setProcessId(fromUrl);
  }, [setProcessId]);


  const value = useMemo(() => {
    const process = processes?.find((p) => p.id === processId) || processes?.[0] || null;
    return {
      processes: processes || [],
      process,
      processId: process?.id || processId,
      setProcessId,
      loading: !processes,
      hasFeature: (key) => !!process?.features?.includes(key),
    };
  }, [processes, processId, setProcessId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProcess = () => useContext(Ctx);

/** Name of the agent viewing the app when role = agent (their own data only). */
export function useViewer() {
  const { role, user } = useSession();
  return { isAgent: role === 'agent', name: user?.name, role };
}

/** Sidebar footer: the process every screen is scoped to. */
export function ProcessPicker() {
  const { processes, process, setProcessId } = useProcess();
  const { isAgent } = useViewer();
  return (
    <Popover
      block
      width={268}
      align="start"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn('flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-2.5 text-left transition hover:border-line-strong', open && 'ring-4 ring-brand/10')}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <TreeStructure size={16} weight="duotone" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-2xs font-semibold uppercase tracking-wider text-ink-faint">Process</span>
            <span className="block truncate text-[13px] font-semibold text-ink">{process?.name || 'Loading…'}</span>
          </span>
          <CaretUpDown size={14} className="shrink-0 text-ink-muted" />
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <div className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">Switch process</div>
          {processes.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProcessId(p.id);
                close();
              }}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-surface-3', p.id === process?.id && 'bg-surface-3')}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                <span className="flex items-center gap-1.5 text-2xs text-ink-muted">
                  {p.agentCount} agents · {p.callCount.toLocaleString('en-IN')} calls
                  {!p.enterprise && (
                    <span className="inline-flex items-center gap-0.5 text-ink-faint">
                      · <LockSimple size={10} weight="fill" /> Core plan
                    </span>
                  )}
                </span>
              </span>
              {p.id === process?.id && <Check size={14} weight="bold" className="shrink-0 text-brand" />}
            </button>
          ))}
          {!isAgent && (
            <>
              <div className="my-1 h-px bg-line" />
              <Link to="/businesspulse/processes" onClick={close} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-3 hover:text-ink">
                <GearSix size={15} /> Manage processes
              </Link>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}

/** Small "scoped to" chip for page headers. */
export function ProcessChip() {
  const { process } = useProcess();
  if (!process) return null;
  return (
    <Badge tone="brand" icon={TreeStructure}>
      {process.name}
    </Badge>
  );
}
