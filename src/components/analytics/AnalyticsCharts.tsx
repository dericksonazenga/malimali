import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
  Area, AreaChart, ReferenceLine,
} from "recharts";
import { DailyProfit } from "@/hooks/useAnalyticsData";
import { format, parseISO } from "date-fns";

const COLORS = [
  "hsl(142, 71%, 45%)", "hsl(217, 91%, 60%)", "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)", "hsl(280, 67%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(24, 95%, 53%)", "hsl(330, 65%, 50%)",
];

interface Props {
  symbol: string;
  salesTotal: number;
  agentTotal: number;
  vipTotal: number;
  expenseTotal: number;
  salaryPaid: number;
  grossProfit: number;
  netProfit: number;
  commodityBreakdown: Record<string, { bought: number; sold: number; net: number }>;
  stockData: any[];
  expenses: any[];
  dailyProfitTrend: DailyProfit[];
}

const AnalyticsCharts = ({
  symbol, salesTotal, agentTotal, vipTotal, expenseTotal, salaryPaid,
  grossProfit, netProfit, commodityBreakdown, stockData, expenses, dailyProfitTrend,
}: Props) => {
  // Revenue bar chart data
  const revenueBarData = [
    { name: "Sales", value: salesTotal, fill: COLORS[0] },
    { name: "Agent", value: agentTotal, fill: COLORS[1] },
    { name: "VIP", value: vipTotal, fill: COLORS[2] },
    { name: "Expenses", value: expenseTotal, fill: COLORS[3] },
    { name: "Salary", value: salaryPaid, fill: COLORS[4] },
  ];

  // Profit waterfall
  const profitData = [
    { name: "Gross", value: grossProfit, fill: grossProfit >= 0 ? COLORS[0] : COLORS[2] },
    { name: "Net", value: netProfit, fill: netProfit >= 0 ? COLORS[0] : COLORS[2] },
  ];

  // Expense breakdown pie — merge similar names (case-insensitive, trimmed)
  const expenseByCat: Record<string, { display: string; total: number }> = {};
  expenses.forEach((e: any) => {
    const key = (e.category || "Other").trim().toLowerCase();
    if (!expenseByCat[key]) expenseByCat[key] = { display: e.category?.trim() || "Other", total: 0 };
    expenseByCat[key].total += Number(e.amount);
  });
  const expensePieData = Object.values(expenseByCat).map(v => ({ name: v.display, value: v.total }));

  // Commodity flow bar
  const commodityBarData = Object.entries(commodityBreakdown).map(([name, v]) => ({
    name, bought: v.bought, sold: v.sold,
  }));

  // Stock pie
  const stockPieData = stockData
    .filter((s: any) => Number(s.weight) > 0)
    .map((s: any) => ({ name: s.commodity, value: Number(s.weight) }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-md">
        <p className="font-medium">{label || payload[0]?.name}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }}>
            {p.name}: {symbol}{Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const WeightTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-md">
        <p className="font-medium">{payload[0]?.payload?.name}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }}>
            {p.name}: {Number(p.value).toLocaleString()}kg
          </p>
        ))}
      </div>
    );
  };

  const trendData = dailyProfitTrend.map(d => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
  }));

  const ProfitTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-md">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.stroke || p.color }}>
            {p.name}: {symbol}{Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Daily Profit Trend - Full Width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No data for this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 80%)" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${symbol}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ProfitTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(0, 0%, 50%)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="sales" name="Sales" stroke={COLORS[1]} fill="url(#salesGrad)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke={COLORS[2]} fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke={COLORS[0]} fill="url(#profitGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Revenue Overview Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue vs Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueBarData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${symbol}${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {revenueBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Expense Breakdown Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {expensePieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No expenses</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Commodity Flow Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Commodity Flow (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          {commodityBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={commodityBarData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<WeightTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="bought" name="In" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="sold" name="Out" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Stock Distribution Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stock Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {stockPieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No stock</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={25}
                  paddingAngle={3}
                  label={({ cx: pcx, cy: pcy, midAngle, outerRadius: oR, name, percent, index }) => {
                    const RADIAN = Math.PI / 180;
                    const total = stockPieData.length;
                    // Stagger radius so adjacent labels don't overlap
                    const baseRadius = (oR as number) + 28;
                    const stagger = index % 2 === 0 ? 0 : 18;
                    const radius = baseRadius + stagger;
                    // Compute anchor point on outer edge
                    const ax = (pcx as number) + ((oR as number) + 8) * Math.cos(-midAngle * RADIAN);
                    const ay = (pcy as number) + ((oR as number) + 8) * Math.sin(-midAngle * RADIAN);
                    // Compute elbow (bend) point
                    const ex = (pcx as number) + radius * Math.cos(-midAngle * RADIAN);
                    const ey = (pcy as number) + radius * Math.sin(-midAngle * RADIAN);
                    // Horizontal tail direction
                    const isLeft = midAngle > 90 && midAngle < 270;
                    const tailLen = 20;
                    const tx = isLeft ? ex - tailLen : ex + tailLen;
                    return (
                      <g>
                        {/* Connector line: slice edge → elbow → horizontal tail */}
                        <polyline
                          points={`${ax},${ay} ${ex},${ey} ${tx},${ey}`}
                          fill="none"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={1}
                        />
                        {/* Small dot at slice edge */}
                        <circle cx={ax} cy={ay} r={2} fill="hsl(var(--muted-foreground))" />
                        {/* Label text at tail end */}
                        <text
                          x={tx + (isLeft ? -4 : 4)}
                          y={ey}
                          textAnchor={isLeft ? "end" : "start"}
                          dominantBaseline="central"
                          fontSize={10}
                          fill="hsl(var(--foreground))"
                        >
                          {name} {(percent * 100).toFixed(0)}%
                        </text>
                      </g>
                    );
                  }}
                  labelLine={false}
                >
                  {stockPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString()}kg`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
