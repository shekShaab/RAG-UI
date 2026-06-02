"use client";
import { useState, useEffect } from "react";
import {
  Save, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Info, Database, Archive, Zap, RotateCcw,
} from "lucide-react";
import { PageHeader, Button, Card, Spinner } from "@/components/ui";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";
const hdr  = (ct = true) => ({ "X-API-Key": KEY, ...(ct ? { "Content-Type": "application/json" } : {}) });
const get  = (p: string) => fetch(`${API}${p}`, { headers: hdr(false) }).then(r => r.json());
const put  = (p: string, b: any) => fetch(`${API}${p}`, { method: "PUT", headers: hdr(), body: JSON.stringify(b) }).then(r => r.json());
const post = (p: string) => fetch(`${API}${p}`, { method: "POST", headers: hdr(false) }).then(r => r.json());

const LLM_MODELS: Record<string, Array<{ id: string; label: string }>> = {
  openai:    [{ id:"gpt-4o-mini",label:"GPT-4o mini" },{ id:"gpt-4o",label:"GPT-4o" },{ id:"o1-mini",label:"o1-mini" }],
  bedrock:   [{ id:"anthropic.claude-sonnet-4-5-20250929-v1:0",label:"Claude Sonnet 4.5" },{ id:"anthropic.claude-3-5-sonnet-20241022-v2:0",label:"Claude 3.5 Sonnet v2" },{ id:"anthropic.claude-3-haiku-20240307-v1:0",label:"Claude 3 Haiku" },{ id:"meta.llama3-70b-instruct-v1:0",label:"Llama 3 70B" }],
  anthropic: [{ id:"claude-sonnet-4-5",label:"Claude Sonnet 4.5" },{ id:"claude-opus-4-5",label:"Claude Opus 4.5" },{ id:"claude-haiku-4-5",label:"Claude Haiku 4.5" }],
  gemini:    [{ id:"gemini-2.0-flash",label:"Gemini 2.0 Flash" },{ id:"gemini-1.5-pro",label:"Gemini 1.5 Pro" }],
};
const EMBED_MODELS: Record<string, Array<{ id: string; label: string; dims: number }>> = {
  openai:  [{ id:"text-embedding-3-small",label:"text-embedding-3-small (1536d)",dims:1536 },{ id:"text-embedding-3-large",label:"text-embedding-3-large (3072d)",dims:3072 }],
  bedrock: [{ id:"amazon.titan-embed-text-v2:0",label:"Titan Embed v2 (1024d)",dims:1024 },{ id:"amazon.titan-embed-text-v1",label:"Titan Embed v1 (1536d)",dims:1536 },{ id:"cohere.embed-english-v3",label:"Cohere English v3 (1024d)",dims:1024 }],
  gemini:  [{ id:"models/text-embedding-004",label:"text-embedding-004 (768d)",dims:768 }],
  local:   [{ id:"BAAI/bge-m3",label:"BGE-M3 (1024d)",dims:1024 },{ id:"BAAI/bge-large-en-v1.5",label:"BGE-Large English",dims:1024 }],
};

const PROVIDER_LABEL: Record<string,string> = { openai:"OpenAI", bedrock:"AWS Bedrock", anthropic:"Anthropic", gemini:"Google Gemini", local:"Local (CPU)" };
const SEL = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500";
const INP = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500";
const INP_MONO = INP + " font-mono";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-slate-50 last:border-0">
      <div className="pt-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}
const InfoBox = ({ t }: { t: string }) => <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mt-3"><Info size={13} className="shrink-0 mt-0.5"/>{t}</div>;
const WarnBox = ({ t }: { t: string }) => <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mt-3"><AlertTriangle size={13} className="shrink-0 mt-0.5"/>{t}</div>;
const CritBox = ({ t }: { t: string }) => <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mt-3"><AlertTriangle size={13} className="shrink-0 mt-0.5"/>{t}</div>;

type SaveResult = { status?: string; hot_reloaded?: string[]; restart_required?: string[]; message?: string };

