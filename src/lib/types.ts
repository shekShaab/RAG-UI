export type DocStatus = "pending" | "processing" | "processed" | "failed";
export type ChunkStrategy = "hierarchical" | "recursive" | "semantic";

export interface Document {
  doc_id: string;
  filename: string;
  source_type: string;
  category: string;
  content_hash: string;
  file_size: number;
  mime_type: string;
  status: DocStatus;
  is_active: boolean;
  version: number;
  chunk_count: number;
  error_msg?: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Category {
  category_id: string;
  name: string;
  description: string;
  ttl_days: number;
  qdrant_collection: string;
  chunk_strategy: ChunkStrategy;
  created_at: string;
}

export interface Reference {
  ref_id: number;
  chunk_id: string;
  source_filename: string;
  heading_path?: string | null;
  score: number;
}

export interface QueryResponse {
  query: string;
  answer: string;
  references: Reference[];
  latency_ms: number;
  category: string;
}

export interface QueryRequest {
  query: string;
  category: string;
  top_n?: number;
  conversation_history?: Array<{ role: "user" | "assistant"; content: string }>;
  use_cache?: boolean;
  use_hyde?: boolean;
  use_rewrite?: boolean;
  use_decompose?: boolean;
}

export interface StreamEvent {
  type: "references" | "chunk" | "done";
  data?: Reference[] | string;
  latency_ms?: number;
}

export interface HealthStatus {
  status: string;
  embedding_provider: string;
  embedding_model: string;
  llm_model: string;
  reranker_enabled: boolean;
  typesense_enabled: boolean;
}

export interface UploadResult extends Document {
  original_filename?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: Reference[];
  latency_ms?: number;
  category?: string;
  error?: boolean;
}

// ── Knowledge / Staleness ─────────────────────────────────────────────────────

export interface StalenessEntry {
  doc_id: string;
  filename: string;
  category: string;
  age_days: number;
  ttl_days: number;
  decay_factor: number;
  is_stale: boolean;
  is_expired: boolean;
}

export interface StalenessSweeep {
  checked: number;
  stale: number;
  expired: number;
  dry_run: boolean;
  stale_ids: string[];
  expired_ids: string[];
}

// ── Knowledge Graph ───────────────────────────────────────────────────────────

export interface GraphNode {
  node_id: string;
  node_type: string;
  description: string;
  doc_ids: string[];
  category?: string;
  weight?: number;
  hop?: number;
}

export interface GraphEdge {
  src: string;
  tgt: string;
  edge_type: string;
  description?: string;
  weight?: number;
}

export interface GraphSubgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStats {
  nodes: number;
  edges: number;
}

// ── Dependency graph ──────────────────────────────────────────────────────────

export interface DepMap {
  nodes: Array<{ id: string; [key: string]: unknown }>;
  edges: Array<{ src: string; tgt: string; [key: string]: unknown }>;
}

// ── Evaluation ────────────────────────────────────────────────────────────────

export interface EvalMetrics {
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
}

export interface EvalResult {
  run_at: string;
  category: string;
  n_questions: number;
  metrics: EvalMetrics;
  per_question?: Array<Record<string, unknown>>;
}

export interface EvalSummary {
  file: string;
  run_at: string;
  category: string;
  n_questions: number;
  metrics: EvalMetrics;
}
