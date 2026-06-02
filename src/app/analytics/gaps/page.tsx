"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, RefreshCw, Upload, Search, Lightbulb } from "lucide-react";
import { PageHeader, Button, Card, CategoryBadge, StatCard } from "@/components/ui";
import Link from "next/link";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";
const hdr  = () => ({ "X-API-Key": KEY, "Content-Type": "application/json" });
const get  = (p: string) => fetch(`${API}${p}`, { headers: hdr() }).then(r => r.json());
const post = (p: string) => fetch(`${API}${p}`, { method: "POST", headers: hdr() }).then(r => r.json());

type Gap = {
  id: number;
  query_pattern: string;
  category: string;
  occurrences: number;
  avg_sources: number;
  negative_fb: number;
  last_seen_at: string;
  is_resolved: boolean;
};

function SeverityBadge({ gap }: { gap: Gap }) {
  if (gap.avg_sources === 0 && gap.occurrences > 3)
    return <span className="text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 font-medium">Critical</span>;
  if (gap.negative_fb > 0 || gap.avg_sources < 1)
    return <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 font-medium">High</span>;
  return <span className="text-xs px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 font-medium">Low</span>;
}

function SourceBar({ avg }: { avg: number }) {
  const pct = Math.min((avg / 5) * 100, 100);
  const color = avg === 0 ? "bg-red-400" : avg < 2 ? "bg-amber-400" : "bg-green-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400">{avg.toFixed(1)}</span>
    </div>
  );
}

export default function GapsPage() {
  const [gaps, setGaps]           = useState<Gap[]>([]);
  const [summary, setSummary]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [filter, setFilter]       = useState<"all" | "critical" | "high">("all");
  const [search, setSearch]       = useState("");
  const [days, setDays]           = useState(30);

  const load = async () => {
    setLoading(true);
    const [g, s] = await Promise.all([
      get("/analytics/gaps?limit=100"),
      get("/analytics/gaps/summary"),
    ]);
    setGaps(Array.isArray(g) ? g : []);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const detect = async () => {
    setDetecting(true);
    await post(`/analytics/gaps/detect?days=${days}`);
    await load();
    setDetecting(false);
  };

  const resolve = async (id: number) => {
    await post(`/analytics/gaps/${id}/resolve`);
    setGaps(prev => prev.filter(g => g.id !== id));
    setSummary((p: any) => p ? { ...p, open: Math.max(0, p.open - 1), resolved: p.resolved + 1 } : p);
  };

  const filtered = gaps
    .filter(g => {
      if (filter === "critical") return g.avg_sources === 0 && g.occurrences > 3;
      if (filter === "high")     return g.negative_fb > 0 || g.avg_sources < 1;
      return true;
    })
    .filter(g => !search || g.query_pattern.includes(search.toLowerCase()));

  return (
    <div className="p-8">
      <PageHeader
        title="Knowledge Gaps"
        description="Queries the knowledge base couldn't answer well — discover what to upload next"
        action={
          <div className="flex items-center gap-2">
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
              {[7, 30, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
            </select>
            <Button size="sm" onClick={detect} disabled={detecting}>
              {detecting
                ? <><RefreshCw size={13} className="animate-spin" /> Detecting…</>
                : <><Search size={13} /> Detect gaps</>}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <StatCard label="Open gaps"   value={summary?.open ?? "—"}        icon={AlertCircle as any} color="text-red-500" />
        <StatCard label="Zero-source" value={summary?.zero_source ?? "—"} icon={AlertCircle as any} color="text-red-600"
          sub="No content found at all" />
        <StatCard label="Resolved"    value={summary?.resolved ?? "—"}    icon={CheckCircle as any} color="text-green-500" />
        <Card className="p-5 flex flex-col justify-between">
          <p className="text-sm text-slate-500">Fix a gap</p>
          <Link href="/documents">
            <Button size="sm" className="mt-2 w-full justify-center">
              <Upload size={13} /> Upload documents
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="mb-5 p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-medium">How this works: </span>
            Click <strong>Detect gaps</strong> to scan recent query logs. Gaps are normalised query patterns
            that returned fewer than 3 source chunks or got negative feedback.
            Upload documents that answer these questions, then mark the gap as resolved.
          </p>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {(["all", "critical", "high"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${
                  filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter patterns…"
              className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-52" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={32} className="mx-auto mb-3 text-green-300" />
            <p className="text-sm text-slate-500 font-medium">
              {gaps.length === 0
                ? "No gaps detected yet — click Detect gaps to scan query logs"
                : "No gaps match your filter"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-medium">
                <th className="text-left px-5 py-3">Query pattern</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-center px-4 py-3">Asked</th>
                <th className="text-left px-4 py-3">Avg sources</th>
                <th className="text-center px-4 py-3">👎</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Last seen</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(gap => (
                <tr key={gap.id} className="hover:bg-slate-50 group">
                  <td className="px-5 py-3">
                    <p className="text-slate-800 font-medium capitalize truncate max-w-xs">
                      {gap.query_pattern.replace(/_/g, " ")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={gap.category} />
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700">{gap.occurrences}×</td>
                  <td className="px-4 py-3"><SourceBar avg={gap.avg_sources} /></td>
                  <td className="px-4 py-3 text-center">
                    {gap.negative_fb > 0
                      ? <span className="text-red-500 font-medium">{gap.negative_fb}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><SeverityBadge gap={gap} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(gap.last_seen_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => resolve(gap.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-opacity whitespace-nowrap">
                      <CheckCircle size={12} /> Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
