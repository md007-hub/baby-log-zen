import { FileText, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePro } from "@/hooks/usePro";
import { useFamily } from "@/hooks/useFamily";
import { exportDoctorPdf } from "@/lib/exportPdf";

export function ExportPdfButton() {
  const { isPro, openUpgrade } = usePro();
  const { baby } = useFamily();
  const run = async () => {
    if (!isPro) return openUpgrade("The Doctor PDF export is part of Nestling Pro.");
    try {
      await exportDoctorPdf(baby?.name ?? null);
      toast.success("Report downloaded");
    } catch {
      toast.error("Couldn't create the report");
    }
  };
  return (
    <Button type="button" variant="secondary" onClick={() => void run()} className="mb-4 h-11 w-full rounded-xl">
      <FileText /> Export Doctor PDF
      {!isPro && <Lock className="ml-1 h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}
