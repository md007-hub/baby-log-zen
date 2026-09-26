import Dexie, { type Table } from "dexie";

export type LogType = "feed" | "diaper" | "sleep";
export type SyncStatus = "synced" | "pending";

export interface LogEntry {
  id?: number;
  type: LogType;
  value: string;
  notes?: string;
  timestamp: number;
  sync_status: SyncStatus;
}

class NurseryDB extends Dexie {
  logs!: Table<LogEntry, number>;

  constructor() {
    super("nurseryshift");
    this.version(1).stores({
      logs: "++id, type, timestamp, sync_status",
    });
  }
}

export const db = new NurseryDB();

export async function addLog(entry: Omit<LogEntry, "id" | "timestamp" | "sync_status"> & {
  timestamp?: number;
}) {
  return db.logs.add({
    ...entry,
    timestamp: entry.timestamp ?? Date.now(),
    sync_status: typeof navigator !== "undefined" && navigator.onLine ? "synced" : "pending",
  });
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
