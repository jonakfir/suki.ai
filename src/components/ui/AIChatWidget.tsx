"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi — I'm suki. Tell me about your skin, or ask me anything about a product or ingredient.",
};

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamed, setStreamed] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamed, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setStreamed("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const full: string = data.text;

      // Client-side typewriter
      await new Promise<void>((resolve) => {
        let i = 0;
        const id = setInterval(() => {
          i += 3;
          setStreamed(full.slice(0, i));
          if (i >= full.length) {
            clearInterval(id);
            resolve();
          }
        }, 15);
      });

      setMessages((m) => [...m, { role: "assistant", content: full }]);
      setStreamed("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `I hit an error reaching Claude: ${msg}`,
        },
      ]);
      setStreamed("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-accent to-lavender shadow-[0_10px_30px_rgba(30,91,184,0.45),0_0_40px_rgba(90,154,232,0.5)] flex items-center justify-center text-white"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? "Close chat" : "Open chat with suki."}
      >
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {open ? <X size={22} /> : <Sparkles size={22} />}
        </motion.div>
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-white/50"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-[22rem] max-h-[min(32rem,calc(100vh-8rem))] rounded-3xl overflow-hidden border border-white/40 bg-card/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(30,91,184,0.45)] flex flex-col"
          >
            <div className="px-5 py-4 border-b border-card-border/50 flex items-center gap-3 bg-gradient-to-r from-accent/10 via-transparent to-lavender/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-lavender flex items-center justify-center shadow-[0_0_20px_rgba(90,154,232,0.5)]">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-[family-name:var(--font-script)] text-xl leading-none text-accent-ink">
                  suki.
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted mt-1">
                  Powered by Claude
                </div>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-accent/15 border border-accent/25 rounded-tr-sm"
                        : "bg-background/60 border border-card-border/50 rounded-tl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && streamed && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-background/60 border border-card-border/50">
                    {streamed}
                    <motion.span
                      className="inline-block w-[2px] h-3.5 bg-accent align-middle ml-0.5"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.7, repeat: Infinity }}
                    />
                  </div>
                </div>
              )}
              {loading && !streamed && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-background/60 border border-card-border/50 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="border-t border-card-border/50 p-3 flex items-center gap-2 bg-background/40"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask suki. anything…"
                disabled={loading}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted/60 px-3 py-2"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-40 hover:bg-accent-deep transition"
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
