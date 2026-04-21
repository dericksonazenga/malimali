import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
  ReferenceLine,
} from "recharts";
import { DailyProfit } from "@/hooks/useAnalyticsData";
import { format, parseISO } from "date-fns";
import { useCategoryLabels } from "@/contexts/CategoryLabelsContext";

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
  agentEntries?: any[];
  vipEntries?: any[];
  salesEntries?: any[];
}

const AnalyticsCharts = ({
  symbol, salesTotal, agentTotal, vipTotal, expenseTotal, salaryPaid,
  grossProfit, netProfit, commodityBreakdown, stockData, expenses, dailyProfitTrend,
  agentEntries = [], vipEntries = [], salesEntries = [],
}: Props) => {
  const { labels } = useCategoryLabels();
  // Revenue bar chart data
  const revenueBarData = [
    { name: labels.sales, value: salesTotal, fill: COLORS[0] },
    { name: labels.agent, value: agentTotal, fill: COLORS[1] },
    { name: labels.vip, value: vipTotal, fill: COLORS[2] },
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

  // Commodity flow bar — sort most to least by total activity
  const commodityBarData = Object.entries(commodityBreakdown)
    .map(([name, v]) => ({ name, bought: v.bought, sold: v.sold }))
    .sort((a, b) => (b.bought + b.sold) - (a.bought + a.sold));

  // Stock pie — merge persistent stock + today's pending deltas (matches Inventory page)
  const stockAgg: Record<string, { display: string; value: number }> = {};
  const ensureStock = (raw: string) => {
    const key = (raw || "").trim().toLowerCase();
    if (!key) return null;
    if (!stockAgg[key]) stockAgg[key] = { display: raw.trim(), value: 0 };
    return key;
  };
  stockData.forEach((s: any) => {
    const k = ensureStock(s.commodity);
    if (k) stockAgg[k].value += Number(s.weight);
  });
  const today = new Date().toISOString().split("T")[0];
  agentEntries.forEach((e: any) => {
    if ((e.date || e.created_at?.split("T")[0]) === today) {
      const k = ensureStock(e.commodity);
      if (k) stockAgg[k].value += Number(e.actual_weight || 0);
    }
  });
  vipEntries.forEach((e: any) => {
    if ((e.date || e.created_at?.split("T")[0]) === today) {
      const k = ensureStock(e.commodity);
      if (k) stockAgg[k].value += Number(e.actual_weight || 0);
    }
  });
  salesEntries.forEach((e: any) => {
    if (!e.is_exchange && (e.date || e.created_at?.split("T")[0]) === today) {
      const k = ensureStock(e.commodity);
      if (k) stockAgg[k].value -= Number(e.weight || 0);
    }
  });
  const stockPieData = Object.values(stockAgg)
    .filter(s => s.value > 0)
    .map(s => ({ name: s.display, value: s.value }))
    .sort((a, b) => b.value - a.value);

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

  const WeightTooltip = (props: any) => {
    const { active, payload } = props;
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
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 80%)" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${symbol}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ProfitTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(0, 0%, 50%)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="purchases" name="Purchases" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(142, 71%, 45%)" strokeWidth={2.5} dot={false} />
              </LineChart>
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
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={commodityBarData} barSize={20} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 500 }}
                  interval={0}
                  angle={-90}
                  textAnchor="end"
                  height={70}
                />
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
            <ResponsiveContainer width="100%" height={Math.max(360, 280 + stockPieData.length * 18)}>
              <PieChart margin={{ top: 50, right: 140, bottom: 50, left: 140 }}>
                <Pie
                  data={stockPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={0}
                  paddingAngle={1}
                  minAngle={4}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                  labelLine={false}
                  label={(props: any) => {
                    const RAD = Math.PI / 180;
                    const { cx, cy, midAngle, outerRadius, name, value, percent, index } = props;
                    // Vary leader length so labels don't overlap — stagger by index
                    const total = stockPieData.length;
                    // Smaller slices (later in sorted order) get progressively longer leaders
                    const baseExt = 18;
                    const stagger = (index % 3) * 14; // 0, 14, 28 px stagger
                    const sizeBoost = Math.min(40, (total - index) > total / 2 ? 0 : (index - total / 2) * 6);
                    const ext = baseExt + stagger + sizeBoost;

                    const sin = Math.sin(-midAngle * RAD);
                    const cos = Math.cos(-midAngle * RAD);
                    const sx = cx + outerRadius * cos;
                    const sy = cy + outerRadius * sin;
                    const mx = cx + (outerRadius + ext) * cos;
                    const my = cy + (outerRadius + ext) * sin;
                    const ex = mx + (cos >= 0 ? 1 : -1) * 18;
                    const ey = my;
                    const textAnchor = cos >= 0 ? "start" : "end";
                    const pct = (percent * 100).toFixed(0);

                    return (
                      <g>
                        <path
                          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={1}
                          fill="none"
                        />
                        <circle cx={ex} cy={ey} r={2} fill="hsl(var(--muted-foreground))" />
                        <text
                          x={ex + (cos >= 0 ? 4 : -4)}
                          y={ey}
                          textAnchor={textAnchor}
                          dominantBaseline="central"
                          fontSize={10}
                          fill="hsl(var(--foreground))"
                        >
                          {`${name} · ${Number(value).toLocaleString()}kg (${pct}%)`}
                        </text>
                      </g>
                    );
                  }}
                >
                  {stockPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<WeightTooltip />} />
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
