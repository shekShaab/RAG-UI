"use client";
import { useState } from "react";
import { Trash2, RefreshCw, ChevronDown, Search } from "lucide-react";
import type { Document, DocStatus } from "@/lib/types";
import { StatusDot, CategoryBadge, Button } from "@/components/ui";

interface Props {
  documents: Document[];
  onDelete: (docId: string) => void;
  onDownload?: (docId: string) => void;
  onReingest?: (docId: string) => void;
  loading?: boolean;
}

const STATUSES: Array<{ value: DocStatus | ""; label: string }> = [
  { value: "",          label: "All statuses" },
  { value: "processed", label: "Processed" },
  { value: "pending",   label: "Pending" },
  { value: "failed",    label: "Failed" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentTable({ documents, onDelete, onDownload, onReingest, loading }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const categories = Array.from(new Set(documents.map(d => d.category)));

  const filtered = documents.filter(d => {
    if (search && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (categoryFilter && d.category !== categoryFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DocStatus | "")}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none"
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">
          {documents.length === 0 ? "No documents uploaded yet." : "No documents match your filters."}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 font-medium">
                <th className="text-left px-4 py-3">Filename</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Chunks</th>
                <th className="text-right px-4 py-3">Size</th>
                <th className="text-right px-4 py-3">Version</th>
                <th className="text-left px-4 py-3">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(doc => (
                <tr key={doc.doc_id} className="hover:bg-slate-50 group">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800 truncate max-w-xs block">{doc.filename}</span>
                    {doc.error_msg && (
                      <span className="text-xs text-red-500 truncate max-w-xs block">{doc.error_msg}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={doc.category} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot status={doc.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{doc.chunk_count || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{doc.file_size ? formatSize(doc.file_size) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-400">v{doc.version}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === doc.doc_id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { onDelete(doc.doc_id); setConfirmDelete(null); }}
                          className="text-xs text-red-600 font-medium hover:text-red-700">Confirm</button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                        {(doc as any).source_path?.startsWith("s3://") && (
                          <>
                            <button title="Download original" onClick={() => onDownload?.(doc.doc_id)}
                              className="text-slate-300 hover:text-brand-500">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </button>
                            <button title="Re-ingest from S3" onClick={() => onReingest?.(doc.doc_id)}
                              className="text-slate-300 hover:text-teal-500">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                            </button>
                          </>
                        )}
                        <button onClick={() => setConfirmDelete(doc.doc_id)}
                          className="text-slate-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} of {documents.length} documents
          </div>
        </div>
      )}
    </div>
  );
}