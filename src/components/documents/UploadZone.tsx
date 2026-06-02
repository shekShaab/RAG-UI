"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { uploadDocument } from "@/lib/api";
import type { Category, UploadResult } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";

interface Props {
  categories: Category[];
  onUploaded: (doc: UploadResult) => void;
}

interface FileState {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  result?: UploadResult;
  error?: string;
}

export default function UploadZone({ categories, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileState[]>([]);
  const [category, setCategory] = useState("general");
  const [strategy, setStrategy] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const states: FileState[] = newFiles.map(f => ({ file: f, status: "queued" }));
    setFiles(prev => [...prev, ...states]);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const uploadAll = async () => {
    const queued = files.filter(f => f.status === "queued");
    for (const item of queued) {
      setFiles(prev => prev.map(f => f.file === item.file ? { ...f, status: "uploading" } : f));
      try {
        const result = await uploadDocument(item.file, category, strategy || undefined);
        setFiles(prev => prev.map(f => f.file === item.file ? { ...f, status: "done", result } : f));
        onUploaded(result);
      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.file === item.file ? { ...f, status: "error", error: String(err) } : f
        ));
      }
    }
  };

  const remove = (file: File) => setFiles(prev => prev.filter(f => f.file !== file));
  const queuedCount = files.filter(f => f.status === "queued").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {categories.map(c => (
              <option key={c.category_id} value={c.name}>
                {c.name.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Chunking strategy</label>
          <select
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Default (from category)</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="recursive">Recursive</option>
            <option value="semantic">Semantic</option>
          </select>
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt,.md,.html"
          className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))}
        />
        <Upload size={28} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Drop files or click to upload</p>
        <p className="mt-1 text-xs text-slate-400">PDF, DOCX, PPTX, XLSX, CSV, TXT, MD</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <FileText size={16} className="text-slate-400 shrink-0" />
              <span className="flex-1 text-sm text-slate-700 truncate">{item.file.name}</span>
              <span className="text-xs text-slate-400 shrink-0">
                {(item.file.size / 1024).toFixed(0)} KB
              </span>
              {item.status === "queued" && (
                <button onClick={() => remove(item.file)} className="text-slate-300 hover:text-slate-500">
                  <X size={14} />
                </button>
              )}
              {item.status === "uploading" && <Spinner size={14} />}
              {item.status === "done" && <CheckCircle size={14} className="text-green-500 shrink-0" />}
              {item.status === "error" && (
                <span title={item.error}>
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                </span>
              )}
            </div>
          ))}

          {queuedCount > 0 && (
            <Button onClick={uploadAll} className="w-full justify-center">
              Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""} to {category}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
