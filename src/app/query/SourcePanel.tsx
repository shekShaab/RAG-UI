"use client";
import { useState } from "react";
import { X, ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { Reference } from "@/lib/types";

interface Props {
  references: Reference[];
  onClose: () => void;
}

export default function SourcePanel({ references, onClose }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">
          Sources <span className="text-slate-400 font-normal">({references.length})</span>
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {references.map((ref, i) => (
          <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-start gap-2 p-3 text-left hover:bg-slate-100 transition-colors"
            >
              <FileText size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700 truncate">{ref.source_filename}</p>
                {ref.heading_path && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{ref.heading_path}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  ref.score > 0.8 ? "bg-green-100 text-green-700" :
                  ref.score > 0.5 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {(ref.score * 100).toFixed(0)}
                </span>
                {expanded === i ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
              </div>
            </button>
            {expanded === i && (
              <div className="px-3 pb-3 pt-0 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-mono break-all">{ref.chunk_id.slice(0, 12)}…</p>
                <p className="text-xs text-slate-400 mt-1">Ref [{ref.ref_id}] · score {ref.score.toFixed(3)}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}