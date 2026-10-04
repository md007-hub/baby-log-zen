import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, WifiOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askBabyAi } from "@/lib/ai.functions";
import { buildBabyContext } from "@/lib/babyContext";
import { useHydrated, useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";
import { useFamily } from "@/hooks/useFamily";
import { FREE_AI_DAILY, usePro } from "@/hooks/usePro";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Calm answers to routine baby care questions, any time of night.",
      },
    ],
  }),
  component: AskPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const CHIPS = [
  { label: "🍼 Last feed time & amount", prompt: "When did baby last eat, and how much?" },
  { label: "⏱️ Current wake window", prompt: "How long has baby been awake in the current wake window?" },
  { label: "📊 Today's daily summary", prompt: "Give me a summary of today's feeds, diapers and sleep." },
  { label: "😴 Nap schedule for today", prompt: "Based on the last 3 days of sleep and baby's age, suggest a nap schedule for the rest of today." },
  { label: "🌙 Night sleep review", prompt: "Review the last 3 nights of sleep. Any patterns, and what could help longer stretches?" },
  { label: "💡 Fussy baby soothing tips", prompt: "Baby is fussy. What soothing tips could help right now, given today's log?" },
];

function Greeting() {
  return (
    <div className="rounded-3xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold leading-tight">Nanny AI</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">
        Hi, I'm Nanny AI. Need tips for improving nap duration or feeding?
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        I'm here for routine nursery, feeding, and sleep guidance. Always consult your
        pediatrician for medical emergencies.
      </p>
    </div>
  );
}

function AskPage() {
  const hydrated = useHydrated();
  const online = useOnline();
  const offline = hydrated && !online;

  const ask = useServerFn(askBabyAi);
  const { user, baby } = useFamily();
  const { isPro, openUpgrade } = usePro();
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
    if (!(await consumeQuestion(!!user, isPro))) {
      openUpgrade(LIMIT_MSG);
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
       const context = await buildBabyContext(baby).catch(() => undefined);
      const res = await ask({ data: { messages: next, context } });
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
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col pt-1">
      <h1 className="mb-4 text-2xl font-bold">Nanny AI</h1>

      {messages.length === 0 && <Greeting />}

      <div className="mt-3 flex-1 space-y-3 pb-36">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto rounded-3xl rounded-br-lg bg-sleep px-4 py-2.5 text-sleep-foreground shadow-soft"
                : "mr-auto rounded-3xl rounded-bl-lg bg-card px-4 py-3 text-card-foreground shadow-soft",
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
        <div ref={endRef} className="scroll-mb-40" />
      </div>

      {offline && (
        <p className="mb-2 flex items-center gap-2 rounded-xl bg-offline/15 px-3 py-2.5 text-sm font-medium text-offline">
          <WifiOff className="h-4 w-4" />
          Nanny AI requires an internet connection.
        </p>
      )}

      <div className="sticky bottom-20 z-10 -mx-4 bg-background/95 px-4 pb-2 pt-2 backdrop-blur">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={offline || loading}
            onClick={() => void send(c.prompt)}
            className="min-h-10 shrink-0 whitespace-nowrap rounded-full border border-border/60 bg-card px-4 text-sm font-medium shadow-soft transition hover:bg-muted active:scale-[0.98] disabled:opacity-50"
          >
            {c.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 rounded-3xl bg-card p-2 shadow-soft"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={offline}
          rows={1}
          placeholder={offline ? "Offline — AI unavailable" : "Ask Nanny AI anything..."}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={offline || loading || input.trim().length === 0}
          aria-label="Send"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
      <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground">
        Nanny AI provides general guidance and is not a substitute for professional medical advice.
      </p>
      </div>
    </div>
  );
}
