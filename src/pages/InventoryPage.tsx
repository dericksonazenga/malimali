import { useMemo } from "react";
import { mockCommodities } from "@/data/mockData";
import { useInventory } from "@/contexts/InventoryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingUp, TrendingDown } from "lucide-react";

const InventoryPage = () => {
  const { agentEntries, vipEntries, salesEntries } = useInventory();

  const commodityStock = useMemo(() => mockCommodities.map((c) => {
    const agentIn = agentEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0);
    const vipIn = vipEntries.filter((e) => e.commodity === c.name).reduce((s, e) => s + e.actualWeight, 0);
    const totalIn = agentIn + vipIn;
    return { name: c.name, stockIn: totalIn, stockOut: 0, current: totalIn };
  }), [agentEntries, vipEntries]);

  const totalIn = commodityStock.reduce((s, c) => s + c.stockIn, 0);
  const totalOut = salesEntries.reduce((s, e) => s + e.weight, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 text-center"><TrendingUp className="w-6 h-6 mx-auto text-success mb-2" /><p className="text-sm text-muted-foreground">Total Stock In</p><p className="text-2xl font-bold font-mono">{totalIn.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><TrendingDown className="w-6 h-6 mx-auto text-destructive mb-2" /><p className="text-sm text-muted-foreground">Total Stock Out</p><p className="text-2xl font-bold font-mono">{totalOut.toLocaleString()} kg</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><Package className="w-6 h-6 mx-auto text-primary mb-2" /><p className="text-sm text-muted-foreground">Net Stock</p><p className="text-2xl font-bold font-mono text-primary">{(totalIn - totalOut).toLocaleString()} kg</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Stock by Commodity</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Commodity</TableHead><TableHead className="text-right">Stock In (kg)</TableHead><TableHead className="text-right">Current Stock (kg)</TableHead></TableRow></TableHeader>
            <TableBody>
              {commodityStock.filter((c) => c.stockIn > 0).map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right font-mono">{c.stockIn.toLocaleString()}</TableCell>
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
