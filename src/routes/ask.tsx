import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, WifiOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askBabyAi } from "@/lib/ai.functions";
import { useHydrated, useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ask")({
  head: () => ({
    meta: [
      { title: "Nanny AI — Nestling" },
      {
        name: "description",
        content:
          "Ask Nanny AI routine baby care questions about feeding, sleep, diapers and soothing.",
      },
      { property: "og:title", content: "Nanny AI — Nestling" },
      {
        property: "og:description",
        content: "Calm answers to routine baby care questions, any time of night.",
      },
    ],
  }),
  component: AskPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How much should a 3-month-old eat?",
  "Tips for a 4am wake-up",
  "Is this many wet diapers normal?",
];

function AskPage() {
  const hydrated = useHydrated();
  const online = useOnline();
  const offline = hydrated && !online;

  const ask = useServerFn(askBabyAi);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading || offline) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col">
      <h1 className="mb-1 text-2xl font-bold">Ask AI</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Routine baby care questions. For anything urgent, call your pediatrician.
      </p>

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={offline}
                onClick={() => send(s)}
                className="tap-card w-full border border-border/60 bg-card p-3 text-left text-sm shadow-soft disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground"
                : "mr-auto text-foreground",
            )}
          >
            {m.role === "assistant" ? (
              <div className="space-y-2 [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {offline && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-offline/15 px-3 py-2.5 text-sm font-medium text-offline">
          <WifiOff className="h-4 w-4" />
          AI Assistant requires an internet connection.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-24 mt-3 flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-lift"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={offline}
          rows={1}
          placeholder={offline ? "Offline — AI unavailable" : "Ask a question…"}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={offline || loading || input.trim().length === 0}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
