"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { GhostButton } from "@/components/ui/GhostButton";
import { FadeIn } from "@/components/ui/FadeIn";
import { Sparkles, RefreshCcw, Search, ArrowLeft, Loader2 } from "lucide-react";

interface PageMeta {
  path: string;
  title: string;
  summary: string;
  version: number;
  updated_at: string;
}
interface FullPage extends PageMeta {
  content: string;
}

const SECTION_ORDER = [
  "core",
  "products",
  "routines",
  "concerns",
  "ingredients",
  "allergens",
  "goals",
  "progress",
  "comparisons",
  "notes",
] as const;

const SECTION_LABEL: Record<string, string> = {
  core: "Core",
  products: "Products",
  routines: "Routines",
  concerns: "Concerns",
  ingredients: "Ingredients",
  allergens: "Allergens",
  goals: "Goals",
  progress: "Progress",
  comparisons: "Comparisons",
  notes: "Notes",
};

export default function WikiPage() {
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FullPage | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [filter, setFilter] = useState("");
  const [searchResults, setSearchResults] = useState<
    { path: string; title: string; summary: string; snippet: string }[] | null
  >(null);
  const [seeding, setSeeding] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadIndex = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wiki/page");
      const data = await res.json();
      if (res.ok) setPages(data.pages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  // Select "overview" by default once the index is in.
  useEffect(() => {
    if (!selected && pages.length > 0) {
      const overview = pages.find((p) => p.path === "overview");
      if (overview) openPage(overview.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, selected]);

  async function openPage(path: string) {
    setLoadingPage(true);
    try {
      const res = await fetch(`/api/wiki/page?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (res.ok) setSelected(data.page);
    } finally {
      setLoadingPage(false);
    }
  }

  async function runSeed() {
    setSeeding(true);
    setToast(null);
    try {
      const res = await fetch("/api/wiki/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setToast(`Seeded ${data.pages ?? 0} pages.`);
        await loadIndex();
      } else {
        setToast(data.error ?? "Seed failed");
      }
    } finally {
      setSeeding(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function runMaintenance() {
    setMaintenance(true);
    setToast(null);
    try {
      const res = await fetch("/api/wiki/worker?batch=5", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setToast(`Drained ${data.drained ?? 0} jobs.`);
        await loadIndex();
      } else {
        setToast(data.error ?? "Worker failed");
      }
    } finally {
      setMaintenance(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function runSearch(q: string) {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    const res = await fetch("/api/wiki/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit: 12 }),
    });
    const data = await res.json();
    if (res.ok) setSearchResults(data.results ?? []);
  }

  const grouped = useMemo(() => {
    const g: Record<string, PageMeta[]> = {};
    for (const p of pages) {
      const ns = p.path.includes("/") ? p.path.split("/")[0] : "core";
      (g[ns] ??= []).push(p);
    }
    return g;
  }, [pages]);

  return (
    <div className="relative min-h-screen px-4 sm:px-6 py-8 pb-28 max-w-6xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/me" className="text-muted hover:text-accent-ink inline-flex items-center gap-1 text-xs">
            <ArrowLeft size={12} /> back to me
          </Link>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent-deep">Beauty Wiki</p>
            <h1 className="text-h1 font-light font-[family-name:var(--font-heading)]">
              Everything Suki knows about you
            </h1>
            <p className="text-sm text-muted mt-1 max-w-md">
              Suki writes these pages from your products, routines, and chats. Keeps getting
              sharper the more you use the app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GhostButton size="sm" variant="outline" onClick={runSeed} disabled={seeding}>
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span className="ml-1">Reseed</span>
            </GhostButton>
            <GhostButton size="sm" variant="filled" onClick={runMaintenance} disabled={maintenance}>
              {maintenance ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              <span className="ml-1">Run maintenance</span>
            </GhostButton>
          </div>
        </div>
      </FadeIn>

      {toast && (
        <div className="mt-3 text-xs px-3 py-2 rounded-full inline-block bg-accent/10 text-accent-ink border border-accent/20">
          {toast}
        </div>
      )}

      <FadeIn delay={0.1}>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          <Card className="p-3 h-fit sticky top-4">
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  runSearch(e.target.value);
                }}
                placeholder="Search your wiki"
                className="w-full bg-background/60 border border-card-border rounded-full pl-8 pr-3 py-1.5 text-sm outline-none"
              />
            </div>

            {loading ? (
              <div className="h-10 animate-pulse bg-background-deep/30 rounded" />
            ) : searchResults ? (
              <ul className="space-y-1 max-h-[70vh] overflow-y-auto">
                {searchResults.length === 0 && (
                  <li className="text-xs text-muted px-2 py-2">No matches</li>
                )}
                {searchResults.map((r) => (
                  <li key={r.path}>
                    <button
                      onClick={() => openPage(r.path)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-accent/10 transition"
                    >
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-[11px] text-muted truncate">{r.path}</div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {SECTION_ORDER.filter((ns) => grouped[ns]?.length).map((ns) => (
                  <div key={ns}>
                    <div className="text-[10px] uppercase tracking-widest text-muted px-2 mb-1">
                      {SECTION_LABEL[ns]}
                    </div>
                    <ul className="space-y-0.5">
                      {grouped[ns].map((p) => (
                        <li key={p.path}>
                          <button
                            onClick={() => openPage(p.path)}
                            className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                              selected?.path === p.path
                                ? "bg-accent/15 text-accent-ink"
                                : "hover:bg-background-deep/30"
                            }`}
                          >
                            <span className="block truncate">{p.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {pages.length === 0 && !loading && (
                  <div className="px-2 py-4 text-sm text-muted">
                    No pages yet. Tap Reseed to bootstrap from your profile.
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5 min-h-[60vh]">
            {loadingPage ? (
              <div className="h-40 animate-pulse bg-background-deep/30 rounded" />
            ) : selected ? (
              <article>
                <div className="flex items-baseline gap-2 text-[10px] uppercase tracking-widest text-muted mb-1">
                  <span>{selected.path}</span>
                  <span>·</span>
                  <span>v{selected.version}</span>
                  <span>·</span>
                  <span>{new Date(selected.updated_at).toLocaleString()}</span>
                </div>
                <MarkdownView content={selected.content} onLink={openPage} />
              </article>
            ) : (
              <div className="text-sm text-muted">Pick a page on the left.</div>
            )}
          </Card>
        </div>
      </FadeIn>
    </div>
  );
}

// Tiny safe markdown-ish renderer — no deps. Renders #/##/### headings, bold
// (**text**), wiki links [[namespace/slug]], and bullet lines. Everything else
// is preserved as plain text.
function MarkdownView({
  content,
  onLink,
}: {
  content: string;
  onLink: (path: string) => void;
}) {
  const lines = content.split("\n");
  return (
    <div className="prose-sm max-w-none text-[15px] leading-relaxed">
      {lines.map((ln, i) => {
        if (ln.startsWith("# ")) {
          return (
            <h1 key={i} className="text-2xl font-light font-[family-name:var(--font-heading)] mt-1 mb-3">
              {renderInline(ln.slice(2), onLink)}
            </h1>
          );
        }
        if (ln.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-medium mt-5 mb-2">
              {renderInline(ln.slice(3), onLink)}
            </h2>
          );
        }
        if (ln.startsWith("### ")) {
          return (
            <h3 key={i} className="text-sm uppercase tracking-widest text-muted mt-4 mb-1">
              {renderInline(ln.slice(4), onLink)}
            </h3>
          );
        }
        if (ln.startsWith("- ")) {
          return (
            <li key={i} className="ml-5 list-disc text-sm my-0.5">
              {renderInline(ln.slice(2), onLink)}
            </li>
          );
        }
        if (!ln.trim()) return <div key={i} className="h-2" />;
        return (
          <p key={i} className="text-sm my-1">
            {renderInline(ln, onLink)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(
  line: string,
  onLink: (p: string) => void
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[\[([a-z0-9/-]+)\]\]|\*\*([^*]+)\*\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) {
      const path = m[1];
      out.push(
        <button
          key={`l-${key++}`}
          onClick={() => onLink(path)}
          className="text-accent hover:text-accent-deep underline underline-offset-2"
        >
          {path}
        </button>
      );
    } else if (m[2]) {
      out.push(
        <strong key={`b-${key++}`} className="font-medium text-accent-ink">
          {m[2]}
        </strong>
      );
    } else if (m[3]) {
      out.push(
        <em key={`i-${key++}`} className="text-muted">
          {m[3]}
        </em>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
