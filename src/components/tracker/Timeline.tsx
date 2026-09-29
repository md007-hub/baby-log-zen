import { useLiveQuery } from "dexie-react-hooks";
import { Milk, Moon, Trash2 } from "lucide-react";
import { db, deleteLog, startOfToday, type LogEntry } from "@/lib/db";
import { useFamily } from "@/hooks/useFamily";
import { cn } from "@/lib/utils";

function DiaperIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="14" y="2" width="7" height="6" rx="2" />
      <path d="M15 8v9a5 5 0 0 1-10 0V6a2 2 0 0 1 4 0v11" />
    </svg>
  );
}

const meta = {
  feed: { icon: Milk, className: "bg-feed text-feed-foreground" },
  diaper: { icon: DiaperIcon, className: "bg-diaper text-diaper-foreground" },
  sleep: { icon: Moon, className: "bg-sleep text-sleep-foreground" },
} as const;

function time(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function Timeline() {
  const { baby } = useFamily();
  const logs = useLiveQuery(
    () => db.logs.where("timestamp").aboveOrEqual(startOfToday()).reverse().sortBy("timestamp"),
    [],
    [] as LogEntry[],
  );

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-base font-bold">Today</h2>
      {logs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Nothing logged yet today. Tap a button above to start.
        </p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const { icon: Icon, className } = meta[log.type];
            return (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft"
              >
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", className)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{log.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {time(log.timestamp)}
                    {log.notes ? ` · ${log.notes}` : ""}
                    {baby && log.sync_status === "pending" ? " · not synced yet" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete entry"
                  onClick={() => deleteLog(log)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