export default function SettingsPage() {
  const TABS = ["llm","embed","s3","retrieval","infra","connection"] as const;
  type Tab = typeof TABS[number];
  const TAB_LABELS: Record<Tab,string> = { llm:"LLM model", embed:"Embeddings", s3:"S3 storage", retrieval:"Retrieval", infra:"Infrastructure", connection:"Connection" };

  const [tab, setTab]           = useState<Tab>("llm");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [health, setHealth]     = useState<any>(null);
  const [backups, setBackups]   = useState<any[]>([]);
  const [backing, setBacking]   = useState(false);
  const [testOk, setTestOk]     = useState<boolean|null>(null);
  const [testing, setTesting]   = useState(false);

  // All editable fields
  const [vals, setVals] = useState<Record<string, string>>({
    llm_provider:"openai", llm_model:"gpt-4o-mini", llm_api_key:"",
    llm_base_url:"", llm_max_tokens:"2048", llm_temperature:"0.2",
    anthropic_api_key:"", gemini_api_key:"",
    aws_access_key_id:"", aws_secret_access_key:"", aws_region:"us-west-2",
    embedding_provider:"openai", embedding_model:"text-embedding-3-small", embedding_dim:"1536",
    s3_upload_bucket:"", s3_backup_bucket:"",
    retrieval_top_k:"50", rerank_top_n:"10", rrf_k:"60",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setVals(p => ({ ...p, [k]: e.target.value }));

  // Load from API on mount
  useEffect(() => {
    get("/settings/flat").then(flat => {
      if (flat && typeof flat === "object") {
        setVals(p => ({ ...p, ...Object.fromEntries(Object.entries(flat).map(([k,v]) => [k, String(v ?? "")])) }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    get("/health").then(setHealth).catch(() => null);
    get("/storage/backup/list").then(b => setBackups(Array.isArray(b) ? b.slice(0,8) : [])).catch(() => null);
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await put("/settings", { settings: vals });
      setSaveResult(result);
      // Refresh health
      get("/health").then(setHealth).catch(() => null);
    } catch (e) {
      setSaveResult({ status:"error", hot_reloaded:[], restart_required:[], message: String(e) });
    } finally { setSaving(false); }
  };

  const testConn = async () => {
    setTesting(true); setTestOk(null);
    try { const r = await fetch(`${API}/health`, { headers: { "X-API-Key": KEY } }); setTestOk(r.ok); if (r.ok) setHealth(await r.json()); }
    catch { setTestOk(false); } finally { setTesting(false); }
  };

  const backup = async (type: string) => {
    setBacking(true);
    await post(`/storage/backup/${type}`).catch(() => null);
    setTimeout(() => { get("/storage/backup/list").then(b => { setBackups(Array.isArray(b) ? b.slice(0,8) : []); setBacking(false); }).catch(() => setBacking(false)); }, 3000);
  };

  const llmModels  = LLM_MODELS[vals.llm_provider] ?? [];
  const embedModels = EMBED_MODELS[vals.embedding_provider] ?? [];

  if (loading) return <div className="p-8 flex items-center gap-3 text-slate-400"><Spinner/> Loading settings from database…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Settings" description="Stored in PostgreSQL — changes persist across restarts"
        action={
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <><Spinner size={13}/> Saving…</> : <><Save size={13}/> Save to database</>}
          </Button>
        }
      />

      {saveResult && (
        <div className={`mb-5 p-4 rounded-xl border text-sm ${(saveResult.restart_required ?? []).length ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          <div className="flex items-center gap-2 font-medium mb-1">
            {(saveResult.restart_required ?? []).length ? <AlertTriangle size={15}/> : <CheckCircle size={15}/>}
            {saveResult.message ?? "Saved"}
          </div>
          {(saveResult.hot_reloaded ?? []).length > 0 && (
            <p className="text-xs flex items-center gap-1 mt-1">
              <Zap size={11}/> Applied immediately: {saveResult.hot_reloaded!.join(", ")}
            </p>
          )}
          {(saveResult.restart_required ?? []).length > 0 && (
            <p className="text-xs flex items-center gap-1 mt-1">
              <RotateCcw size={11}/> Restart backend to apply: {saveResult.restart_required!.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${tab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "llm" && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-900">LLM provider</h2>
            <p className="text-xs text-slate-400 mt-0.5">Generates answers · model changes apply immediately</p>
          </div>
          <div className="px-6 py-4">
            <Field label="Provider">
              <select value={vals.llm_provider} onChange={e => { setVals(p => ({...p, llm_provider:e.target.value, llm_model:LLM_MODELS[e.target.value]?.[0]?.id??""})); }} className={SEL}>
                {["openai","bedrock","anthropic","gemini"].map(p => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select value={vals.llm_model} onChange={set("llm_model")} className={SEL}>
                {llmModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <input value={vals.llm_model} onChange={set("llm_model")} placeholder="Or enter custom model ID" className={`${INP_MONO} mt-2 text-xs`}/>
            </Field>
            {vals.llm_provider === "openai" && <Field label="OpenAI API key"><input type="password" value={vals.llm_api_key} onChange={set("llm_api_key")} placeholder="sk-..." className={INP}/></Field>}
            {vals.llm_provider === "anthropic" && <Field label="Anthropic API key"><input type="password" value={vals.anthropic_api_key} onChange={set("anthropic_api_key")} placeholder="sk-ant-..." className={INP}/></Field>}
            {vals.llm_provider === "gemini" && <Field label="Google API key"><input type="password" value={vals.gemini_api_key} onChange={set("gemini_api_key")} placeholder="AIza..." className={INP}/></Field>}
            {vals.llm_provider === "bedrock" && <>
              <Field label="AWS Access Key ID"><input value={vals.aws_access_key_id} onChange={set("aws_access_key_id")} placeholder="AKIAxxxxxxxx" className={INP}/></Field>
              <Field label="AWS Secret Key"><input type="password" value={vals.aws_secret_access_key} onChange={set("aws_secret_access_key")} className={INP}/></Field>
              <Field label="AWS Region">
                <select value={vals.aws_region} onChange={set("aws_region")} className={SEL}>
                  {["us-east-1","us-west-2","eu-west-1","ap-northeast-1","ap-southeast-2"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <InfoBox t="Enable the model in your AWS Bedrock console for this region before using it."/>
            </>}
            <Field label="Temperature" hint="0 = precise, 1 = creative"><input type="number" step="0.1" min="0" max="1" value={vals.llm_temperature} onChange={set("llm_temperature")} className={INP}/></Field>
            <Field label="Max tokens"><input type="number" step="256" min="256" max="8192" value={vals.llm_max_tokens} onChange={set("llm_max_tokens")} className={INP}/></Field>
            <InfoBox t="Model, temperature, and max tokens reload immediately. Provider/API key changes require restart."/>
          </div>
        </Card>
      )}

      {tab === "embed" && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-900">Embedding provider</h2>
            <p className="text-xs text-slate-400 mt-0.5">Converts text to vectors · changes require restart + re-ingestion</p>
          </div>
          <div className="px-6 py-4">
            <Field label="Provider">
              <select value={vals.embedding_provider} onChange={e => { const ms = EMBED_MODELS[e.target.value]; setVals(p => ({...p, embedding_provider:e.target.value, embedding_model:ms?.[0]?.id??"", embedding_dim:String(ms?.[0]?.dims??1536)})); }} className={SEL}>
                {["openai","bedrock","gemini","local"].map(p => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field label="Model" hint={`Dimensions: ${vals.embedding_dim}`}>
              <select value={vals.embedding_model} onChange={e => { const m = embedModels.find(x => x.id===e.target.value); setVals(p => ({...p, embedding_model:e.target.value, embedding_dim:String(m?.dims??p.embedding_dim)})); }} className={SEL}>
                {embedModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
            {vals.embedding_provider === "bedrock" && <>
              <Field label="AWS Access Key ID"><input value={vals.aws_access_key_id} onChange={set("aws_access_key_id")} className={INP}/></Field>
              <Field label="AWS Secret Key"><input type="password" value={vals.aws_secret_access_key} onChange={set("aws_secret_access_key")} className={INP}/></Field>
            </>}
            {vals.embedding_provider === "gemini" && <Field label="Google API key"><input type="password" value={vals.gemini_api_key} onChange={set("gemini_api_key")} className={INP}/></Field>}
            {vals.embedding_provider === "local" && <InfoBox t="Local models run on CPU in the backend. No API key needed. First startup downloads ~1-2 GB."/>}
            <CritBox t={`Changing embedding provider/model requires: 1) save + restart backend  2) run POST /documents/{id}/reingest for every document (original files re-fetched from S3). Current dimension: ${vals.embedding_dim}`}/>
          </div>
        </Card>
      )}

      {tab === "s3" && (
        <div className="space-y-4">
          <Card>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Database size={16} className="text-teal-500"/>
              <h2 className="text-sm font-medium text-slate-900">Upload bucket</h2>
            </div>
            <div className="px-6 py-4">
              <Field label="Bucket name" hint="Stores every uploaded file permanently"><input value={vals.s3_upload_bucket} onChange={set("s3_upload_bucket")} placeholder="your-rag-bucket" className={INP}/></Field>
              <Field label="AWS Access Key ID"><input value={vals.aws_access_key_id} onChange={set("aws_access_key_id")} className={INP}/></Field>
              <Field label="AWS Secret Key"><input type="password" value={vals.aws_secret_access_key} onChange={set("aws_secret_access_key")} className={INP}/></Field>
              <Field label="AWS Region"><select value={vals.aws_region} onChange={set("aws_region")} className={SEL}>{["us-east-1","us-west-2","eu-west-1","ap-northeast-1","ap-southeast-2"].map(r => <option key={r}>{r}</option>)}</select></Field>
              <InfoBox t="Enable versioning on this bucket. Never set a lifecycle expiry — these files are your source of truth for re-ingestion."/>
            </div>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Archive size={16} className="text-purple-500"/>
              <h2 className="text-sm font-medium text-slate-900">Backup bucket</h2>
            </div>
            <div className="px-6 py-4">
              <Field label="Bucket name" hint="PostgreSQL dumps + Qdrant snapshots"><input value={vals.s3_backup_bucket} onChange={set("s3_backup_bucket")} placeholder="your-rag-data-bak-bucket" className={INP}/></Field>
              <InfoBox t="Set lifecycle rules: postgres-backups/ → expire 30 days, qdrant-backups/ → expire 30 days."/>
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-600 mb-2">Run backup now</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => backup("postgres")} disabled={backing}>PostgreSQL</Button>
                  <Button size="sm" variant="secondary" onClick={() => backup("qdrant")} disabled={backing}>Qdrant</Button>
                  <Button size="sm" onClick={() => backup("all")} disabled={backing}>
                    {backing ? <><RefreshCw size={12} className="animate-spin"/> Running…</> : "Backup all"}
                  </Button>
                </div>
              </div>
              {backups.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {backups.map((b,i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded-lg">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${b.type==="postgres"?"bg-amber-50 text-amber-700":"bg-purple-50 text-purple-700"}`}>{b.type}</span>
                      <span className="text-slate-500 truncate flex-1">{b.key?.split("/").pop()}</span>
                      <span className="text-slate-400">{((b.size_bytes||0)/1024/1024).toFixed(1)} MB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === "retrieval" && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-900">Retrieval parameters</h2>
            <p className="text-xs text-slate-400 mt-0.5">All changes apply immediately — no restart needed</p>
          </div>
          <div className="px-6 py-4">
            <Field label="Top K" hint="Chunks fetched from Qdrant + BM25 before reranking"><input type="number" value={vals.retrieval_top_k} onChange={set("retrieval_top_k")} min="10" max="200" className={INP}/></Field>
            <Field label="Rerank top N" hint="Chunks returned after reranking"><input type="number" value={vals.rerank_top_n} onChange={set("rerank_top_n")} min="1" max="50" className={INP}/></Field>
            <Field label="RRF k" hint="Reciprocal rank fusion constant (default 60)"><input type="number" value={vals.rrf_k} onChange={set("rrf_k")} min="1" max="200" className={INP}/></Field>
            <Field label="Reranker">
              <select value={vals.reranker_enabled} onChange={set("reranker_enabled")} className={SEL}>
                <option value="true">Enabled (cross-encoder/ms-marco)</option>
                <option value="false">Disabled (faster, lower quality)</option>
              </select>
            </Field>
            <InfoBox t="Top K and rerank N apply to the next query — no restart needed."/>
          </div>
        </Card>
      )}

      {tab === "infra" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-900 mb-3">Live system status</h2>
            <p className="text-xs text-slate-400 mb-3">Read from the running backend — reflects what is actually loaded</p>
            {health ? (
              <div className="space-y-2">
                {[["LLM provider",health.llm_provider??"openai"],["LLM model",health.llm_model??"—"],["Embedding model",health.embedding_model??"—"],["Version",health.version??"—"],["Reranker",health.reranker_enabled?"enabled":"disabled"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-mono text-xs font-medium text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Could not reach API</p>}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-900 mb-3">Docker volumes</h2>
            {["postgres_data → PostgreSQL · metadata, analytics, knowledge graph","qdrant_data → Qdrant · all vector embeddings","redis_data → Redis · query cache (AOF)","typesense_data → Typesense · BM25+ index"].map((v,i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 mb-2 bg-slate-50 rounded-lg text-xs">
                <CheckCircle size={13} className="text-green-500 shrink-0"/>
                <span className="font-mono font-medium text-slate-700">{v.split(" → ")[0]}</span>
                <span className="text-slate-400">{v.split(" → ")[1]}</span>
              </div>
            ))}
            <InfoBox t="Named volumes survive docker compose down and container crashes. Only deleted with: docker volume rm rag-qdrant rag-postgres rag-redis"/>
          </Card>
        </div>
      )}

      {tab === "connection" && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-900">Connection</h2>
            <p className="text-xs text-slate-400 mt-0.5">These are browser-only — set in .env.local for persistence</p>
          </div>
          <div className="px-6 py-4">
            <Field label="API URL"><input value={API} readOnly className={`${INP} opacity-60`}/></Field>
            <Field label="API key" hint="Default: abhi1"><input value={KEY} readOnly className={`${INP} opacity-60`}/></Field>
            <div className="flex items-center gap-3 pt-3">
              <Button variant="secondary" size="sm" onClick={testConn} disabled={testing}>
                <RefreshCw size={12} className={testing?"animate-spin":""}/> Test connection
              </Button>
              {testOk===true  && <span className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle size={14}/> Connected</span>}
              {testOk===false && <span className="flex items-center gap-1.5 text-sm text-red-500"><XCircle size={14}/> Failed</span>}
            </div>
            <WarnBox t="Change NEXT_PUBLIC_API_URL and NEXT_PUBLIC_API_KEY in rag-ui/.env.local then restart the UI."/>
          </div>
        </Card>
      )}
    </div>
  );
}
