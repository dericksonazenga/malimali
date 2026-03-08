import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportSheetViewProps {
  symbol: string;
  fmt: (n: number) => string;
  rangeLabel: string;
  currency: string;
  salesTotal: number;
  agentTotal: number;
  vipTotal: number;
  totalPurchases: number;
  grossProfit: number;
  expenseTotal: number;
  salaryPaid: number;
  salaryTotal: number;
  salaryBalance: number;
  netProfit: number;
  agentEntries: any[];
  vipEntries: any[];
  salesEntries: any[];
  expenses: any[];
  workers: any[];
  stockData: any[];
  commodityBreakdown: Record<string, { bought: number; sold: number; net: number }>;
  commodityProfitBreakdown: { commodity: string; avgBuyRate: number; avgSellRate: number; marginPerKg: number; totalWeightSold: number; totalProfit: number }[];
}

const ReportSheetView = ({
  symbol, fmt, rangeLabel, currency,
  salesTotal, agentTotal, vipTotal, totalPurchases, grossProfit,
  expenseTotal, salaryPaid, salaryTotal, salaryBalance, netProfit,
  agentEntries, vipEntries, salesEntries, expenses, workers, stockData,
  commodityBreakdown, commodityProfitBreakdown,
}: ReportSheetViewProps) => {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase().trim();

  const filteredAgents = useMemo(() => q ? agentEntries.filter((e: any) => `${e.customer_name} ${e.commodity} ${e.date}`.toLowerCase().includes(q)) : agentEntries, [q, agentEntries]);
  const filteredVip = useMemo(() => q ? vipEntries.filter((e: any) => `${e.customer_name} ${e.commodity} ${e.date}`.toLowerCase().includes(q)) : vipEntries, [q, vipEntries]);
  const filteredSales = useMemo(() => q ? salesEntries.filter((e: any) => `${e.customer_name || ""} ${e.commodity || ""} ${e.date}`.toLowerCase().includes(q)) : salesEntries, [q, salesEntries]);
  const filteredExpenses = useMemo(() => q ? expenses.filter((e: any) => `${e.category} ${e.notes || ""} ${e.date}`.toLowerCase().includes(q)) : expenses, [q, expenses]);
  const filteredWorkers = useMemo(() => q ? workers.filter((w: any) => `${w.name} ${w.role}`.toLowerCase().includes(q)) : workers, [q, workers]);
  const filteredStock = useMemo(() => q ? stockData.filter((s: any) => s.commodity.toLowerCase().includes(q)) : stockData, [q, stockData]);
  const filteredCommodityBreakdown = useMemo(() => q ? Object.fromEntries(Object.entries(commodityBreakdown).filter(([c]) => c.toLowerCase().includes(q))) : commodityBreakdown, [q, commodityBreakdown]);
  const filteredProfitBreakdown = useMemo(() => q ? commodityProfitBreakdown.filter(c => c.commodity.toLowerCase().includes(q)) : commodityProfitBreakdown, [q, commodityProfitBreakdown]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 gap-2">
          <Eye className="w-4 h-4" /> View Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-lg">
            Full Report — {rangeLabel} ({currency})
          </DialogTitle>
          <div className="flex items-center gap-3 pt-1">
            <p className="text-xs text-muted-foreground whitespace-nowrap">Generated: {new Date().toLocaleString()}</p>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="summary" className="flex flex-col flex-1 min-h-0">
          <div className="px-4 pt-2 border-b border-border">
            <TabsList className="h-8 gap-1">
              <TabsTrigger value="summary" className="text-xs h-7 px-2.5">Summary</TabsTrigger>
              <TabsTrigger value="agents" className="text-xs h-7 px-2.5">Agents</TabsTrigger>
              <TabsTrigger value="vip" className="text-xs h-7 px-2.5">VIP</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs h-7 px-2.5">Sales</TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs h-7 px-2.5">Expenses</TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs h-7 px-2.5">Inventory</TabsTrigger>
              <TabsTrigger value="payroll" className="text-xs h-7 px-2.5">Payroll</TabsTrigger>
              <TabsTrigger value="profit" className="text-xs h-7 px-2.5">Profit</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 max-h-[60vh]">
            {/* Summary */}
            <TabsContent value="summary" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: "Sales Revenue", value: salesTotal, color: "text-success" },
                    { label: "Agent Purchases", value: agentTotal, color: "text-info" },
                    { label: "VIP Purchases", value: vipTotal, color: "text-info" },
                    { label: "Total Purchases", value: totalPurchases, color: "text-muted-foreground" },
                    { label: "Gross Profit", value: grossProfit, color: grossProfit >= 0 ? "text-success" : "text-destructive" },
                    { label: "Total Expenses", value: expenseTotal, color: "text-destructive" },
                    { label: "Salary Paid", value: salaryPaid, color: "text-destructive" },
                    { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? "text-success" : "text-destructive" },
                  ].map(row => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className={`text-right font-mono ${row.color}`}>{symbol}{fmt(row.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Agent Entries */}
            <TabsContent value="agents" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                  )}
                  {filteredAgents.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.customer_name}</TableCell>
                      <TableCell>{e.commodity}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(e.actual_weight))}</TableCell>
                      <TableCell className="text-right font-mono">{symbol}{fmt(Number(e.rate))}</TableCell>
                      <TableCell className="text-right font-mono text-info">{symbol}{fmt(Number(e.amount))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAgents.length > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-border text-sm font-bold">
                  <span>Total: <span className="font-mono">{symbol}{fmt(agentTotal)}</span></span>
                </div>
              )}
            </TabsContent>

            {/* VIP Entries */}
            <TabsContent value="vip" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVip.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                  )}
                  {filteredVip.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.customer_name}</TableCell>
                      <TableCell>{e.commodity}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(e.actual_weight))}</TableCell>
                      <TableCell className="text-right font-mono">{symbol}{fmt(Number(e.rate))}</TableCell>
                      <TableCell className="text-right font-mono text-primary">{symbol}{fmt(Number(e.amount))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredVip.length > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-border text-sm font-bold">
                  <span>Total: <span className="font-mono">{symbol}{fmt(vipTotal)}</span></span>
                </div>
              )}
            </TabsContent>

            {/* Sales Entries */}
            <TabsContent value="sales" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No entries</TableCell></TableRow>
                  )}
                  {filteredSales.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.customer_name || "—"}</TableCell>
                      <TableCell>{e.commodity || "Exchange"}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(e.weight))}</TableCell>
                      <TableCell className="text-right font-mono">{e.rate ? `${symbol}${fmt(Number(e.rate))}` : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-success">{e.amount ? `${symbol}${fmt(Number(e.amount))}` : "—"}</TableCell>
                      <TableCell>{e.is_exchange ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredSales.length > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-border text-sm font-bold">
                  <span>Total: <span className="font-mono text-success">{symbol}{fmt(salesTotal)}</span></span>
                </div>
              )}
            </TabsContent>

            {/* Expenses */}
            <TabsContent value="expenses" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No expenses</TableCell></TableRow>
                  )}
                  {filteredExpenses.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.category}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">-{symbol}{fmt(Number(e.amount))}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{e.notes || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredExpenses.length > 0 && (
                <div className="flex justify-end mt-2 pt-2 border-t border-border text-sm font-bold">
                  <span>Total: <span className="font-mono text-destructive">-{symbol}{fmt(expenseTotal)}</span></span>
                </div>
              )}
            </TabsContent>

            {/* Inventory */}
            <TabsContent value="inventory" className="p-4 m-0">
              <h3 className="text-sm font-semibold mb-2">Commodity Flow</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Bought (kg)</TableHead>
                    <TableHead className="text-right">Sold (kg)</TableHead>
                    <TableHead className="text-right">Net (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(filteredCommodityBreakdown).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  )}
                  {Object.entries(filteredCommodityBreakdown).map(([c, v]) => (
                    <TableRow key={c}>
                      <TableCell className="font-medium">{c}</TableCell>
                      <TableCell className="text-right font-mono text-info">{fmt(v.bought)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{fmt(v.sold)}</TableCell>
                      <TableCell className={`text-right font-mono ${v.net >= 0 ? "text-success" : "text-destructive"}`}>{fmt(v.net)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <h3 className="text-sm font-semibold mt-4 mb-2">Current Stock</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No stock</TableCell></TableRow>
                  )}
                  {filteredStock.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.commodity}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{fmt(Number(s.weight))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Payroll */}
            <TabsContent value="payroll" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No workers</TableCell></TableRow>
                  )}
                  {filteredWorkers.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="text-muted-foreground">{w.role}</TableCell>
                      <TableCell className="text-right font-mono">{symbol}{fmt(Number(w.salary))}</TableCell>
                      <TableCell className="text-right font-mono text-success">{symbol}{fmt(Number(w.paid))}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{symbol}{fmt(Number(w.balance))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredWorkers.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-2 pt-2 border-t border-border text-sm font-bold text-right">
                  <span className="font-mono">{symbol}{fmt(salaryTotal)}</span>
                  <span className="font-mono text-success">{symbol}{fmt(salaryPaid)}</span>
                  <span className="font-mono text-destructive">{symbol}{fmt(salaryBalance)}</span>
                </div>
              )}
            </TabsContent>

            {/* Commodity Profit */}
            <TabsContent value="profit" className="p-4 m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Buy/kg</TableHead>
                    <TableHead className="text-right">Sell/kg</TableHead>
                    <TableHead className="text-right">Margin/kg</TableHead>
                    <TableHead className="text-right">Sold (kg)</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commodityProfitBreakdown.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  )}
                  {commodityProfitBreakdown.map((c) => (
                    <TableRow key={c.commodity}>
                      <TableCell className="font-medium">{c.commodity}</TableCell>
                      <TableCell className="text-right font-mono text-info">{symbol}{fmt(c.avgBuyRate)}</TableCell>
                      <TableCell className="text-right font-mono text-success">{symbol}{fmt(c.avgSellRate)}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${c.marginPerKg >= 0 ? "text-success" : "text-destructive"}`}>{symbol}{fmt(c.marginPerKg)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(c.totalWeightSold)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${c.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>{symbol}{fmt(c.totalProfit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReportSheetView;
