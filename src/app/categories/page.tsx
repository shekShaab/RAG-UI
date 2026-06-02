"use client";
import { useEffect, useState } from "react";
import { Plus, Tag, Clock, Layers, X } from "lucide-react";
import { fetchCategories, createCategory, fetchDocuments } from "@/lib/api";
import type { Category } from "@/lib/types";
import { PageHeader, Button, Card, CategoryBadge } from "@/components/ui";

const STRATEGIES = ["hierarchical", "recursive", "semantic"] as const;

function CategoryCard({ cat, docCount }: { cat: Category; docCount: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <CategoryBadge category={cat.name} />
        <span className="text-xs text-slate-400">{docCount} docs</span>
      </div>
      {cat.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{cat.description}</p>
      )}
      <div className="space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Layers size={12} className="text-slate-400" />
          <span className="capitalize">{cat.chunk_strategy} chunking</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-slate-400" />
          <span>{cat.ttl_days}d TTL</span>
        </div>
        {cat.qdrant_collection && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Collection:</span>
            <span className="font-mono text-slate-600 text-xs truncate">{cat.qdrant_collection}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (cat: Category) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ttl, setTtl] = useState(90);
  const [strategy, setStrategy] = useState<typeof STRATEGIES[number]>("hierarchical");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const cat = await createCategory({ name: name.trim(), description, ttl_days: ttl, chunk_strategy: strategy });
      onCreate(cat);
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-slate-900">New category</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              placeholder="e.g. hr_policies"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this category contain?"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Chunk strategy</label>
              <select
                value={strategy}
                onChange={e => setStrategy(e.target.value as typeof STRATEGIES[number])}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                {STRATEGIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TTL (days)</label>
              <input
                type="number"
                value={ttl}
                onChange={e => setTtl(Number(e.target.value))}
                min={1} max={365}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} variant="secondary" className="flex-1 justify-center">Cancel</Button>
            <Button onClick={submit} disabled={!name.trim() || creating} className="flex-1 justify-center">
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchDocuments({ limit: 500 })]).then(([c, d]) => {
      setCats(c);
      const counts: Record<string, number> = {};
      d.documents.forEach(doc => { counts[doc.category] = (counts[doc.category] ?? 0) + 1; });
      setDocCounts(counts);
      setLoading(false);
    });
  }, []);

  const handleCreate = (cat: Category) => {
    setCats(prev => [...prev, cat]);
    setShowModal(false);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Categories"
        description="Organise your knowledge base into separate namespaces"
        action={
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus size={14} /> New category
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : cats.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag size={32} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm">No categories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {cats.map(cat => (
            <CategoryCard key={cat.category_id} cat={cat} docCount={docCounts[cat.name] ?? 0} />
          ))}
        </div>
      )}

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
