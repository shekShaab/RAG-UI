"use client";
import { useState, useRef } from "react";
import { Search, FileText, ChevronRight, Filter } from "lucide-react";
import { PageHeader, Card, CategoryBadge, Spinner } from "@/components/ui";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const AKEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

interface Hit { chunk_id: string; content: string; source_filename: string; category: string; score: number; heading_path?: string; }
interface Results { query: string; total_hits: number; categories_searched: number; by_category: Record<string, Hit[]>; top_hits: Hit[]; }

function HitCard({ hit }: { hit: Hit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div onClick={() => setExpanded(p => !p)}
      className="p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 cursor-pointer transition-colors">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-700 truncate">{hit.source_filename}</p>
          {hit.heading_path && <p className="text-xs text-slate-400 truncate">{hit.heading_path}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${hit.score > 0.7 ? "bg-green-50 text-green-600" : hit.score > 0.4 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500"}`}>
            {(hit.score * 100).toFixed(0)}
          </span>
          <ChevronRight size={12} className={`text-slate-300 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>
      <p className={`text-xs text-slate-600 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>{hit.content}</p>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Results | null>(null);
  const [searching, setSearching] = useState(false);
  const [view, setView]         = useState<"grouped"|"flat">("flat");
  const [useHyde, setUseHyde]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const r = await fetch(`${API}/search`, {
        method: "POST",
        headers: { "X-API-Key": AKEY, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, top_n: 5, use_hyde: useHyde }),
      });
      setResults(await r.json());
    } finally { setSearching(false); }
  };

  const examples = [
    "What are the main policies I should follow?",
    "Explain the refund process",
    "What business rules apply to new customers?",
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Universal Search"
        description="Search across all knowledge base categories simultaneously"
      />

      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Search your entire knowledge base…"
              className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
          </div>
          <button onClick={search} disabled={!query.trim() || searching}
            className="px-5 py-3 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2">
            {searching ? <Spinner size={14} /> : <Search size={14} />}
            Search
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {examples.map(e => (
              <button key={e} onClick={() => { setQuery(e); setTimeout(search, 100); }}
                className="text-xs text-brand-600 hover:text-brand-700 truncate max-w-48">{e.slice(0,40)}…</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" checked={useHyde} onChange={e => setUseHyde(e.target.checked)} className="w-3 h-3" />
            HyDE
          </label>
        </div>
      </div>

      {results && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{results.total_hits}</span> results across{" "}
              <span className="font-medium">{results.categories_searched}</span> categories
              {" "}for <span className="font-medium">"{results.query}"</span>
            </p>
            <div className="flex gap-1">
              {(["flat","grouped"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${
                    view === v ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === "flat" ? (
            <div className="space-y-3">
              {results.top_hits.map((hit, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CategoryBadge category={hit.category} />
                  <div className="flex-1"><HitCard hit={hit} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(results.by_category).map(([cat, hits]) => (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-3">
                    <CategoryBadge category={cat} />
                    <span className="text-xs text-slate-400">{hits.length} results</span>
                    <div className="flex-1 border-t border-slate-100"/>
                  </div>
                  <div className="space-y-2 pl-2">
                    {hits.map((hit, i) => <HitCard key={i} hit={hit} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!results && !searching && (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 text-sm">Enter a query to search across all categories at once</p>
        </div>
      )}
    </div>
  );
}
