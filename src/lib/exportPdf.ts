import { db, type LogEntry } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { latestPercentiles, ordinal, sexOf, type GrowthRow } from "@/lib/growth";

/** Parses stored durations: "HH:MM:SS", "MM:SS", or plain seconds. Returns seconds or null. */
export function parseDurationSec(raw?: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d+(:\d{1,2}){1,2}$/.test(s)) {
    const parts = s.split(":").map(Number);
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const fmtDur = (sec: number) => {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};

const mlOf = (v: string) => {
  const ml = /(\d+(?:\.\d+)?)\s*ml/i.exec(v);
  if (ml) return Number(ml[1]);
  const oz = /(\d+(?:\.\d+)?)\s*oz/i.exec(v);
  return oz ? Number(oz[1]) * 29.5735 : 0;
};

const CATEGORY: Record<string, string> = { feed: "Feed", diaper: "Diaper", sleep: "Sleep", tummy: "Tummy time", pumping: "Pumping", solids: "Solids" };

function details(e: LogEntry) {
  if (e.type === "sleep" || e.type === "tummy") {
    const sec = parseDurationSec(e.notes);
    return `${e.value} · ${sec === null ? "Ongoing" : fmtDur(sec)}`;
  }
  if ((e.type === "feed" || e.type === "pumping") && e.notes) {
    const sec = parseDurationSec(e.notes);
    return sec === null ? e.value : `${e.value} · ${fmtDur(sec)}`;
  }
  return e.notes ? `${e.value} — ${e.notes}` : e.value;
}

/** Builds a doctor-friendly PDF of the last `days` days of logs and downloads it. */
export async function exportDoctorPdf(babyName: string | null, days = 7) {
  const { jsPDF } = await import("jspdf");
  const since = Date.now() - days * 86400000;
  const logs = await db.logs.where("timestamp").above(since).sortBy("timestamp");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = 56;

  // Header
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(30);
  doc.text(`Care report${babyName ? ` — ${babyName}` : ""}`, M, y);
  y += 18;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(110);
  doc.text(`Period: ${new Date(since).toLocaleDateString()} – ${new Date().toLocaleDateString()}`, M, y);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, y, { align: "right" });
  y += 22;

  // Summary card
  const feeds = logs.filter((l) => l.type === "feed");
  const ml = Math.round(feeds.reduce((s, l) => s + mlOf(l.value), 0));
  const sleepSec = logs.filter((l) => l.type === "sleep").reduce((s, l) => s + (parseDurationSec(l.notes) ?? 0), 0);
  const diapers = logs.filter((l) => l.type === "diaper");
  const count = (k: string) => diapers.filter((d) => d.value.toLowerCase().startsWith(k)).length;
  const cells: [string, string, string][] = [
    ["Feeds & volume", `${feeds.length} feeds`, ml ? `${ml} ml (${(ml / 29.5735).toFixed(1)} oz)` : "No bottle volume"],
    ["Total sleep", fmtDur(sleepSec), `${logs.filter((l) => l.type === "sleep").length} sleeps`],
    ["Diapers", `${diapers.length} total`, `Wet ${count("wet")} / Poop ${count("dirty") + count("poop")} / Mixed ${count("both") + count("mixed")}`],
  ];
  const cardH = 62;
  doc.setFillColor(245, 243, 238).setDrawColor(225).roundedRect(M, y, W - 2 * M, cardH, 6, 6, "FD");
  const cw = (W - 2 * M) / 3;
  cells.forEach(([label, main, sub], i) => {
    const x = M + i * cw + 14;
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(120).text(label.toUpperCase(), x, y + 17);
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(30).text(main, x, y + 35);
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(90).text(sub, x, y + 50);
    if (i) doc.setDrawColor(220).line(M + i * cw, y + 10, M + i * cw, y + cardH - 10);
  });
  y += cardH + 18;

  // Latest growth (WHO percentiles)
  try {
    const babyId = localStorage.getItem("nestling-baby-id");
    if (babyId) {
      const [{ data: b }, { data: g }] = await Promise.all([
        supabase.from("babies").select("gender, birth_date, date_kind").eq("id", babyId).maybeSingle(),
        supabase.from("baby_growth").select("*").eq("baby_id", babyId),
      ]);
      const latest = latestPercentiles((g ?? []) as GrowthRow[], sexOf(b?.gender), b?.date_kind === "birth" ? b?.birth_date ?? null : null);
      if (latest.length) {
        const unit = { weight: "kg", length: "cm", head: "cm" } as const;
        const text = latest.map((l) => `${l.metric === "head" ? "Head circ." : l.metric[0]!.toUpperCase() + l.metric.slice(1)}: ${l.value} ${unit[l.metric]}${l.pct != null ? ` (${ordinal(l.pct)} %ile)` : ""} on ${l.date}`).join("   ·   ");
        doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(30).text("Latest growth (WHO standards)", M, y);
        doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(60);
        const lines = doc.splitTextToSize(text, W - 2 * M) as string[];
        doc.text(lines, M, y + 14);
        y += 14 + lines.length * 12;
      }
    }
  } catch { /* growth is optional */ }
  y += 10;

  // Table
  const cols = [
    { label: "Time", x: M + 8, w: 62 },
    { label: "Category", x: M + 78, w: 72 },
    { label: "Details", x: M + 158, w: W - 2 * M - 158 - 78 },
    { label: "Logged by", x: W - M - 70, w: 62 },
  ];
  const rowH = 20;
  const tableHeader = () => {
    doc.setFillColor(55, 65, 81).rect(M, y, W - 2 * M, rowH, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(255);
    cols.forEach((c) => doc.text(c.label, c.x, y + 13.5));
    y += rowH;
  };
  const ensure = (need: number, withHeader: boolean) => {
    if (y + need > H - 56) {
      doc.addPage();
      y = 56;
      if (withHeader) tableHeader();
    }
  };

  if (!logs.length) {
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90).text("No entries logged in this period.", M, y);
  }

  const byDay = new Map<string, LogEntry[]>();
  for (const l of logs) {
    const k = new Date(l.timestamp).toDateString();
    byDay.set(k, [...(byDay.get(k) ?? []), l]);
  }

  for (const [day, entries] of [...byDay.entries()].reverse()) {
    ensure(rowH * 3 + 22, false);
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30).text(day, M, y + 10);
    y += 18;
    tableHeader();
    entries.forEach((e, i) => {
      ensure(rowH, true);
      if (i % 2 === 0) doc.setFillColor(248, 247, 244).rect(M, y, W - 2 * M, rowH, "F");
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
      const row = [
        new Date(e.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        CATEGORY[e.type] ?? e.type,
        details(e),
        "Parent",
      ];
      row.forEach((txt, ci) => {
        const fitted = doc.splitTextToSize(txt, cols[ci]!.w)[0] as string;
        doc.text(fitted, cols[ci]!.x, y + 13.5);
      });
      y += rowH;
    });
    doc.setDrawColor(220).line(M, y, W - M, y);
    y += 20;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(130);
    doc.text("Parent-logged data from Nestling. Not a medical record.", M, H - 28);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 28, { align: "right" });
  }

  doc.save(`nestling-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
