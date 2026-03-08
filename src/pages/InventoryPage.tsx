import { useMemo, useState } from "react";
import { useCommodities } from "@/contexts/CommodityContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, TrendingDown, Wrench } from "lucide-react";
import StockAdjustmentDialog from "@/components/StockAdjustmentDialog";

const InventoryPage = () => {
  const { commodities } = useCommodities();
  const { agentEntries, vipEntries, salesEntries, persistentStock } = useInventory();
  const [adjustOpen, setAdjustOpen] = useState(false);

  const commodityStock = useMemo(() => commodities.map((c) => {
    const dailyIn = agentEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0)
      + vipEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0);
    const dailyOut = salesEntries.filter((e) => e.commodity === c.name && !e.isExchange).reduce((s, e) => s + e.weight, 0);
    const persistent = persistentStock[c.name] || 0;
    const current = persistent + dailyIn - dailyOut;
    return { name: c.name, persistent, stockIn: dailyIn, stockOut: dailyOut, current: Math.max(0, current) };
  }), [commodities, agentEntries, vipEntries, salesEntries, persistentStock]);

  const totalDailyIn = commodityStock.reduce((s, c) => s + c.stockIn, 0);
  const totalDailyOut = commodityStock.reduce((s, c) => s + c.stockOut, 0);
  const totalCurrent = commodityStock.reduce((s, c) => s + c.current, 0);
  const hasData = commodityStock.some((c) => c.persistent > 0 || c.stockIn > 0 || c.stockOut > 0 || c.current > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center"><TrendingUp className="w-6 h-6 mx-auto text-success mb-2" /><p className="text-sm text-muted-foreground">Today's Stock In</p><p className="text-2xl font-bold font-mono">{totalDailyIn.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><TrendingDown className="w-6 h-6 mx-auto text-destructive mb-2" /><p className="text-sm text-muted-foreground">Today's Stock Out</p><p className="text-2xl font-bold font-mono">{totalDailyOut.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><Package className="w-6 h-6 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">Current Stock</p><p className="text-2xl font-bold font-mono text-primary">{totalCurrent.toLocaleString()} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Stock by Commodity</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAdjustOpen(true)}>
              <Wrench className="w-4 h-4" /> Adjust Stock
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Carried Over</TableHead>
                <TableHead className="text-right">Today In</TableHead>
                <TableHead className="text-right">Today Out</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodityStock.filter((c) => c.persistent > 0 || c.stockIn > 0 || c.stockOut > 0 || c.current > 0).map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{c.persistent.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-success">+{c.stockIn.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">-{c.stockOut.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">{c.current.toLocaleString()} kg</TableCell>
                </TableRow>
              ))}
              {!hasData && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No stock data yet. Add entries to see commodity breakdown.</TableCell>
                </TableRow>
              )}
              {hasData && (
                <TableRow className="border-t-2 border-primary/20 bg-accent/50">
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-muted-foreground">{commodityStock.reduce((s, c) => s + c.persistent, 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-success">+{totalDailyIn.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-destructive">-{totalDailyOut.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary">{totalCurrent.toLocaleString()} kg</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StockAdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        commodities={commodities}
        persistentStock={persistentStock}
      />
    </div>
  );
};

export default InventoryPage;
