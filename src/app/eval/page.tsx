"use client";
import { useState, useEffect } from "react";
import { BarChart2, Play, Plus, Trash2, RefreshCw, CheckCircle } from "lucide-react";
import { runEval, fetchEvalResults, fetchCategories } from "@/lib/api";
import type { EvalResult, EvalSummary, Category } from "@/lib/types";
import { PageHeader, Button, Card, CategoryBadge, Spinner } from "@/components/ui";

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct   = Math.round(value * 100);
  const color = value >= 0.8 ? "bg-green-500" : value >= 0.6 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 capitalize">{label.replace(/_/g, " ")}</span>
        <span className={`font-medium ${value >= 0.8 ? "text-green-600" : value >= 0.6 ? "text-amber-600" : "text-red-500"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: EvalResult | EvalSummary }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <CategoryBadge category={result.category} />
          <p className="text-xs text-slate-400 mt-1">
            {new Date(result.run_at).toLocaleString()} · {result.n_questions} questions
          </p>
        </div>
        <CheckCircle size={16} className="text-green-500 shrink-0" />
      </div>
      <div className="space-y-3">
        {Object.entries(result.metrics).map(([k, v]) => (
          <MetricBar key={k} label={k} value={v} />
        ))}
      </div>
    </Card>
  );
}

interface QAPair { question: string; ground_truth: string; }

export default function EvalPage() {
  const [categories, setCategories]   = useState<Category[]>([]);
  const [category, setCategory]       = useState("general");
  const [topN, setTopN]               = useState(10);
  const [qaPairs, setQaPairs]         = useState<QAPair[]>([
    { question: "", ground_truth: "" },
  ]);
  const [useInline, setUseInline]     = useState(true);
  const [running, setRunning]         = useState(false);
  const [result, setResult]           = useState<EvalResult | null>(null);
  const [history, setHistory]         = useState<EvalSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    fetchCategories().then(setCategories);
    fetchEvalResults().then(h => { setHistory(h); setLoadingHistory(false); }).catch(() => setLoadingHistory(false));
  }, []);

  const addPair = () => setQaPairs(prev => [...prev, { question: "", ground_truth: "" }]);
  const removePair = (i: number) => setQaPairs(prev => prev.filter((_, j) => j !== i));
  const updatePair = (i: number, field: keyof QAPair, val: string) =>
    setQaPairs(prev => prev.map((p, j) => j === i ? { ...p, [field]: val } : p));

  const runEvaluation = async () => {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const validPairs = qaPairs.filter(p => p.question.trim() && p.ground_truth.trim());
      if (useInline && validPairs.length === 0) {
        setError("Add at least one question and ground truth.");
        return;
      }
      const r = await runEval({
        category,
        top_n: topN,
        qa_pairs: useInline ? validPairs : undefined,
      });
      setResult(r);
      // refresh history
      fetchEvalResults().then(setHistory).catch(() => {});
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Evaluation"
        description="Run RAGAS evaluation to measure retrieval and generation quality"
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-medium text-slate-900 mb-4">Configure evaluation</h2>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                  {categories.map(c => (
                    <option key={c.category_id} value={c.name}>{c.name.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Top N chunks</label>
                <select value={topN} onChange={e => setTopN(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                  {[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setUseInline(true)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                  useInline ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                Inline QA pairs
              </button>
              <button onClick={() => setUseInline(false)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                  !useInline ? "bg-brand-600 text-white border-brand-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                CSV file on server
              </button>
            </div>

            {useInline ? (
              <div className="space-y-3">
                {qaPairs.map((pair, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">Q{i + 1}</span>
                      {qaPairs.length > 1 && (
                        <button onClick={() => removePair(i)} className="text-slate-300 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <input
                      value={pair.question}
                      onChange={e => updatePair(i, "question", e.target.value)}
                      placeholder="Question…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <input
                      value={pair.ground_truth}
                      onChange={e => updatePair(i, "ground_truth", e.target.value)}
                      placeholder="Expected answer / ground truth…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                ))}
                <button onClick={addPair}
                  className="w-full py-2 text-sm text-brand-600 border border-dashed border-brand-200 rounded-lg hover:bg-brand-50 flex items-center justify-center gap-1">
                  <Plus size={14} /> Add question
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-500">
                Place a file at <code className="bg-white px-1 rounded text-slate-700">eval/golden_qa_{"{category}"}.csv</code> on the server.<br />
                Format: <code className="bg-white px-1 rounded text-slate-700">question,ground_truth</code>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <Button onClick={runEvaluation} disabled={running} className="mt-5 w-full justify-center">
              {running ? <><Spinner size={14} /> Running RAGAS evaluation…</> : <><Play size={14} /> Run evaluation</>}
            </Button>

            {running && (
              <p className="mt-2 text-center text-xs text-slate-400">
                This may take 1–3 minutes depending on the number of questions and LLM latency.
              </p>
            )}
          </Card>

          {result && (
            <div>
              <h2 className="text-sm font-medium text-slate-700 mb-3">Latest result</h2>
              <ResultCard result={result} />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-700 mb-3">Results history</h2>
          {loadingHistory ? (
            <div className="text-center py-8"><Spinner /></div>
          ) : history.length === 0 ? (
            <Card className="p-8 text-center">
              <BarChart2 size={28} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-slate-400">No evaluation runs yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => <ResultCard key={i} result={h} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
