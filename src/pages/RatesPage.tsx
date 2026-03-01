import { useState } from "react";
import { mockCommodities } from "@/data/mockData";
import { Commodity } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

const RatesPage = () => {
  const [commodities, setCommodities] = useState<Commodity[]>(mockCommodities);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ agentRate: 0, vipRate: 0, salesRate: 0 });

  const startEdit = (c: Commodity) => {
    setEditing(c.id);
    setEditValues({ agentRate: c.agentRate, vipRate: c.vipRate, salesRate: c.salesRate });
  };

  const saveEdit = (id: string) => {
    setCommodities((prev) =>
      prev.map((c) => c.id === id ? { ...c, ...editValues } : c)
    );
    setEditing(null);
    toast.success("Rates updated!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Rate Management</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Agent Rate (₹/kg)</TableHead>
                <TableHead className="text-right">VIP Rate (₹/kg)</TableHead>
                <TableHead className="text-right">Sales Rate (₹/kg)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodities.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  {editing === c.id ? (
                    <>
                      <TableCell className="text-right"><Input type="number" value={editValues.agentRate} onChange={(e) => setEditValues((v) => ({ ...v, agentRate: +e.target.value }))} className="w-24 ml-auto text-right" /></TableCell>
                      <TableCell className="text-right"><Input type="number" value={editValues.vipRate} onChange={(e) => setEditValues((v) => ({ ...v, vipRate: +e.target.value }))} className="w-24 ml-auto text-right" /></TableCell>
                      <TableCell className="text-right"><Input type="number" value={editValues.salesRate} onChange={(e) => setEditValues((v) => ({ ...v, salesRate: +e.target.value }))} className="w-24 ml-auto text-right" /></TableCell>
                      <TableCell><Button size="sm" onClick={() => saveEdit(c.id)} className="gap-1"><Save className="w-3 h-3" /> Save</Button></TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right font-mono">₹{c.agentRate}</TableCell>
                      <TableCell className="text-right font-mono">₹{c.vipRate}</TableCell>
                      <TableCell className="text-right font-mono">₹{c.salesRate}</TableCell>
                      <TableCell><Button variant="outline" size="sm" onClick={() => startEdit(c)}>Edit</Button></TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RatesPage;
