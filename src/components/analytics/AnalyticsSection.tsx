import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DownloadButton from "./DownloadButton";
import { ReactNode } from "react";

interface Props {
  title: string;
  icon: ReactNode;
  csvRows: string[][];
  csvFilename: string;
  children: ReactNode;
}

const AnalyticsSection = ({ title, icon, csvRows, csvFilename, children }: Props) => (
  <Card>
    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
      <div className="flex items-center gap-2">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </div>
      <DownloadButton rows={csvRows} filename={csvFilename} label={title} />
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default AnalyticsSection;
