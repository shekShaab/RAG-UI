"use client";
import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle, RefreshCw, MessageSquare } from "lucide-react";
import { PageHeader, Button, Card, CategoryBadge, StatCard } from "@/components/ui";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const AKEY = process.env.NEXT_PUBLIC_API_KEY ?? "";
const hdr  = () => ({ "ngrok-skip-browser-warning": "true", "X-API-Key": AKEY, "Content-Type": "application/json" });
const get  = (p: string) => fetch(`${API}${p}`, { headers: hdr() }).then(r => r.json());
const post = (p: string, b?: any) => fetch(`${API}${p}`, { method:"POST", headers: hdr(), body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

type FeedbackItem = {
  id: number; query: string; answer: string; category: string;
  rating: number; comment: string; correction: string;
  reviewed: boolean; created_at: string;
};

function RatingBadge({ rating }: { rating: number }) {
  return rating > 0
    ? <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-md border border-green-200"><ThumbsUp size={10}/> Positive</span>
    : <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-200"><ThumbsDown size={10}/> Negative</span>;
}

function FeedbackRow({ item, onReview }: { item: FeedbackItem; onReview: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`border-b border-slate-50 last:border-0 ${item.reviewed ? "opacity-60" : ""}`}>
      <div className="px-5 py-3 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(p => !p)}>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-800 truncate font-medium">{item.query}</p>
          <div className="flex items-center gap-2 mt-1">
            <CategoryBadge category={item.category} />
            <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
            {item.comment && <span className="text-xs text-slate-400 flex items-center gap-0.5"><MessageSquare size={10}/> Has comment</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RatingBadge rating={item.rating} />
          {!item.reviewed && (
            <button onClick={e => { e.stopPropagation(); onReview(item.id); }}
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <CheckCircle size={12}/> Review
            </button>
          )}
          {item.reviewed && <span className="text-xs text-slate-400">Reviewed</span>}
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-4 space-y-3 bg-slate-50 border-t border-slate-100">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Answer</p>
            <p className="text-xs text-slate-600 line-clamp-4">{item.answer}</p>
          </div>
          {item.comment && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">User comment</p>
              <p className="text-xs text-slate-600">{item.comment}</p>
            </div>
          )}
          {item.correction && (
            <div>
              <p className="text-xs font-medium text-amber-600 mb-1">User correction</p>
              <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded">{item.correction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const [items, setItems]       = useState<FeedbackItem[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [byCat, setByCat]       = useState<any[]>([]);
  const [filter, setFilter]     = useState<"all"|"positive"|"negative"|"unreviewed">("all");
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (spin = false) => {
    if (spin) setRefreshing(true);
    const [all, s, bc] = await Promise.all([
      get("/feedback?limit=100"),
      get("/feedback/summary"),
      get("/feedback/by-category"),
    ]);
    setItems(all); setSummary(s); setByCat(bc);
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const markReviewed = async (id: number) => {
    await post(`/feedback/${id}/review`);
    setItems(prev => prev.map(i => i.id === id ? { ...i, reviewed: true } : i));
    setSummary((prev: any) => prev ? { ...prev, unreviewed: Math.max(0, prev.unreviewed - 1) } : prev);
  };

  const filtered = items.filter(i => {
    if (filter === "positive")   return i.rating > 0;
    if (filter === "negative")   return i.rating < 0;
    if (filter === "unreviewed") return !i.reviewed;
    return true;
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Feedback"
        description="User ratings and corrections on query answers"
        action={
          <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total feedback" value={summary?.total ?? "—"} icon={MessageSquare as any} />
        <StatCard label="Positive" value={summary?.positive ?? "—"} icon={ThumbsUp as any} color="text-green-500" />
        <StatCard label="Negative" value={summary?.negative ?? "—"} icon={ThumbsDown as any} color="text-red-500" />
        <StatCard label="Score" value={summary ? `${summary.score_pct}%` : "—"}
          icon={CheckCircle as any}
          color={summary?.score_pct >= 70 ? "text-green-500" : summary?.score_pct >= 50 ? "text-amber-500" : "text-red-500"}
          sub={summary?.unreviewed ? `${summary.unreviewed} unreviewed` : undefined} />
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex gap-1">
              {(["all","positive","negative","unreviewed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
                    filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                  {f === "all" ? `All (${items.length})` :
                   f === "positive" ? `Positive (${items.filter(i=>i.rating>0).length})` :
                   f === "negative" ? `Negative (${items.filter(i=>i.rating<0).length})` :
                   `Unreviewed (${summary?.unreviewed ?? 0})`}
                </button>
              ))}
            </div>
            {loading ? <div className="p-8 text-center text-sm text-slate-400">Loading…</div> :
             filtered.length === 0 ? <div className="p-10 text-center text-sm text-slate-400">No feedback in this filter</div> :
             filtered.map(item => <FeedbackRow key={item.id} item={item} onReview={markReviewed} />)}
          </Card>
        </div>
        <div>
          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-900 mb-3">Score by category</h2>
            {byCat.length === 0 ? <p className="text-xs text-slate-400">No data</p> :
             byCat.map(c => (
              <div key={c.category} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-600 capitalize">{c.category.replace(/_/g," ")}</span>
                  <span className={`text-xs font-medium ${c.score_pct>=70?"text-green-600":c.score_pct>=50?"text-amber-600":"text-red-500"}`}>
                    {c.score_pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.score_pct>=70?"bg-green-400":c.score_pct>=50?"bg-amber-400":"bg-red-400"}`}
                    style={{width:`${c.score_pct}%`}}/>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{c.total} responses</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
