import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CornersOut, MagnifyingGlassMinus, MagnifyingGlassPlus, WarningCircle, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/design-system';
import { HEADER, NODE_TYPES, NODE_W, ROW, SUMMARY, TONE_CLASS, bezier, inPort, isMulti, nodeHeight, outPort, outputs, summary } from './nodes';

const MIN_Z = 0.3;
const MAX_Z = 1.6;
const clampZ = (z) => Math.min(MAX_Z, Math.max(MIN_Z, z));

/**
 * Hand-built node canvas: drag nodes, pan the background, wheel/ctrl+wheel, drag from an output
 * port onto a node to connect. Positions are canvas coordinates (independent of zoom).
 */
export const FlowCanvas = forwardRef(function FlowCanvas({ nodes, edges, selected, onSelect, onMoveNode, onConnect, onDeleteEdge, onDropNode, flagged = new Set() }, ref) {
  const box = useRef(null);
  const [view, setView] = useState({ x: 40, y: 40, zoom: 1 });
  const [link, setLink] = useState(null); // {from, port, a:{x,y}, b:{x,y}}
  const [hoverEdge, setHoverEdge] = useState(null);
  const [panning, setPanning] = useState(false);

  const toCanvas = (clientX, clientY) => {
    const r = box.current.getBoundingClientRect();
    return { x: (clientX - r.left - view.x) / view.zoom, y: (clientY - r.top - view.y) / view.zoom };
  };

  const fit = () => {
    if (!nodes.length || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
    const maxY = Math.max(...nodes.map((n) => n.y + nodeHeight(n)));
    const pad = 40;
    const zoom = clampZ(Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY), 1.1));
    setView({ zoom, x: (r.width - (maxX - minX) * zoom) / 2 - minX * zoom, y: (r.height - (maxY - minY) * zoom) / 2 - minY * zoom });
  };

  const zoomBy = (factor, cx, cy) => {
    const r = box.current.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setView((v) => {
      const zoom = clampZ(v.zoom * factor);
      const k = zoom / v.zoom;
      return { zoom, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  };

  useImperativeHandle(ref, () => ({
    fit,
    center: () => {
      const r = box.current.getBoundingClientRect();
      return toCanvas(r.left + r.width / 2 - NODE_W / 2, r.top + r.height / 2 - 60);
    },
  }));

  /* ---- pointer handling ---- */
  const startDrag = (e, node) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect({ kind: 'node', id: node.id });
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = node.x;
    const oy = node.y;
    const move = (ev) => onMoveNode(node.id, Math.round(ox + (ev.clientX - sx) / view.zoom), Math.round(oy + (ev.clientY - sy) / view.zoom));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startPan = (e) => {
    if (e.button !== 0) return;
    onSelect(null);
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { ...view };
    setPanning(true);
    const move = (ev) => setView((v) => ({ ...v, x: o.x + ev.clientX - sx, y: o.y + ev.clientY - sy }));
    const up = () => {
      setPanning(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startLink = (e, node, port) => {
    e.stopPropagation();
    e.preventDefault();
    const a = outPort(node, port);
    setLink({ from: node.id, port, a, b: a });
    const move = (ev) => setLink((l) => l && { ...l, b: toCanvas(ev.clientX, ev.clientY) });
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-node-id]');
      const to = el?.getAttribute('data-node-id');
      if (to && to !== node.id) onConnect(node.id, port, to);
      setLink(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // Native listener so ctrl+wheel can preventDefault (browser zoom) — React's wheel handler is passive.
  useEffect(() => {
    const el = box.current;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomBy(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top);
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const grid = 20 * view.zoom;

  return (
    <div
      ref={box}
      onPointerDown={startPan}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const type = e.dataTransfer.getData('application/x-flow-node');
        if (!type) return;
        const p = toCanvas(e.clientX, e.clientY);
        onDropNode(type, Math.round(p.x - NODE_W / 2), Math.round(p.y - HEADER / 2));
      }}
      className={cn('relative h-full w-full touch-none select-none overflow-hidden bg-canvas', panning ? 'cursor-grabbing' : 'cursor-grab')}
      style={{ backgroundImage: 'radial-gradient(rgb(var(--line-strong)) 1.2px, transparent 1.2px)', backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
          {edges.map((e) => {
            const a = byId[e.from];
            const b = byId[e.to];
            if (!a || !b) return null;
            const p1 = outPort(a, e.port);
            const p2 = inPort(b);
            const d = bezier(p1, p2);
            const sel = selected?.kind === 'edge' && selected.id === e.id;
            const hot = sel || hoverEdge === e.id;
            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            return (
              <g key={e.id} className="pointer-events-auto">
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="cursor-pointer" onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onSelect({ kind: 'edge', id: e.id })} onMouseEnter={() => setHoverEdge(e.id)} onMouseLeave={() => setHoverEdge(null)} />
                <path d={d} fill="none" style={{ stroke: hot ? 'rgb(var(--brand))' : 'rgb(var(--line-strong))', strokeWidth: hot ? 2.5 : 2 }} />
                <circle cx={p2.x} cy={p2.y} r={3.5} style={{ fill: hot ? 'rgb(var(--brand))' : 'rgb(var(--line-strong))' }} />
                {hot && (
                  <foreignObject x={mid.x - 11} y={mid.y - 11} width={22} height={22}>
                    <button
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onClick={() => onDeleteEdge(e.id)}
                      onMouseEnter={() => setHoverEdge(e.id)}
                      aria-label="Delete connection"
                      className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line bg-surface text-danger shadow-card hover:bg-danger hover:text-white"
                    >
                      <X size={11} weight="bold" />
                    </button>
                  </foreignObject>
                )}
              </g>
            );
          })}
          {link && <path d={bezier(link.a, link.b)} fill="none" strokeDasharray="6 5" style={{ stroke: 'rgb(var(--brand))', strokeWidth: 2 }} />}
        </svg>

        {nodes.map((n) => (
          <NodeCard key={n.id} node={n} selected={selected?.kind === 'node' && selected.id === n.id} flagged={flagged.has(n.id)} linking={!!link && link.from !== n.id} onPointerDown={(e) => startDrag(e, n)} onPortDown={(e, i) => startLink(e, n, i)} connected={(i) => edges.some((e) => e.from === n.id && e.port === i)} />
        ))}
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-card" onPointerDown={(e) => e.stopPropagation()}>
        <Tooltip content="Zoom out">
          <button onClick={() => zoomBy(0.85)} aria-label="Zoom out" className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-3">
            <MagnifyingGlassMinus size={16} />
          </button>
        </Tooltip>
        <span className="w-12 text-center text-xs font-semibold tabular text-ink-2">{Math.round(view.zoom * 100)}%</span>
        <Tooltip content="Zoom in">
          <button onClick={() => zoomBy(1.15)} aria-label="Zoom in" className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-3">
            <MagnifyingGlassPlus size={16} />
          </button>
        </Tooltip>
        <span className="mx-0.5 h-5 w-px bg-line" />
        <Tooltip content="Fit to screen">
          <button onClick={fit} aria-label="Fit to screen" className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-3">
            <CornersOut size={16} />
          </button>
        </Tooltip>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 hidden rounded-lg bg-surface/80 px-2.5 py-1 text-2xs text-ink-muted backdrop-blur md:block">Drag empty space to pan · Ctrl + scroll to zoom · Drag from ● to connect</div>
    </div>
  );
});

function NodeCard({ node, selected, flagged, linking, onPointerDown, onPortDown, connected }) {
  const t = NODE_TYPES[node.type];
  const Icon = t.icon;
  const outs = outputs(node);
  const multi = isMulti(node);
  return (
    <div
      data-node-id={node.id}
      onPointerDown={onPointerDown}
      className={cn(
        'absolute cursor-default rounded-2xl border bg-surface shadow-card transition-[box-shadow,border-color]',
        selected ? 'border-brand shadow-pop ring-4 ring-brand/15' : flagged ? 'border-warning/60' : 'border-line hover:border-line-strong hover:shadow-pop',
        linking && 'hover:ring-4 hover:ring-brand/25',
      )}
      style={{ left: node.x, top: node.y, width: NODE_W, height: undefined }}
    >
      {/* input port */}
      {node.type !== 'trigger' && <span className="absolute -left-[6px] h-3 w-3 rounded-full border-2 border-surface bg-line-strong" style={{ top: HEADER / 2 - 6 }} />}
      <div className="flex items-center gap-2 border-b border-line px-3" style={{ height: HEADER }}>
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', TONE_CLASS[t.tone])}>
          <Icon size={14} weight="bold" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{t.label}</span>
        {flagged && <WarningCircle size={15} weight="fill" className="text-warning" />}
      </div>
      <div className="px-3 py-2" style={{ height: SUMMARY }}>
        <p className="line-clamp-2 text-xs leading-[18px] text-ink-muted">{summary(node)}</p>
      </div>
      {multi && (
        <div className="px-2 pb-2">
          {outs.map((o, i) => (
            <div key={i} className="relative flex items-center rounded-lg bg-surface-2 px-2 text-xs font-medium text-ink-2" style={{ height: ROW - 4, marginBottom: 4 }}>
              <span className="truncate">{o}</span>
            </div>
          ))}
        </div>
      )}
      {outs.map((o, i) => (
        <span
          key={i}
          onPointerDown={(e) => onPortDown(e, i)}
          title={`Connect “${o}”`}
          className={cn('absolute -right-[7px] h-3.5 w-3.5 cursor-crosshair rounded-full border-2 border-surface transition hover:scale-125', connected(i) ? 'bg-brand' : 'bg-surface ring-2 ring-brand/60')}
          style={{ top: (multi ? HEADER + SUMMARY + ROW * i + ROW / 2 - 2 : HEADER + SUMMARY / 2) - 7 }}
        />
      ))}
    </div>
  );
}
