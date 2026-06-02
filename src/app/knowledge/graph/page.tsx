"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Network, X, Info, ChevronRight } from "lucide-react";
import { PageHeader, Card, Spinner } from "@/components/ui";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";
const hdr  = () => ({ "ngrok-skip-browser-warning": "true", "X-API-Key": KEY });

async function apiFetch(path: string) {
  const r = await fetch(`${API}${path}`, { headers: hdr() });
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

const NODE_COLORS: Record<string, string> = {
  concept:      "#6366f1",
  document:     "#0ea5e9",
  organization: "#10b981",
  person:       "#f59e0b",
  location:     "#ef4444",
  default:      "#64748b",
};
const nodeColor = (type?: string) =>
  NODE_COLORS[(type ?? "").toLowerCase()] ?? NODE_COLORS.default;

interface GraphNode {
  id?: string;
  node_id?: string;
  node_type?: string;
  description?: string;
  doc_ids?: string[];
  hop?: number;
}
interface GraphEdge {
  src?: string;
  tgt?: string;
  edge_type?: string;
}
interface Subgraph { nodes: GraphNode[]; edges: GraphEdge[]; }

// Safely get the id from either id or node_id field
function nodeKey(n: GraphNode): string {
  return (n.node_id ?? n.id ?? "");
}

function ForceGraph({ data, onNodeClick }: { data: Subgraph; onNodeClick: (n: GraphNode) => void }) {
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!data.nodes.length) return;
    const W = 680, H = 460, cx = W / 2, cy = H / 2;
    const byHop: Record<number, string[]> = {};

    data.nodes.forEach(n => {
      const key = nodeKey(n);
      if (!key) return;
      const hop = n.hop ?? 0;
      (byHop[hop] = byHop[hop] ?? []).push(key);
    });

    const next: Record<string, { x: number; y: number }> = {};
    Object.entries(byHop).forEach(([h, ids]) => {
      const hop = Number(h);
      const r = hop === 0 ? 0 : hop * 120;
      ids.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / Math.max(ids.length, 1) - Math.PI / 2;
        next[id] = hop === 0
          ? { x: cx, y: cy }
          : { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
    });
    setPos(next);
  }, [data]);

  if (!data.nodes.length) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
        No graph data — search an entity above.
      </div>
    );
  }

  return (
    <svg viewBox="0 0 680 460" className="w-full rounded-lg bg-slate-50">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#cbd5e1" />
        </marker>
      </defs>

      {data.edges.map((edge, i) => {
        const s = pos[edge.src ?? ""];
        const t = pos[edge.tgt ?? ""];
        if (!s || !t) return null;
        return (
          <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="#cbd5e1" strokeWidth="1.5" markerEnd="url(#arr)" opacity={0.6} />
        );
      })}

      {data.nodes.map((node, i) => {
        const key   = nodeKey(node);
        if (!key) return null;
        const p     = pos[key];
        if (!p) return null;
        const isCenter = node.hop === 0;
        const r     = isCenter ? 22 : 14;
        const color = nodeColor(node.node_type);
        const rawLabel = key.replace(/_/g, " ");
        const label = rawLabel.slice(0, 18) + (rawLabel.length > 18 ? "…" : "");

        return (
          <g key={key ?? i} className="cursor-pointer" onClick={() => onNodeClick(node)}>
            <circle cx={p.x} cy={p.y} r={r + 6} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={r} fill={color} fillOpacity={0.15}
              stroke={color} strokeWidth={isCenter ? 2.5 : 1.5} />
            {isCenter && (
              <circle cx={p.x} cy={p.y} r={r - 5} fill={color} fillOpacity={0.3} />
            )}
            <text x={p.x} y={p.y + r + 13} textAnchor="middle"
              fontSize={10} fill="#475569" fontFamily="Inter, sans-serif">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function NodeDetail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const key = nodeKey(node);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-slate-900 text-sm">{key.replace(/_/g, " ")}</p>
          <span className="text-xs px-2 py-0.5 rounded-md mt-1 inline-block"
            style={{ background: nodeColor(node.node_type) + "20", color: nodeColor(node.node_type) }}>
            {node.node_type ?? "concept"}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      {node.description && (
        <p className="text-xs text-slate-500 mb-3">{node.description}</p>
      )}
      {(node.doc_ids ?? []).length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">
            Found in {node.doc_ids!.length} document(s)
          </p>
          {node.doc_ids!.slice(0, 3).map(id => (
            <p key={id} className="text-xs text-slate-400 font-mono">{id.slice(0, 16)}…</p>
          ))}
        </div>
      )}
      {node.hop !== undefined && (
        <p className="text-xs text-slate-400 mt-2">{node.hop} hop{node.hop !== 1 ? "s" : ""} from center</p>
      )}
    </Card>
  );
}

export default function GraphPage() {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<GraphNode[]>([]);
  const [subgraph, setSubgraph]   = useState<Subgraph>({ nodes: [], edges: [] });
  const [selected, setSelected]   = useState<GraphNode | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [depth, setDepth]         = useState(2);
  const [error, setError]         = useState("");

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const r = await apiFetch(`/knowledge/graph/search?q=${encodeURIComponent(query)}&top_k=10`);
      setResults(Array.isArray(r) ? r : []);
    } catch (e) {
      setError("Search failed — no entities indexed yet");
      setResults([]);
    } finally {
      setSearching(false); }
  };

  const loadSubgraph = async (entityId: string) => {
    setLoading(true);
    setResults([]);
    setError("");
    try {
      const g: Subgraph = await apiFetch(
        `/knowledge/graph/entity/${encodeURIComponent(entityId)}?depth=${depth}`
      );
      // Ensure every node has a node_id field
      const nodes = (g.nodes ?? []).map(n => ({
        ...n,
        node_id: n.node_id ?? n.id ?? "",
        hop: n.hop ?? 1,
      }));
      // mark center
      const center = nodes.find(n => (n.node_id ?? n.id ?? "") === entityId);
      if (center) center.hop = 0;
      setSubgraph({ nodes, edges: g.edges ?? [] });
      setSelected(null);
    } catch (e) {
      setError("Could not load subgraph");
      setSubgraph({ nodes: [], edges: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Knowledge Graph"
        description="Entities and relationships extracted from your documents"
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="Search entities…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>
            <select value={depth} onChange={e => setDepth(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none">
              {[1, 2, 3].map(d => <option key={d} value={d}>Depth {d}</option>)}
            </select>
            <button onClick={search} disabled={searching || !query.trim()}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-40">
              {searching ? "…" : "Search"}
            </button>
          </div>

          {error && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">{error}</p>
          )}

          {results.length > 0 && (
            <Card className="p-3">
              <p className="text-xs text-slate-500 mb-2 px-1">Click an entity to load its subgraph</p>
              <div className="space-y-1">
                {results.map((r, i) => {
                  const key = nodeKey(r);
                  return (
                    <button key={key || i} onClick={() => key && loadSubgraph(key)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg hover:bg-slate-50">
                      <span className="font-medium text-slate-800 capitalize">{key.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: nodeColor(r.node_type) + "20", color: nodeColor(r.node_type) }}>
                          {r.node_type ?? "concept"}
                        </span>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-4">
            {loading
              ? <div className="h-80 flex items-center justify-center"><Spinner size={24} /></div>
              : <ForceGraph data={subgraph} onNodeClick={setSelected} />
            }
          </Card>

          <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
            {Object.entries(NODE_COLORS).filter(([k]) => k !== "default").map(([type, color]) => (
              <span key={type} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                {type}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {selected
            ? <NodeDetail node={selected} onClose={() => setSelected(null)} />
            : (
              <Card className="p-5 text-center">
                <Network size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-sm text-slate-400">Click any node to see details</p>
              </Card>
            )
          }

          <Card className="p-5">
            <p className="text-xs font-medium text-slate-600 mb-2">Graph overview</p>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Nodes</span>
                <span className="font-medium text-slate-800">{subgraph.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Edges</span>
                <span className="font-medium text-slate-800">{subgraph.edges.length}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
              <Info size={12} /> How to use
            </p>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal pl-4">
              <li>Upload documents first — entities are extracted on ingestion</li>
              <li>Search an entity name (e.g. "Refund Policy")</li>
              <li>Click a result to load its subgraph</li>
              <li>Click any node in the graph for details</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
