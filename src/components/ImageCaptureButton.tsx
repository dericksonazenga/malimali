import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface ImageCaptureButtonProps {
  label: string;
  onCapture: (file: File) => void;
}

const ImageCaptureButton = ({ label, onCapture }: ImageCaptureButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      toast.success(`${label} captured!`);
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <Button type="button" variant="outline" className="h-12 gap-2" onClick={handleClick}>
        <Camera className="w-4 h-4" /> {label}
      </Button>
    </>
  );
};

export default ImageCaptureButton;
