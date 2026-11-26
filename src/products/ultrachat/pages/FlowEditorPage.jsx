import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, GearSix, CheckCircle, PlayCircle, Rocket, SealWarning, SquaresFour, DotsSixVertical } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { Button, Drawer, IconButton, Popover, Skeleton, StatusBadge, Tooltip, useConfirm, useToast } from '@/design-system';
import { Page, useUnsavedChanges } from '@/shared/layout';
import { getFlow } from '@/services/ultrachat';
import { FlowCanvas } from '../components/flow/FlowCanvas';
import { Inspector } from '../components/flow/Inspector';
import { FlowTester } from '../components/flow/FlowTester';
import { NODE_TYPES, PALETTE, TONE_CLASS, validate } from '../components/flow/nodes';

let uid = 100;

export default function FlowEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading } = useQuery(() => getFlow(id), [id]);
  const canvas = useRef(null);

  const [name, setName] = useState('');
  const [status, setStatus] = useState('Draft');
  const [settings, setSettings] = useState({ keywords: [], fallback: 'Pass to AI bot', cooldown: '24 hours', runs: 0, completion: 0 });
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [testing, setTesting] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty, { message: 'Your unsaved changes to this flow will be lost.' });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.flow.name);
    setStatus(data.flow.status);
    setSettings((s) => ({ ...s, keywords: data.flow.trigger ? data.flow.trigger.split(',').map((k) => k.trim()) : [], runs: data.flow.runs, completion: data.flow.completion }));
    setNodes(data.graph.nodes);
    setEdges(data.graph.edges);
    requestAnimationFrame(() => canvas.current?.fit());
  }, [data]);

  const issues = useMemo(() => validate(nodes, edges), [nodes, edges]);
  const flagged = useMemo(() => new Set(issues.map((i) => i.nodeId).filter(Boolean)), [issues]);
  const selNode = selected?.kind === 'node' ? nodes.find((n) => n.id === selected.id) : null;

  const change = (fn) => {
    fn();
    setDirty(true);
  };

  const addNode = (type, x, y) => {
    const p = x == null ? canvas.current?.center() || { x: 400, y: 200 } : { x, y };
    const nid = `n${++uid}`;
    change(() => setNodes((all) => [...all, { id: nid, type, x: Math.round(p.x), y: Math.round(p.y), data: structuredClone(NODE_TYPES[type].data || {}) }]));
    setSelected({ kind: 'node', id: nid });
    setPaletteOpen(false);
  };

  const removeSelected = useCallback(() => {
    if (!selected) return;
    if (selected.kind === 'edge') change(() => setEdges((all) => all.filter((e) => e.id !== selected.id)));
    else {
      const n = nodes.find((x) => x.id === selected.id);
      if (!n || n.type === 'trigger') return;
      change(() => {
        setNodes((all) => all.filter((x) => x.id !== n.id));
        setEdges((all) => all.filter((e) => e.from !== n.id && e.to !== n.id));
      });
    }
    setSelected(null);
  }, [selected, nodes]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
      }
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeSelected]);

  const publish = async () => {
    if (issues.length) {
      setIssuesOpen(true);
      return toast({ tone: 'error', title: `Fix ${issues.length} issue${issues.length > 1 ? 's' : ''} before publishing` });
    }
    if (!(await confirm({ title: 'Publish this flow?', message: `New messages matching “${settings.keywords.join(', ')}” will start this flow right away.`, confirmLabel: 'Publish' }))) return;
    setStatus('Live');
    setDirty(false);
    toast({ title: `${name} is live`, description: 'Changes apply to new conversations.' });
  };

  if (loading || !data)
    return (
      <Page full className="flex flex-col">
        <div className="h-14 border-b border-line bg-surface" />
        <div className="flex flex-1 gap-4 p-6">
          <Skeleton className="h-full w-56" />
          <Skeleton className="h-full flex-1" />
        </div>
      </Page>
    );

  return (
    <Page full className="flex flex-col overflow-hidden">
      {/* top bar */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-4">
        <Tooltip content="All flows" side="bottom">
          <IconButton icon={ArrowLeft} label="Back to flows" onClick={() => navigate('/ultrachat/flows')} />
        </Tooltip>
        <IconButton icon={SquaresFour} label="Steps" className="lg:hidden" onClick={() => setPaletteOpen((o) => !o)} />
        <input
          value={name}
          onChange={(e) => change(() => setName(e.target.value))}
          aria-label="Flow name"
          className="h-9 min-w-0 max-w-[260px] flex-1 rounded-lg bg-transparent px-2 text-[15px] font-bold text-ink outline-none hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-brand/20"
        />
        <StatusBadge status={status} />
        {dirty && <span className="hidden text-xs text-ink-faint md:inline">Unsaved changes</span>}
        <div className="ml-auto flex items-center gap-2">
          <Popover
            align="end"
            width={340}
            open={issuesOpen}
            onOpenChange={setIssuesOpen}
            trigger={({ toggle }) => (
              <Button variant="secondary" size="sm" icon={issues.length ? SealWarning : CheckCircle} onClick={toggle} className={issues.length ? 'text-warning' : 'text-success'}>
                <span className="hidden sm:inline">{issues.length ? `${issues.length} issue${issues.length > 1 ? 's' : ''}` : 'Valid'}</span>
              </Button>
            )}
          >
            {({ close }) => (
              <div className="p-1.5">
                <div className="mb-1 px-1.5 text-sm font-bold">{issues.length ? 'Fix before publishing' : 'Everything is connected'}</div>
                {issues.length === 0 && <p className="px-1.5 pb-1 text-xs text-ink-muted">No problems found. Try it in the phone preview, then publish.</p>}
                <ul className="max-h-72 overflow-y-auto">
                  {issues.map((it, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          if (it.nodeId) {
                            setSelected({ kind: 'node', id: it.nodeId });
                            setInspectorOpen(true);
                          }
                          close();
                        }}
                        className="flex w-full items-start gap-2 rounded-xl px-1.5 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-3"
                      >
                        <SealWarning size={15} weight="fill" className="mt-0.5 shrink-0 text-warning" />
                        {it.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Popover>
          <Button variant="secondary" size="sm" icon={PlayCircle} onClick={() => setTesting(true)}>
            <span className="hidden sm:inline">Test</span>
          </Button>
          <Button variant="brand" size="sm" icon={Rocket} onClick={publish}>
            Publish
          </Button>
          <Tooltip content="Flow settings" side="bottom">
            <IconButton icon={GearSix} label="Flow settings" onClick={() => { setSelected(null); setInspectorOpen((o) => !o || !!selNode); }} className={inspectorOpen && !selNode ? 'text-brand' : ''} />
          </Tooltip>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {/* palette */}
        <aside className={cn('z-20 w-56 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-3', paletteOpen ? 'absolute inset-y-0 left-0 flex shadow-pop' : 'hidden lg:flex')}>
          <div className="px-1.5 pb-2 text-2xs font-semibold uppercase tracking-[.08em] text-ink-faint">Add a step</div>
          <ul className="flex flex-col gap-1">
            {PALETTE.map((p) => (
              <li key={p.type}>
                <button
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-flow-node', p.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addNode(p.type)}
                  className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-transparent p-2 text-left transition hover:border-line hover:bg-surface-2 active:cursor-grabbing"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_CLASS[p.tone])}>
                    <p.icon size={16} weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{p.label}</span>
                    <span className="block truncate text-2xs text-ink-muted">{p.help}</span>
                  </span>
                  <DotsSixVertical size={14} className="shrink-0 text-ink-faint opacity-0 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-auto px-1.5 pt-4 text-2xs leading-relaxed text-ink-faint">Click to add in the middle, or drag onto the canvas. Delete removes the selected step or connection.</p>
        </aside>

        {/* canvas */}
        <div className="min-w-0 flex-1">
          <FlowCanvas
            ref={canvas}
            nodes={nodes}
            edges={edges}
            selected={selected}
            flagged={flagged}
            onSelect={(s) => {
              setSelected(s);
              if (s?.kind === 'node') setInspectorOpen(true);
            }}
            onMoveNode={(nid, x, y) => change(() => setNodes((all) => all.map((n) => (n.id === nid ? { ...n, x, y } : n))))}
            onConnect={(from, port, to) => change(() => setEdges((all) => [...all.filter((e) => !(e.from === from && e.port === port)), { id: `e${++uid}`, from, port, to }]))}
            onDeleteEdge={(eid) => change(() => setEdges((all) => all.filter((e) => e.id !== eid)))}
            onDropNode={(type, x, y) => addNode(type, x, y)}
          />
        </div>

        {/* inspector */}
        <aside className={cn('z-20 w-80 shrink-0 overflow-y-auto border-l border-line bg-surface', inspectorOpen ? 'absolute inset-y-0 right-0 block shadow-pop xl:static xl:shadow-none' : 'hidden')}>
          <Inspector
            node={selNode}
            flow={settings}
            fields={nodes.filter((n) => n.type === 'ask' && n.data.saveAs).map((n) => n.data.saveAs)}
            onFlowChange={(p) => change(() => setSettings((s) => ({ ...s, ...p })))}
            onChange={(d) => change(() => setNodes((all) => all.map((n) => (n.id === selNode.id ? { ...n, data: d } : n))))}
            onDelete={removeSelected}
            onClose={() => {
              setSelected(null);
              setInspectorOpen(false);
            }}
          />
        </aside>
      </div>

      <Drawer open={testing} onClose={() => setTesting(false)} title="Test this flow" subtitle="Plays the flow as a customer would. Nothing is sent." width={420}>
        <div className="p-6">
          <FlowTester nodes={nodes} edges={edges} />
          <p className="mt-4 text-center text-xs text-ink-muted">
            Want the AI step to know more? Add documents in <Link to="/ultrachat/ai-bot" className="font-semibold text-brand">AI bot</Link>.
          </p>
        </div>
      </Drawer>
    </Page>
  );
}
