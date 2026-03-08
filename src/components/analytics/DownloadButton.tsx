import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { downloadCSV } from "@/utils/downloadCSV";
import { toast } from "sonner";

interface Props {
  rows: string[][];
  filename: string;
  label?: string;
}

const DownloadButton = ({ rows, filename, label }: Props) => {
  const handleClick = () => {
    downloadCSV(rows, filename);
    toast.success(`${label || "Report"} downloaded!`);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-primary"
      onClick={handleClick}
      title={`Download ${label || "report"}`}
    >
      <FileSpreadsheet className="w-4 h-4" />
    </Button>
  );
};

export default DownloadButton;
