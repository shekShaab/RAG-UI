"use client";
import { useEffect, useState } from "react";
import { Plus, Play, Trash2, CheckCircle, XCircle, RefreshCw, ChevronDown, Link2, Clock, AlertTriangle } from "lucide-react";
import { PageHeader, Button, Card, CategoryBadge, Spinner, StatCard } from "@/components/ui";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";
const hdr  = () => ({ "X-API-Key": KEY, "Content-Type": "application/json" });
const get  = (p: string) => fetch(`${API}${p}`, { headers: hdr() }).then(r => r.json());
const post = (p: string, b?: any) => fetch(`${API}${p}`, { method: "POST", headers: hdr(), body: b ? JSON.stringify(b) : undefined }).then(r => r.json());
const del_ = (p: string) => fetch(`${API}${p}`, { method: "DELETE", headers: hdr() });

type ConnectorType = { type: string; label: string; fields: Array<{ name: string; label: string; type: string; required: boolean; default?: string }> };
type Connector = { id: string; name: string; connector_type: string; category: string; is_active: boolean; last_sync_at: string | null; last_sync_status: string; };
type SyncLog = { id: number; started_at: string; finished_at: string | null; status: string; docs_found: number; docs_ingested: number; docs_failed: number; error_msg: string; };

const TYPE_ICONS: Record<string, string> = {
  local: "📁", s3: "☁️", gdrive: "🔵", confluence: "📘", notion: "⬛", onedrive: "🟦",
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-green-600 bg-green-50 border-green-200",
  partial: "text-amber-600 bg-amber-50 border-amber-200",
  failed:  "text-red-600  bg-red-50  border-red-200",
  running: "text-blue-600 bg-blue-50 border-blue-200",
  never:   "text-slate-400 bg-slate-50 border-slate-200",
};

