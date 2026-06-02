import type {
  Document, Category, QueryRequest, QueryResponse,
  UploadResult, HealthStatus, StreamEvent,
  StalenessEntry, StalenessSweeep,
  GraphNode, GraphSubgraph, GraphStats,
  DepMap, EvalResult, EvalSummary,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const KEY  = process.env.NEXT_PUBLIC_API_KEY ?? "";

function headers(extra?: Record<string, string>): HeadersInit {
  return {
    "X-API-Key": KEY,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...extra,
  };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function fetchHealth(): Promise<HealthStatus> {
  return json<HealthStatus>(await fetch(`${BASE}/health`, { headers: headers() }));
}

// ── Documents ─────────────────────────────────────────────────────────────────
export async function fetchDocuments(params?: {
  category?: string; status?: string; limit?: number; offset?: number;
}): Promise<{ documents: Document[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.status)   q.set("status", params.status);
  if (params?.limit)    q.set("limit", String(params.limit));
  if (params?.offset)   q.set("offset", String(params.offset));
  return json(await fetch(`${BASE}/documents?${q}`, { headers: headers() }));
}

export async function uploadDocument(file: File, category: string, chunkStrategy?: string): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const q = new URLSearchParams({ category });
  if (chunkStrategy) q.set("chunk_strategy", chunkStrategy);
  return json<UploadResult>(await fetch(`${BASE}/documents/upload?${q}`, {
    method: "POST", headers: { "X-API-Key": KEY }, body: form,
  }));
}

export async function deleteDocument(docId: string): Promise<void> {
  await json(await fetch(`${BASE}/documents/${docId}`, { method: "DELETE", headers: headers() }));
}

export async function fetchCategories(): Promise<Category[]> {
  return json<Category[]>(await fetch(`${BASE}/documents/categories/list`, { headers: headers() }));
}

export async function createCategory(params: {
  name: string; description?: string; ttl_days?: number; chunk_strategy?: string;
}): Promise<Category> {
  const q = new URLSearchParams({ name: params.name });
  if (params.description)    q.set("description", params.description);
  if (params.ttl_days)       q.set("ttl_days", String(params.ttl_days));
  if (params.chunk_strategy) q.set("chunk_strategy", params.chunk_strategy);
  return json<Category>(await fetch(`${BASE}/documents/categories/create?${q}`, {
    method: "POST", headers: headers(),
  }));
}

// ── Query ─────────────────────────────────────────────────────────────────────
export async function queryKB(req: QueryRequest): Promise<QueryResponse> {
  return json<QueryResponse>(await fetch(`${BASE}/query`, {
    method: "POST", headers: headers(), body: JSON.stringify(req),
  }));
}

export async function* streamQuery(req: QueryRequest): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${BASE}/query/stream`, {
    method: "POST", headers: headers(), body: JSON.stringify(req),
  });
  if (!res.ok || !res.body) throw new Error(`Stream error: ${res.status}`);
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (t) { try { yield JSON.parse(t) as StreamEvent; } catch {} }
    }
  }
}

// ── Knowledge — Staleness ─────────────────────────────────────────────────────
export async function fetchStalenessReport(): Promise<StalenessEntry[]> {
  return json<StalenessEntry[]>(await fetch(`${BASE}/knowledge/staleness/report`, { headers: headers() }));
}

export async function runStalenessSweep(dryRun = true): Promise<StalenessSweeep> {
  return json<StalenessSweeep>(await fetch(`${BASE}/knowledge/staleness/sweep?dry_run=${dryRun}`, {
    method: "POST", headers: headers(),
  }));
}

// ── Knowledge — Graph ─────────────────────────────────────────────────────────
export async function fetchGraphStats(): Promise<GraphStats> {
  return json<GraphStats>(await fetch(`${BASE}/knowledge/graph/stats`, { headers: headers() }));
}

export async function searchEntities(q: string, topK = 10): Promise<GraphNode[]> {
  return json<GraphNode[]>(await fetch(
    `${BASE}/knowledge/graph/search?q=${encodeURIComponent(q)}&top_k=${topK}`,
    { headers: headers() }
  ));
}

export async function fetchEntitySubgraph(entityId: string, depth = 2): Promise<GraphSubgraph> {
  return json<GraphSubgraph>(await fetch(
    `${BASE}/knowledge/graph/entity/${encodeURIComponent(entityId)}?depth=${depth}`,
    { headers: headers() }
  ));
}

export async function fetchRelatedEntities(entityId: string, depth = 2): Promise<GraphNode[]> {
  return json<GraphNode[]>(await fetch(
    `${BASE}/knowledge/graph/related/${encodeURIComponent(entityId)}?depth=${depth}`,
    { headers: headers() }
  ));
}

// ── Knowledge — Dependencies ──────────────────────────────────────────────────
export async function fetchDependencyMap(): Promise<DepMap> {
  return json<DepMap>(await fetch(`${BASE}/knowledge/dependencies/map`, { headers: headers() }));
}

export async function cascadeInvalidation(docId: string, dryRun = true) {
  return json(await fetch(`${BASE}/knowledge/dependencies/cascade/${docId}?dry_run=${dryRun}`, {
    method: "POST", headers: headers(),
  }));
}

// ── Evaluation ────────────────────────────────────────────────────────────────
export async function runEval(params: {
  category: string; top_n?: number;
  qa_pairs?: Array<{ question: string; ground_truth: string }>;
}): Promise<EvalResult> {
  return json<EvalResult>(await fetch(`${BASE}/eval/run`, {
    method: "POST", headers: headers(), body: JSON.stringify(params),
  }));
}

export async function fetchEvalResults(): Promise<EvalSummary[]> {
  return json<EvalSummary[]>(await fetch(`${BASE}/eval/results`, { headers: headers() }));
}
