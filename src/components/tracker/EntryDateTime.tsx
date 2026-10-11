import { DatePicker } from "@/components/ui/date-picker";
import { localDateTime } from "@/lib/logTime";

export function EntryDateTime({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const displayed = value || localDateTime(new Date());
  const [date = "", time = ""] = displayed.split("T");
  return (
    <div className="mb-3 grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] items-end gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold">Date</p>
        <DatePicker label={`${label} date`} value={date} onChange={(next) => onChange(`${next}T${time}`)} maxDate={new Date()} />
      </div>
      <label className="min-w-0 text-sm font-semibold">Time
        <input aria-label={`${label} time`} type="time" required value={time} onChange={(event) => onChange(`${date}T${event.target.value}`)} className="mt-1.5 h-12 w-full min-w-0 rounded-xl border border-input bg-card px-2 text-base font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sage-foreground/30" />
      </label>
    </div>
  );
}