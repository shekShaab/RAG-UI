"use client";
import { useEffect, useState } from "react";
import { FileText, Tag, CheckCircle, AlertCircle, Activity, Cpu } from "lucide-react";
import { fetchDocuments, fetchCategories, fetchHealth } from "@/lib/api";
import type { Document, Category, HealthStatus } from "@/lib/types";
import { StatCard, Card, CategoryBadge, StatusDot } from "@/components/ui";

export default function DashboardPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDocuments({ limit: 200 }),
      fetchCategories(),
      fetchHealth().catch(() => null),
    ]).then(([d, c, h]) => {
      setDocs(d.documents);
      setCats(c);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  const processed = docs.filter(d => d.status === "processed").length;
  const failed = docs.filter(d => d.status === "failed").length;
  const totalChunks = docs.reduce((s, d) => s + (d.chunk_count ?? 0), 0);
  const recent = [...docs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-medium text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of your knowledge base</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total documents" value={docs.length} icon={FileText} sub={`${processed} processed`} />
          <StatCard label="Total chunks" value={totalChunks.toLocaleString()} icon={Activity} color="text-teal-600" />
          <StatCard label="Categories" value={cats.length} icon={Tag} color="text-violet-600" />
          <StatCard
            label="Failed documents"
            value={failed}
            icon={failed > 0 ? AlertCircle : CheckCircle}
            color={failed > 0 ? "text-red-500" : "text-green-500"}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-medium text-slate-900">Recent documents</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="px-5 py-3 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                  ))
                : recent.length === 0
                ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-400">
                    No documents yet. Upload your first document.
                  </div>
                )
                : recent.map(doc => (
                  <div key={doc.doc_id} className="px-5 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate font-medium">{doc.filename}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <CategoryBadge category={doc.category} />
                        <span className="text-xs text-slate-400">{doc.chunk_count} chunks</span>
                      </div>
                    </div>
                    <StatusDot status={doc.status} />
                  </div>
                ))
              }
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-slate-400" />
              <h2 className="text-sm font-medium text-slate-900">System</h2>
              <span className={`ml-auto w-2 h-2 rounded-full ${health?.status === "healthy" ? "bg-green-400" : "bg-red-400"}`} />
            </div>
            {health ? (
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between"><span>LLM</span><span className="text-slate-700 font-medium">{health.llm_model}</span></div>
                <div className="flex justify-between"><span>Embeddings</span><span className="text-slate-700 font-medium">{health.embedding_model}</span></div>
                <div className="flex justify-between"><span>Provider</span><span className="text-slate-700 font-medium capitalize">{health.embedding_provider}</span></div>
                <div className="flex justify-between"><span>Reranker</span><span className={health.reranker_enabled ? "text-green-600 font-medium" : "text-slate-400"}>{health.reranker_enabled ? "enabled" : "disabled"}</span></div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Could not reach API</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-900 mb-3">Categories</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-7 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {cats.map(cat => {
                  const count = docs.filter(d => d.category === cat.name).length;
                  return (
                    <div key={cat.category_id} className="flex items-center justify-between">
                      <CategoryBadge category={cat.name} />
                      <span className="text-xs text-slate-400">{count} docs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
