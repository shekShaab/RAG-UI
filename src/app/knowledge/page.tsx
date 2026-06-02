"use client";
import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, Clock, Trash2, Play, Info } from "lucide-react";
import {
  fetchStalenessReport, runStalenessSweep,
  fetchGraphStats, fetchDependencyMap,
} from "@/lib/api";
import type { StalenessEntry, StalenessSweeep, GraphStats } from "@/lib/types";
import { PageHeader, Button, Card, CategoryBadge, StatCard } from "@/components/ui";
import Link from "next/link";

function DecayBar({ value }: { value: number }) {
  const pct   = Math.round(value * 100);
  const color = value > 0.8 ? "bg-green-400" : value > 0.5 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8">{pct}%</span>
    </div>
  );
}

function StatusBadge({ entry }: { entry: StalenessEntry }) {
  if (entry.is_expired)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-200"><Trash2 size={10}/> Expired</span>;
  if (entry.is_stale)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-200"><AlertTriangle size={10}/> Stale</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-md border border-green-200"><Clock size={10}/> Fresh</span>;
}

function SweepResult({ result }: { result: StalenessSweeep }) {
  return (
    <div className={`rounded-xl border p-4 text-sm ${result.dry_run ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
      <p className="font-medium text-slate-800 mb-2">
        {result.dry_run ? "Dry run complete" : "Sweep complete"}
      </p>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><p className="text-xl font-medium text-slate-900">{result.checked}</p><p className="text-xs text-slate-500">Checked</p></div>
        <div><p className="text-xl font-medium text-amber-600">{result.stale}</p><p className="text-xs text-slate-500">Stale</p></div>
        <div><p className="text-xl font-medium text-red-600">{result.expired}</p><p className="text-xs text-slate-500">{result.dry_run ? "Would expire" : "Expired"}</p></div>
      </div>
      {result.expired_ids.length > 0 && (
        <div className="mt-3 text-xs text-slate-500">
          Expired IDs: {result.expired_ids.slice(0,5).join(", ")}{result.expired_ids.length > 5 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  const [report, setReport]     = useState<StalenessEntry[]>([]);
  const [graphStats, setStats]  = useState<GraphStats | null>(null);
  const [depCount, setDepCount] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<StalenessSweeep | null>(null);
  const [filter, setFilter]     = useState<"all" | "stale" | "expired">("all");

  useEffect(() => {
    Promise.all([
      fetchStalenessReport(),
      fetchGraphStats().catch(() => null),
      fetchDependencyMap().catch(() => ({ nodes: [], edges: [] })),
    ]).then(([r, g, d]) => {
      setReport(r);
      setStats(g);
      setDepCount(d.edges?.length ?? 0);
      setLoading(false);
    });
  }, []);

  const sweep = async (dryRun: boolean) => {
    setSweeping(true);
    setSweepResult(null);
    try {
      const result = await runStalenessSweep(dryRun);
      setSweepResult(result);
      if (!dryRun) {
        const refreshed = await fetchStalenessReport();
        setReport(refreshed);
      }
    } finally {
      setSweeping(false);
    }
  };

  const stale   = report.filter(r => r.is_stale && !r.is_expired);
  const expired = report.filter(r => r.is_expired);
  const fresh   = report.filter(r => !r.is_stale && !r.is_expired);
  const shown   = filter === "stale" ? stale : filter === "expired" ? expired : report;

  return (
    <div className="p-8">
      <PageHeader
        title="Knowledge Management"
        description="Staleness monitoring, knowledge graph, and document dependencies"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => sweep(true)} disabled={sweeping}>
              <Play size={13} /> Dry run sweep
            </Button>
            <Button variant="danger" size="sm" onClick={() => sweep(false)} disabled={sweeping}>
              {sweeping ? "Running…" : "Run sweep"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total documents" value={report.length} icon={Clock as any} />
        <StatCard label="Stale" value={stale.length} icon={AlertTriangle as any} color="text-amber-500"
          sub="exceed TTL" />
        <StatCard label="Expired" value={expired.length} icon={Trash2 as any} color="text-red-500"
          sub="exceed 2× TTL" />
        <Card className="p-5">
          <p className="text-sm text-slate-500 mb-1">Knowledge graph</p>
          <p className="text-2xl font-medium text-slate-900">{graphStats?.nodes ?? "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">{graphStats?.edges ?? 0} edges · {depCount} citations</p>
          <Link href="/knowledge/graph"
            className="mt-2 inline-block text-xs text-brand-600 hover:text-brand-700">
            Explore graph →
          </Link>
        </Card>
      </div>

      {sweepResult && (
        <div className="mb-6">
          <SweepResult result={sweepResult} />
        </div>
      )}

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-1">
            {(["all","stale","expired"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors capitalize ${
                  filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
                }`}>
                {f === "all" ? `All (${report.length})` : f === "stale" ? `Stale (${stale.length})` : `Expired (${expired.length})`}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Info size={12}/> Decay factor reduces retrieval score for stale chunks
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading staleness report…</div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No documents in this category</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-medium">
                <th className="text-left px-5 py-3">Document</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Age</th>
                <th className="text-right px-4 py-3">TTL</th>
                <th className="text-left px-4 py-3">Score decay</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shown.map(entry => (
                <tr key={entry.doc_id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800 truncate max-w-xs">{entry.filename}</td>
                  <td className="px-4 py-3"><CategoryBadge category={entry.category} /></td>
                  <td className="px-4 py-3 text-right text-slate-600">{entry.age_days}d</td>
                  <td className="px-4 py-3 text-right text-slate-400">{entry.ttl_days}d</td>
                  <td className="px-4 py-3"><DecayBar value={entry.decay_factor} /></td>
                  <td className="px-4 py-3"><StatusBadge entry={entry} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
