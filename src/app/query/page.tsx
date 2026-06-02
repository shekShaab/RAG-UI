"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, BookOpen, RefreshCw, ThumbsUp, ThumbsDown, Settings2, Zap } from "lucide-react";
import { streamQuery, fetchCategories } from "@/lib/api";
import type { Message, Reference, Category } from "@/lib/types";
import { Spinner, CategoryBadge } from "@/components/ui";
import SourcePanel from "@/components/query/SourcePanel";

const API  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const AKEY = process.env.NEXT_PUBLIC_API_KEY ?? "abhi1";

let msgId = 0;
const uid = () => String(++msgId);

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/`(.+?)`/g,"<code>$1</code>")
    .replace(/^### (.+)$/gm,"<h3 class='text-sm font-medium text-slate-800 mt-3 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2 class='text-base font-medium text-slate-900 mt-4 mb-1'>$1</h2>")
    .replace(/^- (.+)$/gm,"<li class='ml-4 list-disc'>$1</li>")
    .replace(/\n\n/g,"</p><p class='mb-2'>")
    .replace(/\n/g,"<br/>");
}

function FeedbackBar({ msg, onFeedback }: {
  msg: Message;
  onFeedback: (rating: 1 | -1, msg: Message) => void;
}) {
  const [sent, setSent] = useState<1 | -1 | null>(null);
  if (msg.role !== "assistant" || !msg.content) return null;
  return (
    <div className="flex items-center gap-2 mt-1 px-1">
      {msg.category && <CategoryBadge category={msg.category} />}
      {msg.latency_ms && <span className="text-xs text-slate-300">{msg.latency_ms.toFixed(0)}ms</span>}
      {msg.references && msg.references.length > 0 && (
        <span className="text-xs text-slate-400">{msg.references.length} sources</span>
      )}
      {sent === null ? (
        <div className="ml-auto flex gap-1">
          <button onClick={() => { setSent(1); onFeedback(1, msg); }}
            className="p-1 rounded text-slate-300 hover:text-green-500 hover:bg-green-50 transition-colors">
            <ThumbsUp size={12} />
          </button>
          <button onClick={() => { setSent(-1); onFeedback(-1, msg); }}
            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <ThumbsDown size={12} />
          </button>
        </div>
      ) : (
        <span className={`ml-auto text-xs ${sent > 0 ? "text-green-500" : "text-red-400"}`}>
          {sent > 0 ? "👍 Thanks!" : "👎 Noted"}
        </span>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-xl bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-2xl w-full">
        <div className={`bg-white border rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${msg.error ? "border-red-200 text-red-600" : "border-slate-200"}`}>
          {msg.content
            ? <div className="prose-answer" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
            : <span className="flex items-center gap-2 text-slate-400"><Spinner size={14} /> Thinking…</span>
          }
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={`shrink-0 w-8 rounded-full transition-colors flex items-center px-0.5`}
        style={{ height: "18px", background: checked ? "#2563eb" : "#e2e8f0", marginTop: "1px" }}>
        <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-3.5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export default function QueryPage() {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [category, setCategory]     = useState("general");
  const [topN, setTopN]             = useState(10);
  const [categories, setCategories] = useState<Category[]>([]);
  const [streaming, setStreaming]   = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [activeSources, setActiveSources] = useState<Reference[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useHyde, setUseHyde]       = useState(false);
  const [useRewrite, setUseRewrite] = useState(false);
  const [useDecompose, setUseDecompose] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchCategories().then(setCategories).catch(console.error); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendFeedback = useCallback(async (rating: 1 | -1, msg: Message) => {
    const userMsg = messages.findLast(m => m.role === "user");
    if (!userMsg) return;
    try {
      await fetch(`${API}/feedback`, {
        method: "POST",
        headers: { "X-API-Key": AKEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMsg.content, answer: msg.content,
          rating, category: msg.category ?? category,
        }),
      });
    } catch { /* silent */ }
  }, [messages, category]);

  const handleSubmit = useCallback(async () => {
    const q = input.trim();
    if (!q || streaming) return;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const userMsg: Message = { id: uid(), role: "user", content: q };
    const asstMsg: Message = { id: uid(), role: "assistant", content: "", category };
    setMessages(prev => [...prev, userMsg, asstMsg]);
    setInput("");
    setStreaming(true);
    let answer = "", refs: Reference[] = [];
    try {
      for await (const event of streamQuery({
        query: q, category, top_n: topN, conversation_history: history,
        use_hyde: useHyde, use_rewrite: useRewrite, use_decompose: useDecompose,
      })) {
        if (event.type === "references") {
          refs = event.data as Reference[];
        } else if (event.type === "chunk") {
          answer += event.data as string;
          setMessages(prev => prev.map(m => m.id === asstMsg.id ? { ...m, content: answer } : m));
        } else if (event.type === "done") {
          setMessages(prev => prev.map(m =>
            m.id === asstMsg.id ? { ...m, content: answer, references: refs, latency_ms: event.latency_ms } : m
          ));
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === asstMsg.id ? { ...m, content: `Error: ${String(err)}`, error: true } : m
      ));
    } finally { setStreaming(false); }
  }, [input, streaming, messages, category, topN, useHyde, useRewrite, useDecompose]);

  const activeCount = [useHyde, useRewrite, useDecompose].filter(Boolean).length;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center gap-3 flex-wrap">
          <h1 className="text-sm font-medium text-slate-900">Query knowledge base</h1>
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none">
              {categories.map(c => <option key={c.category_id} value={c.name}>{c.name.replace(/_/g," ")}</option>)}
            </select>
            <select value={topN} onChange={e => setTopN(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none">
              {[5,10,20].map(n => <option key={n} value={n}>Top {n}</option>)}
            </select>
            <button onClick={() => setShowAdvanced(p => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                activeCount > 0 ? "bg-brand-50 text-brand-700 border-brand-200" : "bg-white text-slate-500 border-slate-200"}`}>
              <Settings2 size={12} />
              Options
              {activeCount > 0 && <span className="bg-brand-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
            </button>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <RefreshCw size={12}/> Clear
              </button>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-3 gap-6 max-w-2xl">
              <Toggle label="HyDE" checked={useHyde} onChange={setUseHyde} description="Embed hypothetical answer for better semantic match" />
              <Toggle label="Query rewrite" checked={useRewrite} onChange={setUseRewrite} description="Improve and expand query before retrieval" />
              <Toggle label="Decompose" checked={useDecompose} onChange={setUseDecompose} description="Break complex questions into sub-queries" />
            </div>
            {activeCount > 0 && <p className="mt-2 text-xs text-amber-600 flex items-center gap-1"><Zap size={11}/> Active options add 0.5–2s latency.</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <BookOpen size={36} className="mx-auto mb-3 text-slate-200"/>
                <p className="text-slate-500 text-sm font-medium">Ask your knowledge base</p>
                <div className="mt-4 space-y-2">
                  {["Summarise the uploaded documents","What are the key policies?","Explain the main workflow"].map(hint => (
                    <button key={hint} onClick={() => { setInput(hint); textareaRef.current?.focus(); }}
                      className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={msg.id}>
              <MessageBubble msg={msg} />
              {msg.role === "assistant" && (
                <FeedbackBar msg={msg} onFeedback={sendFeedback} />
              )}
              {msg.role === "assistant" && msg.references && msg.references.length > 0 && (
                <div className="mt-0.5 px-1">
                  <button onClick={() => { setActiveSources(msg.references!); setShowSources(true); }}
                    className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <BookOpen size={11}/> View {msg.references.length} sources
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-3">
            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask a question… (Enter to send)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32"
            />
            <button onClick={handleSubmit} disabled={!input.trim() || streaming}
              className="shrink-0 w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-40">
              {streaming ? <Spinner size={16}/> : <Send size={16}/>}
            </button>
          </div>
        </div>
      </div>

      {showSources && <SourcePanel references={activeSources} onClose={() => setShowSources(false)} />}
    </div>
  );
}
