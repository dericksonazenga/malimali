import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Star, ShoppingCart } from "lucide-react";
import AgentEntryPage from "./AgentEntryPage";
import VipEntryPage from "./VipEntryPage";
import SalesEntryPage from "./SalesEntryPage";

const DataEntryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "agent";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="agent" className="gap-2 text-sm font-semibold">
            <FileText className="w-4 h-4" /> Agent
          </TabsTrigger>
          <TabsTrigger value="vip" className="gap-2 text-sm font-semibold">
            <Star className="w-4 h-4" /> VIP
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2 text-sm font-semibold">
            <ShoppingCart className="w-4 h-4" /> Sales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="agent"><AgentEntryPage /></TabsContent>
        <TabsContent value="vip"><VipEntryPage /></TabsContent>
        <TabsContent value="sales"><SalesEntryPage /></TabsContent>
      </Tabs>
    </div>
  );
};

export default DataEntryPage;
