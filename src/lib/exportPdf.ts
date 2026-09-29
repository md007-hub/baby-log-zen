import { db } from "@/lib/db";

const fmtDur = (sec: number) => {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
};

/** Builds a doctor-friendly PDF of the last `days` days of logs and downloads it. */
export async function exportDoctorPdf(babyName: string | null, days = 7) {
  const { jsPDF } = await import("jspdf");
  const since = Date.now() - days * 86400000;
  const logs = await db.logs.where("timestamp").above(since).sortBy("timestamp");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Nestling care report${babyName ? ` — ${babyName}` : ""}`, 48, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${new Date(since).toLocaleDateString()} – ${new Date().toLocaleDateString()} · generated ${new Date().toLocaleString()}`,
    48,
    y,
  );
  doc.setTextColor(0);
  y += 28;

  // Group by day
  const byDay = new Map<string, typeof logs>();
  for (const l of logs) {
    const k = new Date(l.timestamp).toDateString();
    byDay.set(k, [...(byDay.get(k) ?? []), l]);
  }

  if (!logs.length) doc.text("No entries logged in this period.", 48, y);

  for (const [day, entries] of [...byDay.entries()].reverse()) {
    const feeds = entries.filter((e) => e.type === "feed");
    const ml = feeds.reduce((s, e) => s + (Number(/(\d+)\s*ml/i.exec(e.value)?.[1]) || 0), 0);
    const diapers = entries.filter((e) => e.type === "diaper");
    const sleepSec = entries.filter((e) => e.type === "sleep").reduce((s, e) => s + (Number(e.notes) || 0), 0);

    if (y > H - 100) {
      doc.addPage();
      y = 56;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(day, 48, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `${feeds.length} feeds${ml ? ` · ${ml}ml` : ""}   ${diapers.length} diapers   ${fmtDur(sleepSec)} sleep`,
      W - 48,
      y,
      { align: "right" },
    );
    y += 8;
    doc.setDrawColor(220);
    doc.line(48, y, W - 48, y);
    y += 14;

    for (const e of entries) {
      if (y > H - 48) {
        doc.addPage();
        y = 56;
      }
      const time = new Date(e.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const extra =
        e.type === "sleep" && e.notes ? ` (${fmtDur(Number(e.notes))})` : e.notes && e.type !== "feed" ? ` — ${e.notes}` : "";
      doc.text(time, 56, y);
      doc.text(e.type[0].toUpperCase() + e.type.slice(1), 130, y);
      doc.text(`${e.value}${extra}`.slice(0, 80), 200, y);
      y += 15;
    }
    y += 12;
  }

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text("Parent-logged data from Nestling. Not a medical record.", 48, H - 28);

  doc.save(`nestling-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
