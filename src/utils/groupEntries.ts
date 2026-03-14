export interface EntryGroup {
  customerName: string;
  entries: any[];
  totalWeight: number;
  totalAmount: number;
  commodities: string[];
  count: number;
}

export function groupEntriesByCustomer(entries: any[], weightKey = "actual_weight"): EntryGroup[] {
  const map = new Map<string, any[]>();
  entries.forEach((e: any) => {
    const key = (e.customer_name || "").trim().toLowerCase() || "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });

  return Array.from(map.entries()).map(([, items]) => {
    const commodities = [...new Set(items.map((e: any) => e.commodity))];
    return {
      customerName: items[0].customer_name,
      entries: items,
      totalWeight: items.reduce((s: number, e: any) => s + Number(e[weightKey] || 0), 0),
      totalAmount: items.reduce((s: number, e: any) => s + Number(e.amount || 0), 0),
      commodities,
      count: items.length,
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);
}
