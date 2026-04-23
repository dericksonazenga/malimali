import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { downloadPDF } from "@/utils/downloadPDF";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  title: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: string[];
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
}

const PDFDownloadButton = ({
  title,
  filename,
  headers,
  rows,
  summary,
  label = "PDF",
  size = "sm",
  variant = "outline",
}: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (rows.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    try {
      setLoading(true);
      await downloadPDF({ title, filename, headers, rows, summary });
      toast.success(`${title} downloaded`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      {size !== "icon" && <span>{label}</span>}
    </Button>
  );
};

export default PDFDownloadButton;
