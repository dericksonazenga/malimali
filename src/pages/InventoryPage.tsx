import { useMemo } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingUp, TrendingDown } from "lucide-react";

const InventoryPage = () => {
  const { commodities } = useCommodities();
  const { agentEntries, vipEntries, salesEntries, persistentStock } = useInventory();

  const commodityStock = useMemo(() => commodities.map((c) => {
    // Daily stock in (today's agent + vip entries)
    const dailyIn = agentEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0)
      + vipEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0);
    // Daily stock out (today's sales)
    const dailyOut = salesEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.weight, 0);
    // Persistent = all previous days accumulated
    const persistent = persistentStock[c.name] || 0;
    // Current = persistent + today's in - today's out
    const current = persistent + dailyIn - dailyOut;
    return { name: c.name, stockIn: dailyIn, stockOut: dailyOut, current: Math.max(0, current) };
  }), [commodities, agentEntries, vipEntries, salesEntries, persistentStock]);

  const totalDailyIn = commodityStock.reduce((s, c) => s + c.stockIn, 0);
  const totalDailyOut = commodityStock.reduce((s, c) => s + c.stockOut, 0);
  const totalCurrent = commodityStock.reduce((s, c) => s + c.current, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center"><TrendingUp className="w-6 h-6 mx-auto text-success mb-2" /><p className="text-sm text-muted-foreground">Today's Stock In</p><p className="text-2xl font-bold font-mono">{totalDailyIn.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><TrendingDown className="w-6 h-6 mx-auto text-destructive mb-2" /><p className="text-sm text-muted-foreground">Today's Stock Out</p><p className="text-2xl font-bold font-mono">{totalDailyOut.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><Package className="w-6 h-6 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">Current Stock</p><p className="text-2xl font-bold font-mono text-primary">{totalCurrent.toLocaleString()} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Stock by Commodity</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Commodity</TableHead><TableHead className="text-right">Today In (kg)</TableHead><TableHead className="text-right">Today Out (kg)</TableHead><TableHead className="text-right">Current Stock (kg)</TableHead></TableRow></TableHeader>
            <TableBody>
              {commodityStock.filter((c) => c.stockIn > 0 || c.stockOut > 0 || c.current > 0).map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right font-mono text-success">{c.stockIn.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{c.stockOut.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">{c.current.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;