function ConnectorCard({ conn, onSync, onDelete, onToggle }: {
  conn: Connector;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [logs, setLogs]       = useState<SyncLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok"|"error"|null>(null);

  const loadLogs = async () => {
    const data = await get(`/connectors/${conn.id}/logs?limit=5`);
    setLogs(Array.isArray(data) ? data : []);
    setShowLogs(true);
  };

  const testConn = async () => {
    setTesting(true);
    setTestResult(null);
    const r = await post(`/connectors/${conn.id}/test`);
    setTestResult(r.connected ? "ok" : "error");
    setTesting(false);
  };

  const sync = async () => {
    setSyncing(true);
    await post(`/connectors/${conn.id}/sync`);
    setTimeout(() => { setSyncing(false); onSync(conn.id); }, 1000);
  };

  const statusClass = STATUS_COLORS[conn.last_sync_status] ?? STATUS_COLORS.never;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_ICONS[conn.connector_type] ?? "🔌"}</span>
          <div>
            <p className="font-medium text-slate-800 text-sm">{conn.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 capitalize">{conn.connector_type}</span>
              <CategoryBadge category={conn.category} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-md border font-medium capitalize ${statusClass}`}>
            {conn.last_sync_status}
          </span>
          <button onClick={() => onToggle(conn.id, !conn.is_active)}
            className={`w-8 rounded-full transition-colors flex items-center px-0.5`}
            style={{ height:"18px", background: conn.is_active ? "#2563eb" : "#e2e8f0" }}>
            <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${conn.is_active ? "translate-x-3.5" : "translate-x-0"}`}/>
          </button>
        </div>
      </div>

      {conn.last_sync_at && (
        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
          <Clock size={11}/> Last sync: {new Date(conn.last_sync_at).toLocaleString()}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={sync} disabled={syncing || !conn.is_active}>
          {syncing ? <Spinner size={12}/> : <Play size={12}/>} Sync now
        </Button>
        <Button size="sm" variant="secondary" onClick={testConn} disabled={testing}>
          {testing ? <Spinner size={12}/> : <Link2 size={12}/>} Test
          {testResult === "ok" && <CheckCircle size={12} className="text-green-500"/>}
          {testResult === "error" && <XCircle size={12} className="text-red-500"/>}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => showLogs ? setShowLogs(false) : loadLogs()}>
          <ChevronDown size={12} className={showLogs ? "rotate-180" : ""}/> History
        </Button>
        <button onClick={() => onDelete(conn.id)}
          className="ml-auto p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded">
          <Trash2 size={13}/>
        </button>
      </div>

      {showLogs && logs.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-center justify-between text-xs">
              <span className={`px-1.5 py-0.5 rounded text-xs border font-medium capitalize ${STATUS_COLORS[log.status] ?? ""}`}>{log.status}</span>
              <span className="text-slate-500">{log.docs_ingested}/{log.docs_found} docs</span>
              <span className="text-slate-400">{new Date(log.started_at).toLocaleDateString()}</span>
              {log.error_msg && <span className="text-red-400 truncate max-w-24" title={log.error_msg}>⚠ {log.error_msg.slice(0,30)}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AddModal({ types, categories, onClose, onCreate }: {
  types: ConnectorType[];
  categories: string[];
  onClose: () => void;
  onCreate: (c: Connector) => void;
}) {
  const [step, setStep]         = useState<"type"|"config">("type");
  const [selType, setSelType]   = useState<ConnectorType | null>(null);
  const [name, setName]         = useState("");
  const [category, setCategory] = useState("general");
  const [fields, setFields]     = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState("");

  const create = async () => {
    if (!selType || !name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const config: Record<string, any> = {};
      for (const f of selType.fields) {
        const val = fields[f.name] ?? f.default ?? "";
        if (f.name.includes("_ids") || f.name.includes("_keys")) {
          config[f.name] = val ? val.split(",").map((s: string) => s.trim()) : [];
        } else {
          config[f.name] = val;
        }
      }
      const result = await post("/connectors", { name: name.trim(), connector_type: selType.type, config, category });
      onCreate(result);
    } catch (e) { setError(String(e)); }
    finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-medium text-slate-900">Add connector</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div className="p-6">
          {step === "type" ? (
            <>
              <p className="text-xs text-slate-500 mb-4">Choose a source type</p>
              <div className="grid grid-cols-3 gap-3">
                {types.map(t => (
                  <button key={t.type} onClick={() => { setSelType(t); setStep("config"); }}
                    className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors">
                    <span className="text-2xl">{TYPE_ICONS[t.type] ?? "🔌"}</span>
                    <span className="text-xs font-medium text-slate-700">{t.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setStep("type")} className="text-xs text-brand-600 hover:text-brand-700 mb-4 flex items-center gap-1">
                ← Back
              </button>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Connector name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={`My ${selType?.label}`}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ingest into category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                    {categories.map(c => <option key={c} value={c}>{c.replace(/_/g," ")}</option>)}
                  </select>
                </div>
                {selType?.fields.map(f => (
                  <div key={f.name}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {f.label}{f.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea value={fields[f.name] ?? ""} onChange={e => setFields(p => ({ ...p, [f.name]: e.target.value }))}
                        rows={3} placeholder="Paste JSON here"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                    ) : (
                      <input type={f.type === "password" ? "password" : "text"}
                        value={fields[f.name] ?? f.default ?? ""}
                        onChange={e => setFields(p => ({ ...p, [f.name]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
              <div className="flex gap-3 mt-5">
                <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
                <Button onClick={create} disabled={!name.trim() || creating} className="flex-1 justify-center">
                  {creating ? "Creating…" : "Create connector"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [types, setTypes]           = useState<ConnectorType[]>([]);
  const [categories, setCategories] = useState<string[]>(["general"]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (spin = false) => {
    if (spin) setRefreshing(true);
    const [cs, ts] = await Promise.all([get("/connectors"), get("/connectors/types")]);
    setConnectors(Array.isArray(cs) ? cs : []);
    setTypes(Array.isArray(ts) ? ts : []);
    setLoading(false); setRefreshing(false);
    const cats = await get("/documents/categories/list").catch(() => []);
    if (Array.isArray(cats)) setCategories(cats.map((c: any) => c.name));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    await del_(`/connectors/${id}`);
    setConnectors(prev => prev.filter(c => c.id !== id));
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`${API}/connectors/${id}`, { method: "PATCH", headers: hdr(), body: JSON.stringify({ is_active: active }) });
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
  };

  const handleSyncAll = async () => {
    setRefreshing(true);
    await Promise.all(connectors.filter(c => c.is_active).map(c => post(`/connectors/${c.id}/sync`)));
    setTimeout(() => load(false).then(() => setRefreshing(false)), 2000);
  };

  const active   = connectors.filter(c => c.is_active).length;
  const synced   = connectors.filter(c => c.last_sync_status === "success").length;
  const failed   = connectors.filter(c => c.last_sync_status === "failed").length;

  return (
    <div className="p-8">
      <PageHeader
        title="Connectors"
        description="Configure and manage data source connectors for automatic ingestion"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleSyncAll} disabled={refreshing || active === 0}>
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""}/> Sync all
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14}/> Add connector
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total connectors" value={connectors.length} icon={Link2 as any} />
        <StatCard label="Active"           value={active}           icon={CheckCircle as any} color="text-green-500" />
        <StatCard label="Synced ok"        value={synced}           icon={RefreshCw as any}   color="text-teal-600" />
        <StatCard label="Failed"           value={failed}           icon={AlertTriangle as any} color="text-red-500" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
      ) : connectors.length === 0 ? (
        <div className="text-center py-16">
          <Link2 size={36} className="mx-auto mb-3 text-slate-200"/>
          <p className="text-sm text-slate-500 font-medium">No connectors yet</p>
          <p className="text-xs text-slate-400 mt-1">Add a connector to automatically ingest documents from S3, Google Drive, Confluence, Notion, or OneDrive.</p>
          <Button className="mt-4" onClick={() => setShowAdd(true)}><Plus size={14}/> Add first connector</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {connectors.map(c => (
            <ConnectorCard key={c.id} conn={c}
              onSync={() => load(true)}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddModal types={types} categories={categories} onClose={() => setShowAdd(false)}
          onCreate={c => { setConnectors(prev => [c, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
