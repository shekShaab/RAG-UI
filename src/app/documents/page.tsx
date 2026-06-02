"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { fetchDocuments, fetchCategories, deleteDocument } from "@/lib/api";
import type { Document, Category, UploadResult } from "@/lib/types";
import { PageHeader, Button, Card } from "@/components/ui";
import UploadZone from "@/components/documents/UploadZone";
import DocumentTable from "@/components/documents/DocumentTable";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    const [d, c] = await Promise.all([fetchDocuments({ limit: 500 }), fetchCategories()]);
    setDocs(d.documents);
    setCats(c);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUploaded = (result: UploadResult) => {
    setDocs(prev => [result as Document, ...prev.filter(d => d.doc_id !== result.doc_id)]);
    setTimeout(() => load(), 2000);
  };

  const handleDelete = async (docId: string) => {
    await deleteDocument(docId);
    setDocs(prev => prev.filter(d => d.doc_id !== docId));
  };

  const handleDownload = async (docId: string) => {
    try {
      const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";
      const r = await fetch(`${API}/documents/download/${docId}`, { headers: { "X-API-Key": KEY } });
      const { url, filename } = await r.json();
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
    } catch { alert("Download failed — check S3 configuration"); }
  };

  const handleReingest = async (docId: string) => {
    try {
      const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";
      await fetch(`${API}/documents/${docId}/reingest`, { method: "POST", headers: { "X-API-Key": KEY } });
      setTimeout(() => load(), 2000);
    } catch { alert("Re-ingest failed"); }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Documents"
        description="Upload files to ingest into the knowledge base"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-3">Upload documents</h2>
          <Card className="p-5">
            <UploadZone categories={cats} onUploaded={handleUploaded} />
          </Card>
        </div>

        <div className="col-span-2">
          <h2 className="text-sm font-medium text-slate-700 mb-3">Knowledge base</h2>
          <DocumentTable
            documents={docs}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onReingest={handleReingest}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
