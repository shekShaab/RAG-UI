"use client";
import { useEffect, useState } from "react";
import { BarChart2, Zap, Database, ThumbsUp, Clock, TrendingUp } from "lucide-react";
import { PageHeader, StatCard, Card, CategoryBadge } from "@/components/ui";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const AKEY = process.env.NEXT_PUBLIC_API_KEY ?? "";
const hdr  = () => ({ "ngrok-skip-browser-warning": "true", "X-API-Key": AKEY, "Content-Type": "application/json" });

async function get(path: string) {
  const r = await fetch(`${API}${path}`, { headers: hdr() });
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

function LineChart({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (!data.length) return <div className="h-24 flex items-center justify-center text-xs text-slate-300">No data yet</div>;
  const max = Math.max(...data, 1);
  const W = 580, H = 80, pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 8)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <polyline fill={color} fillOpacity="0.08" strokeWidth="0"
        points={`0,${H + 4} ${pts} ${W},${H + 4}`} />
    </svg>
  );
}

function BarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-slate-300">No data yet</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-28 truncate capitalize">{label.replace(/_/g, " ")}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-700 w-8 text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview]   = useState<any>(null);
  const [daily, setDaily]         = useState<any[]>([]);
  const [byCat, setByCat]         = useState<any[]>([]);
  const [topDocs, setTopDocs]     = useState<any[]>([]);
  const [recent, setRecent]       = useState<any[]>([]);
  const [fbSummary, setFb]        = useState<any>(null);
  const [days, setDays]           = useState(30);
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, d, bc, td, rq, fb] = await Promise.all([
        get(`/analytics/overview?days=${days}`),
        get(`/analytics/daily?days=${days}`),
        get(`/analytics/by-category?days=${days}`),
        get(`/analytics/top-documents?days=${days}`),
        get("/analytics/recent-queries?limit=10"),
        get("/feedback/summary").catch(() => null),
      ]);
      setOverview(ov); setDaily(d); setByCat(bc);
      setTopDocs(td); setRecent(rq); setFb(fb);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [days]);

  const dailyCounts = daily.map(d => d.count);
  const dailyLabels = daily.map(d => d.day.slice(5));

  return (
    <div className="p-8">
      <PageHeader
        title="Analytics"
        description="Query volume, latency trends, document citations, and feedback scores"
        action={
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
            {[7,30,90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total queries" value={overview?.total_queries ?? "—"} icon={BarChart2 as any} />
        <StatCard label="Avg latency" value={overview ? `${overview.avg_latency_ms}ms` : "—"} icon={Clock as any} color="text-teal-600" />
        <StatCard label="Cache hit rate" value={overview ? `${overview.cache_hit_rate}%` : "—"} icon={Zap as any} color="text-amber-500" />
        <StatCard label="Feedback score"
          value={fbSummary ? `${fbSummary.score_pct}%` : "—"}
          icon={ThumbsUp as any} color={fbSummary?.score_pct >= 70 ? "text-green-500" : "text-red-500"}
          sub={fbSummary ? `${fbSummary.positive}↑  ${fbSummary.negative}↓` : undefined} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-900">Query volume</h2>
              <span className="text-xs text-slate-400">Last {days} days</span>
            </div>
            {loading ? <div className="h-24 bg-slate-50 rounded animate-pulse" /> : <LineChart data={dailyCounts} />}
            {!loading && daily.length > 0 && (
              <div className="flex justify-between mt-1 text-xs text-slate-300">
                <span>{dailyLabels[0]}</span>
                <span>{dailyLabels[dailyLabels.length - 1]}</span>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-sm font-medium text-slate-900 mb-4">Queries by category</h2>
          {loading ? <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse"/>)}</div>
            : <BarChart data={byCat.map(c => ({ label: c.category, value: c.count }))} />}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-900">Top cited documents</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? [...Array(5)].map((_,i) => <div key={i} className="px-5 py-3 h-10 animate-pulse bg-slate-50"/>) :
             topDocs.length === 0 ? <p className="px-5 py-6 text-sm text-slate-400 text-center">No citation data yet</p> :
             topDocs.map((doc, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-medium text-slate-400 w-4">{i+1}</span>
                  <span className="text-sm text-slate-700 truncate">{doc.filename}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{doc.citations} citations</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-900">Recent queries</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? [...Array(5)].map((_,i) => <div key={i} className="px-5 py-3 h-10 animate-pulse bg-slate-50"/>) :
             recent.length === 0 ? <p className="px-5 py-6 text-sm text-slate-400 text-center">No queries yet</p> :
             recent.map((q, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm text-slate-700 truncate flex-1">{q.query}</p>
                  <span className="text-xs text-slate-400 ml-2 shrink-0">{q.latency_ms}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={q.category} />
                  {q.cache_hit && <span className="text-xs text-teal-600 font-medium">cached</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
